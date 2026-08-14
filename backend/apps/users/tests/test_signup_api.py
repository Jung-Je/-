from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.models import User
from apps.users.tests.factories import UserFactory

SIGNUP_URL = "/api/v1/users/users/"


def _verified_client(kakao_id="test-kakao-id"):
    """카카오 성인인증을 이미 마친 것처럼 세션을 세팅한 클라이언트.

    회원가입 자체가 아니라 다른 검증(비밀번호 규칙, 중복 등)을 테스트할
    때는 이걸 써서 카카오 인증 관문 때문에 엉뚱한 사유로 400이 나는 걸
    피한다 — Django 테스트 클라이언트의 표준 세션 조작 패턴(session에
    값을 넣고 save()하면 클라이언트가 그 세션을 그대로 사용).
    """
    client = APIClient()
    session = client.session
    session["kakao_age_verified"] = True
    session["kakao_verified_id"] = kakao_id
    session.save()
    return client


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
        client = _verified_client()
        response = client.post(SIGNUP_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "password" not in response.data
        user = User.objects.get(username="newuser")
        assert user.check_password("S0me-Strong-Pass!23")

    def test_signup_rejects_mismatched_password_confirm(self):
        client = _verified_client()
        response = client.post(
            SIGNUP_URL, self._payload(password_confirm="different-password"), format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(username="newuser").exists()

    def test_signup_rejects_password_without_special_character(self):
        """영문+숫자만으로는 통과되면 안 됨(PasswordComplexityValidator)."""
        client = _verified_client()
        response = client.post(
            SIGNUP_URL,
            self._payload(password="LettersAndDigits123", password_confirm="LettersAndDigits123"),
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(username="newuser").exists()

    def test_signup_rejects_duplicate_email(self):
        UserFactory(email="taken@example.com")
        client = _verified_client()
        response = client.post(SIGNUP_URL, self._payload(email="taken@example.com"), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # DRF의 UniqueValidator 기본 메시지는 한/영이 뒤섞여("사용자 with this
        # 이메일 already exists.") 화면에 그대로 노출하기엔 부적절했던 회귀.
        assert response.data["email"] == ["이미 사용 중인 이메일입니다."]

    def test_signup_rejects_duplicate_username(self):
        UserFactory(username="taken")
        client = _verified_client()
        response = client.post(SIGNUP_URL, self._payload(username="taken"), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["username"] == ["이미 사용 중인 닉네임입니다."]

    def test_signup_does_not_require_authentication(self):
        client = _verified_client()
        response = client.post(SIGNUP_URL, self._payload(), format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_signup_logs_completion(self, apps_caplog):
        client = _verified_client()
        response = client.post(SIGNUP_URL, self._payload(), format="json")

        assert f"user_id={response.data['id']}" in apps_caplog.text


@pytest.mark.django_db
class TestSignupKakaoVerificationGate:
    def _payload(self, **overrides):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "S0me-Strong-Pass!23",
            "password_confirm": "S0me-Strong-Pass!23",
        }
        payload.update(overrides)
        return payload

    def test_signup_rejected_without_kakao_verification(self):
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "kakao_verification" in response.data
        assert not User.objects.filter(username="newuser").exists()

    def test_signup_stores_kakao_id_and_marks_adult_verified(self):
        client = _verified_client(kakao_id="12345")
        response = client.post(SIGNUP_URL, self._payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username="newuser")
        assert user.kakao_id == "12345"
        assert user.is_adult_verified is True

    def test_kakao_verification_is_consumed_after_signup(self):
        """같은 세션으로 계정을 두 개 만들 수 없다 — 두 번째 가입은 다시
        카카오 인증을 거쳐야 한다."""
        client = _verified_client()
        first = client.post(SIGNUP_URL, self._payload(), format="json")
        assert first.status_code == status.HTTP_201_CREATED

        second = client.post(
            SIGNUP_URL,
            self._payload(username="seconduser", email="seconduser@example.com"),
            format="json",
        )

        assert second.status_code == status.HTTP_400_BAD_REQUEST
        assert "kakao_verification" in second.data
        assert not User.objects.filter(username="seconduser").exists()
