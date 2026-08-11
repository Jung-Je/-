import io

from django.core.files.base import ContentFile

from PIL import Image, ImageOps

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB (최적화 전, 업로드 자체를 막는 상한선)
MAX_DIMENSION = 1024  # 리사이즈 후 가로/세로 중 큰 쪽의 최대 픽셀
JPEG_QUALITY = 85


def optimize_profile_image(uploaded_file):
    """업로드된 프로필 이미지를 리사이즈하고 JPEG로 재인코딩해 최적화한다.

    - EXIF 방향 정보를 반영해 회전시킨 뒤 EXIF 자체는 제거 (용량 절감 + 개인정보 보호)
    - 가로/세로 중 큰 쪽을 MAX_DIMENSION 이하로 축소 (원본이 더 작으면 그대로 유지, 확대하지 않음)
    - 투명 배경(RGBA/팔레트)은 흰 배경에 합성한 뒤 JPEG로 저장 (프로필 사진에 투명도가 필요 없음)

    입력 형식 검증은 이 함수를 호출하는 쪽(DRF ImageField/Django forms.ImageField)이
    이미 Pillow로 수행하므로 여기서는 반복하지 않는다.
    """
    uploaded_file.seek(0)
    image = Image.open(uploaded_file)
    image = ImageOps.exif_transpose(image)

    if image.mode in ("RGBA", "LA", "P"):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        image = background
    else:
        image = image.convert("RGB")

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    buffer.seek(0)

    return ContentFile(buffer.read(), name="profile.jpg")
