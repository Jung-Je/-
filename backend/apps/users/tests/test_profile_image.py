import io

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

import pytest
from PIL import Image

from apps.users.services.image_processing import (
    JPEG_QUALITY,
    MAX_DIMENSION,
    MAX_UPLOAD_SIZE,
    optimize_profile_image,
)
from apps.users.tests.factories import UserFactory

PROFILE_URL_TEMPLATE = "/api/v1/users/users/{}/"


def _make_image_file(size=(200, 200), color="red", fmt="PNG", exif=None):
    image = Image.new("RGB", size, color)
    buffer = io.BytesIO()
    kwargs = {"exif": exif} if exif else {}
    image.save(buffer, format=fmt, **kwargs)
    buffer.seek(0)
    return buffer


class TestOptimizeProfileImage:
    def test_downscales_oversized_image_without_upscaling(self):
        large = _make_image_file(size=(MAX_DIMENSION * 2, MAX_DIMENSION))
        result = optimize_profile_image(large)

        output = Image.open(result)
        assert max(output.size) == MAX_DIMENSION

    def test_does_not_upscale_small_image(self):
        small = _make_image_file(size=(50, 40))
        result = optimize_profile_image(small)

        output = Image.open(result)
        assert output.size == (50, 40)

    def test_always_outputs_jpeg(self):
        png = _make_image_file(fmt="PNG")
        result = optimize_profile_image(png)

        output = Image.open(result)
        assert output.format == "JPEG"

    def test_transparent_png_gets_white_background(self):
        image = Image.new("RGBA", (10, 10), (255, 0, 0, 0))  # fully transparent red
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)

        result = optimize_profile_image(buffer)

        output = Image.open(result).convert("RGB")
        assert output.getpixel((5, 5)) == (255, 255, 255)

    def test_exif_orientation_is_applied_then_stripped(self):
        image = Image.new("RGB", (100, 50), "red")
        exif = image.getexif()
        exif[0x0112] = 6  # requires a 90-degree correction
        raw = _make_image_file(size=(100, 50), fmt="JPEG", exif=exif)

        result = optimize_profile_image(raw)

        output = Image.open(result)
        assert output.size == (50, 100)  # width/height swapped by the correction
        assert 0x0112 not in output.getexif()

    def test_output_is_reasonably_compressed(self):
        # A solid-color image compresses extremely well; this is mostly a
        # smoke check that JPEG_QUALITY/optimize=True are actually applied
        # rather than saving uncompressed.
        image = _make_image_file(size=(MAX_DIMENSION, MAX_DIMENSION))
        result = optimize_profile_image(image)
        assert JPEG_QUALITY == 85
        assert result.size < 100 * 1024  # under 100KB for a solid-color image


@pytest.mark.django_db
class TestUserModelOptimizesOnSave:
    def test_new_profile_image_is_optimized_on_save(self):
        """Admin이든 API든, User.save()를 타는 어떤 경로로 이미지가 들어와도
        모델 레벨에서 항상 최적화되는지 확인 (시리얼라이저를 거치지 않고 직접 검증)."""
        user = UserFactory()
        large = SimpleUploadedFile(
            "photo.png",
            _make_image_file(size=(MAX_DIMENSION * 2, MAX_DIMENSION * 2)).read(),
            content_type="image/png",
        )

        user.profile_image = large
        user.save()

        user.refresh_from_db()
        with user.profile_image.open("rb") as f:
            output = Image.open(f)
            assert output.format == "JPEG"
            assert max(output.size) == MAX_DIMENSION

    def test_unrelated_field_save_does_not_reprocess_image(self):
        user = UserFactory()
        user.profile_image = SimpleUploadedFile(
            "photo.png", _make_image_file().read(), content_type="image/png"
        )
        user.save()
        stored_name = user.profile_image.name

        user.bio = "업데이트된 소개"
        user.save()

        assert user.profile_image.name == stored_name


@pytest.mark.django_db
class TestProfileImageUploadApi:
    def test_oversized_file_is_rejected(self, auth_client):
        client, user = auth_client
        oversized = SimpleUploadedFile(
            "big.jpg", b"\x00" * (MAX_UPLOAD_SIZE + 1), content_type="image/jpeg"
        )

        response = client.patch(
            PROFILE_URL_TEMPLATE.format(user.id),
            {"profile_image": oversized},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_valid_upload_is_stored_and_optimized(self, auth_client):
        client, user = auth_client
        upload = SimpleUploadedFile(
            "photo.png",
            _make_image_file(size=(MAX_DIMENSION * 2, MAX_DIMENSION)).read(),
            content_type="image/png",
        )

        response = client.patch(
            PROFILE_URL_TEMPLATE.format(user.id),
            {"profile_image": upload},
            format="multipart",
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        with user.profile_image.open("rb") as f:
            output = Image.open(f)
            assert output.format == "JPEG"
            assert max(output.size) == MAX_DIMENSION
