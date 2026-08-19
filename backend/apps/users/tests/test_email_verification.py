from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.models import EmailVerification
from apps.users.tests.factories import UserFactory

REQUEST_URL = "/api/v1/users/users/request_email_verification/"
CONFIRM_URL = "/api/v1/users/users/confirm_email_verification/"

EMAIL = "verify-me@example.com"


@pytest.mark.django_db
class TestRequestEmailVerification:
    def test_sends_code_by_email(self):
        client = APIClient()
        response = client.post(REQUEST_URL, {"email": EMAIL}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert EmailVerification.objects.filter(email=EMAIL).count() == 1
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [EMAIL]

    def test_rejects_already_registered_email(self):
        UserFactory(email=EMAIL)
        client = APIClient()

        response = client.post(REQUEST_URL, {"email": EMAIL}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["email"] == ["이미 사용 중인 이메일입니다."]
        assert not EmailVerification.objects.filter(email=EMAIL).exists()

    def test_rejects_resend_within_cooldown(self):
        client = APIClient()
        client.post(REQUEST_URL, {"email": EMAIL}, format="json")

        response = client.post(REQUEST_URL, {"email": EMAIL}, format="json")

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert EmailVerification.objects.filter(email=EMAIL).count() == 1

    def test_does_not_require_authentication(self):
        client = APIClient()
        response = client.post(REQUEST_URL, {"email": EMAIL}, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_returns_503_when_smtp_send_fails(self):
        """개발 환경이 콘솔 백엔드 대신 실제 SMTP로 발송하도록 바뀐 뒤로
        (dev.py) send_mail이 예외를 던질 수 있게 됐는데, 예전엔 여기서
        안 잡혀 500으로 죽었다(코드 리뷰로 발견). 실패한 시도는 쿨다운을
        막고 있으면 안 되므로 레코드도 안 남아야 한다."""
        client = APIClient()

        with patch(
            "apps.users.services.email_verification.send_mail",
            side_effect=OSError("SMTP 연결 실패"),
        ):
            response = client.post(REQUEST_URL, {"email": EMAIL}, format="json")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert not EmailVerification.objects.filter(email=EMAIL).exists()

        # 실패한 시도가 쿨다운을 막지 않으므로 바로 재요청이 가능해야 함
        response = client.post(REQUEST_URL, {"email": EMAIL}, format="json")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestConfirmEmailVerification:
    def _create_record(self, code="123456", **overrides):
        from django.contrib.auth.hashers import make_password

        defaults = {
            "email": EMAIL,
            "code_hash": make_password(code),
            "expires_at": timezone.now() + timedelta(minutes=10),
        }
        defaults.update(overrides)
        return EmailVerification.objects.create(**defaults)

    def test_confirms_correct_code(self):
        self._create_record(code="123456")
        client = APIClient()

        response = client.post(CONFIRM_URL, {"email": EMAIL, "code": "123456"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"verified": True}
        record = EmailVerification.objects.get(email=EMAIL)
        assert record.verified_at is not None

    def test_rejects_wrong_code_and_increments_attempts(self):
        self._create_record(code="123456")
        client = APIClient()

        response = client.post(CONFIRM_URL, {"email": EMAIL, "code": "000000"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        record = EmailVerification.objects.get(email=EMAIL)
        assert record.verified_at is None
        assert record.attempts == 1

    def test_rejects_after_max_attempts(self):
        self._create_record(code="123456", attempts=5)
        client = APIClient()

        response = client.post(CONFIRM_URL, {"email": EMAIL, "code": "123456"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "초과" in response.data["detail"]

    def test_rejects_expired_code(self):
        self._create_record(code="123456", expires_at=timezone.now() - timedelta(minutes=1))
        client = APIClient()

        response = client.post(CONFIRM_URL, {"email": EMAIL, "code": "123456"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_nonexistent_code(self):
        client = APIClient()
        response = client.post(
            CONFIRM_URL, {"email": "never-requested@example.com", "code": "123456"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_does_not_require_authentication(self):
        self._create_record(code="123456")
        client = APIClient()
        response = client.post(CONFIRM_URL, {"email": EMAIL, "code": "123456"}, format="json")
        assert response.status_code == status.HTTP_200_OK
