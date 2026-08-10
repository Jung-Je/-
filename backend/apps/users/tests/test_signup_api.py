from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.models import User
from apps.users.tests.factories import UserFactory

SIGNUP_URL = "/api/v1/users/users/"


@pytest.mark.django_db
class TestSignup:
    def _payload(self, **overrides):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "S0me-Strong-Pass!23",
            "password_confirm": "S0me-Strong-Pass!23",
            "first_name": "New",
            "last_name": "User",
        }
        payload.update(overrides)
        return payload

    def test_signup_succeeds_and_hashes_password(self):
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "password" not in response.data
        user = User.objects.get(username="newuser")
        assert user.check_password("S0me-Strong-Pass!23")

    def test_signup_rejects_mismatched_password_confirm(self):
        client = APIClient()
        response = client.post(
            SIGNUP_URL, self._payload(password_confirm="different-password"), format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(username="newuser").exists()

    def test_signup_rejects_password_without_special_character(self):
        """영문+숫자만으로는 통과되면 안 됨(PasswordComplexityValidator)."""
        client = APIClient()
        response = client.post(
            SIGNUP_URL,
            self._payload(password="LettersAndDigits123", password_confirm="LettersAndDigits123"),
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(username="newuser").exists()

    def test_signup_rejects_duplicate_email(self):
        UserFactory(email="taken@example.com")
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(email="taken@example.com"), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # DRF의 UniqueValidator 기본 메시지는 한/영이 뒤섞여("사용자 with this
        # 이메일 already exists.") 화면에 그대로 노출하기엔 부적절했던 회귀.
        assert response.data["email"] == ["이미 사용 중인 이메일입니다."]

    def test_signup_rejects_duplicate_username(self):
        UserFactory(username="taken")
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(username="taken"), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["username"] == ["이미 사용 중인 닉네임입니다."]

    def test_signup_does_not_require_authentication(self):
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(), format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_signup_logs_completion(self, apps_caplog):
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(), format="json")

        assert f"user_id={response.data['id']}" in apps_caplog.text
