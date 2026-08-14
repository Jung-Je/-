from datetime import date

from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.models import User
from apps.users.tests.factories import UserFactory

SIGNUP_URL = "/api/v1/users/users/"

ADULT_BIRTH_DATE = date.today().replace(year=date.today().year - 25).isoformat()
MINOR_BIRTH_DATE = date.today().replace(year=date.today().year - 10).isoformat()


@pytest.mark.django_db
class TestSignup:
    def _payload(self, **overrides):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "date_of_birth": ADULT_BIRTH_DATE,
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

    def test_signup_marks_user_as_adult_verified(self):
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username="newuser")
        assert user.is_adult_verified is True

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


@pytest.mark.django_db
class TestSignupMinimumAgeGate:
    """카카오 로그인 age_range 동의항목으로 실제 신원인증을 붙이려 했으나
    (연동 코드는 apps/users/services/kakao.py에 남아있음) 사업자등록번호가
    필요해 막혀서, 자기신고 생년월일 + 최소연령(만 19세) 검증으로 전환한
    관문을 검증한다.
    """

    def _payload(self, **overrides):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "date_of_birth": ADULT_BIRTH_DATE,
            "password": "S0me-Strong-Pass!23",
            "password_confirm": "S0me-Strong-Pass!23",
        }
        payload.update(overrides)
        return payload

    def test_rejects_signup_under_minimum_age(self):
        client = APIClient()
        response = client.post(
            SIGNUP_URL, self._payload(date_of_birth=MINOR_BIRTH_DATE), format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "date_of_birth" in response.data
        assert not User.objects.filter(username="newuser").exists()

    def test_rejects_signup_without_date_of_birth(self):
        client = APIClient()
        payload = self._payload()
        del payload["date_of_birth"]

        response = client.post(SIGNUP_URL, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "date_of_birth" in response.data

    def test_rejects_future_date_of_birth(self):
        client = APIClient()
        future_date = date.today().replace(year=date.today().year + 1).isoformat()

        response = client.post(SIGNUP_URL, self._payload(date_of_birth=future_date), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "date_of_birth" in response.data

    def test_accepts_signup_at_exactly_minimum_age(self):
        """생일이 오늘이라 딱 만 19세가 되는 경계값."""
        today = date.today()
        exactly_19_today = today.replace(year=today.year - 19).isoformat()

        client = APIClient()
        response = client.post(
            SIGNUP_URL, self._payload(date_of_birth=exactly_19_today), format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED
