from unittest.mock import Mock, patch

from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.services import kakao
from apps.users.services.kakao import KakaoVerificationError, verify_kakao_adult

KAKAO_VERIFY_URL = "/api/v1/auth/kakao/verify/"


def _token_response(status_code=200, access_token="test-access-token"):
    response = Mock()
    response.status_code = status_code
    response.json.return_value = {"access_token": access_token}
    response.text = ""
    return response


def _user_response(status_code=200, kakao_id=12345, age_range="30~39", needs_agreement=False):
    response = Mock()
    response.status_code = status_code
    response.json.return_value = {
        "id": kakao_id,
        "kakao_account": {
            "age_range_needs_agreement": needs_agreement,
            "age_range": age_range,
        },
    }
    response.text = ""
    return response


@pytest.fixture(autouse=True)
def _kakao_configured(settings):
    """이 파일의 기본 전제: 카카오 앱이 설정돼 있음(client_secret은 안 켠
    상태). client_id 미설정/client_secret 있음 케이스는 각 테스트에서
    settings 픽스처로 다시 덮어쓴다."""
    settings.KAKAO_CLIENT_ID = "test-client-id"
    settings.KAKAO_CLIENT_SECRET = ""


@pytest.mark.django_db
class TestVerifyKakaoAdult:
    def test_adult_age_range_is_verified(self):
        with (
            patch.object(kakao.requests, "post", return_value=_token_response()),
            patch.object(kakao.requests, "get", return_value=_user_response(age_range="30~39")),
        ):
            result = verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")

        assert result == {"kakao_id": "12345", "is_adult": True}

    def test_minor_age_range_is_not_adult(self):
        """15~19는 19세를 포함하지만 15~18세도 섞여 있어서 안전하게 거부."""
        with (
            patch.object(kakao.requests, "post", return_value=_token_response()),
            patch.object(kakao.requests, "get", return_value=_user_response(age_range="15~19")),
        ):
            result = verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")

        assert result["is_adult"] is False

    def test_consent_declined_raises(self):
        with (
            patch.object(kakao.requests, "post", return_value=_token_response()),
            patch.object(kakao.requests, "get", return_value=_user_response(needs_agreement=True)),
        ):
            with pytest.raises(KakaoVerificationError):
                verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")

    def test_token_exchange_failure_raises(self):
        with patch.object(kakao.requests, "post", return_value=_token_response(status_code=400)):
            with pytest.raises(KakaoVerificationError):
                verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")

    def test_user_info_fetch_failure_raises(self):
        with (
            patch.object(kakao.requests, "post", return_value=_token_response()),
            patch.object(kakao.requests, "get", return_value=_user_response(status_code=401)),
        ):
            with pytest.raises(KakaoVerificationError):
                verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")

    def test_client_secret_included_when_configured(self, settings):
        settings.KAKAO_CLIENT_SECRET = "test-secret"
        with (
            patch.object(kakao.requests, "post", return_value=_token_response()) as mock_post,
            patch.object(kakao.requests, "get", return_value=_user_response()),
        ):
            verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")

        assert mock_post.call_args.kwargs["data"]["client_secret"] == "test-secret"

    def test_client_secret_omitted_when_not_configured(self):
        with (
            patch.object(kakao.requests, "post", return_value=_token_response()) as mock_post,
            patch.object(kakao.requests, "get", return_value=_user_response()),
        ):
            verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")

        assert "client_secret" not in mock_post.call_args.kwargs["data"]


@pytest.mark.django_db
class TestVerifyKakaoAdultNotConfigured:
    def test_missing_client_id_raises(self, settings):
        settings.KAKAO_CLIENT_ID = ""
        with pytest.raises(KakaoVerificationError):
            verify_kakao_adult("auth-code", "http://localhost:3000/auth/kakao/callback")


@pytest.mark.django_db
class TestKakaoAgeVerificationView:
    def test_status_reflects_unverified_session(self):
        client = APIClient()
        response = client.get(KAKAO_VERIFY_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"verified": False}

    def test_status_reflects_verified_session(self):
        client = APIClient()
        session = client.session
        session["kakao_age_verified"] = True
        session.save()

        response = client.get(KAKAO_VERIFY_URL)

        assert response.data == {"verified": True}

    def test_verify_success_sets_session(self):
        client = APIClient()
        with patch(
            "apps.users.views.auth.verify_kakao_adult",
            return_value={"kakao_id": "999", "is_adult": True},
        ):
            response = client.post(
                KAKAO_VERIFY_URL,
                {"code": "auth-code", "redirect_uri": "http://localhost:3000/auth/kakao/callback"},
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"verified": True}
        assert client.session.get("kakao_age_verified") is True
        assert client.session.get("kakao_verified_id") == "999"

    def test_verify_rejects_minor_without_setting_session(self):
        client = APIClient()
        with patch(
            "apps.users.views.auth.verify_kakao_adult",
            return_value={"kakao_id": "999", "is_adult": False},
        ):
            response = client.post(
                KAKAO_VERIFY_URL,
                {"code": "auth-code", "redirect_uri": "http://localhost:3000/auth/kakao/callback"},
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert client.session.get("kakao_age_verified") is None

    def test_verify_propagates_service_error_as_400(self):
        client = APIClient()
        with patch(
            "apps.users.views.auth.verify_kakao_adult",
            side_effect=KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요."),
        ):
            response = client.post(
                KAKAO_VERIFY_URL,
                {"code": "auth-code", "redirect_uri": "http://localhost:3000/auth/kakao/callback"},
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["detail"] == "카카오 인증에 실패했습니다. 다시 시도해주세요."
        assert client.session.get("kakao_age_verified") is None

    def test_verify_requires_code_and_redirect_uri(self):
        client = APIClient()
        response = client.post(KAKAO_VERIFY_URL, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
