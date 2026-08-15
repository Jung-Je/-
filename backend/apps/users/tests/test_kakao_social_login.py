from datetime import date
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.models import User
from apps.users.services import KakaoVerificationError
from apps.users.tests.factories import UserFactory

KAKAO_LOGIN_URL = "/api/v1/auth/kakao/login/"
KAKAO_SIGNUP_COMPLETE_URL = "/api/v1/auth/kakao/complete-signup/"
ME_URL = "/api/v1/users/users/me/"

ADULT_BIRTH_DATE = date.today().replace(year=date.today().year - 25).isoformat()
MINOR_BIRTH_DATE = date.today().replace(year=date.today().year - 10).isoformat()


def _profile(kakao_id="12345", email="kakao@example.com"):
    return {"kakao_id": kakao_id, "email": email}


def _login_payload():
    return {"code": "auth-code", "redirect_uri": "http://localhost:3000/auth/kakao/login"}


@pytest.mark.django_db
class TestKakaoLoginView:
    def test_logs_in_existing_linked_user(self):
        user = UserFactory(kakao_id="12345")
        client = APIClient()

        with patch("apps.users.views.auth.fetch_kakao_profile", return_value=_profile()):
            response = client.post(KAKAO_LOGIN_URL, _login_payload(), format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "logged_in"
        assert response.data["user"]["id"] == user.id

        # 세션이 실제로 인증된 상태인지 보호된 엔드포인트로 확인
        me_response = client.get(ME_URL)
        assert me_response.status_code == status.HTTP_200_OK
        assert me_response.data["id"] == user.id

    def test_rejects_login_for_inactive_linked_user(self):
        UserFactory(kakao_id="12345", is_active=False)
        client = APIClient()

        with patch("apps.users.views.auth.fetch_kakao_profile", return_value=_profile()):
            response = client.post(KAKAO_LOGIN_URL, _login_payload(), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        me_response = client.get(ME_URL)
        assert me_response.status_code == status.HTTP_403_FORBIDDEN

    def test_returns_signup_required_for_unknown_kakao_id(self):
        client = APIClient()

        with patch(
            "apps.users.views.auth.fetch_kakao_profile",
            return_value=_profile(kakao_id="99999", email="new@example.com"),
        ):
            response = client.post(KAKAO_LOGIN_URL, _login_payload(), format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "signup_required"
        assert response.data["suggested_email"] == "new@example.com"
        assert not User.objects.filter(kakao_id="99999").exists()

        session = client.session
        assert session["kakao_pending_id"] == "99999"
        assert session["kakao_pending_email"] == "new@example.com"

    def test_handles_missing_email_gracefully(self):
        """카카오가 이메일 동의를 안 줬을 때 — None으로 넘어와도 에러
        없이 signup_required로 진행돼야 함(프론트에서 수동 입력)."""
        client = APIClient()

        with patch(
            "apps.users.views.auth.fetch_kakao_profile",
            return_value=_profile(kakao_id="88888", email=None),
        ):
            response = client.post(KAKAO_LOGIN_URL, _login_payload(), format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["suggested_email"] is None

    def test_requires_code_and_redirect_uri(self):
        client = APIClient()
        response = client.post(KAKAO_LOGIN_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_propagates_service_error_as_400(self):
        client = APIClient()
        with patch(
            "apps.users.views.auth.fetch_kakao_profile",
            side_effect=KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요."),
        ):
            response = client.post(KAKAO_LOGIN_URL, _login_payload(), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


def _authenticated_pending_client(kakao_id="99999", email="new@example.com"):
    client = APIClient()
    session = client.session
    session["kakao_pending_id"] = kakao_id
    session["kakao_pending_email"] = email
    session.save()
    return client


@pytest.mark.django_db
class TestKakaoSignupCompletionView:
    def _payload(self, **overrides):
        payload = {
            "username": "newkakaouser",
            "email": "newkakaouser@example.com",
            "date_of_birth": ADULT_BIRTH_DATE,
        }
        payload.update(overrides)
        return payload

    def test_rejects_without_pending_session(self):
        client = APIClient()
        response = client.post(KAKAO_SIGNUP_COMPLETE_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(username="newkakaouser").exists()

    def test_creates_passwordless_account_and_logs_in(self):
        client = _authenticated_pending_client()

        response = client.post(KAKAO_SIGNUP_COMPLETE_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username="newkakaouser")
        assert user.kakao_id == "99999"
        assert user.is_adult_verified is True
        assert user.has_usable_password() is False

        # 세션이 소거되고 새 계정으로 로그인된 상태인지 확인
        assert client.session.get("kakao_pending_id") is None
        me_response = client.get(ME_URL)
        assert me_response.status_code == status.HTTP_200_OK
        assert me_response.data["id"] == user.id

    def test_rejects_minor_birth_date(self):
        client = _authenticated_pending_client()

        response = client.post(
            KAKAO_SIGNUP_COMPLETE_URL, self._payload(date_of_birth=MINOR_BIRTH_DATE), format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(username="newkakaouser").exists()

    def test_rejects_duplicate_username(self):
        UserFactory(username="newkakaouser")
        client = _authenticated_pending_client()

        response = client.post(KAKAO_SIGNUP_COMPLETE_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_duplicate_email(self):
        UserFactory(email="newkakaouser@example.com")
        client = _authenticated_pending_client()

        response = client.post(KAKAO_SIGNUP_COMPLETE_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
