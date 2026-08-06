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

    def test_signup_rejects_duplicate_email(self):
        UserFactory(email="taken@example.com")
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(email="taken@example.com"), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_signup_does_not_require_authentication(self):
        client = APIClient()
        response = client.post(SIGNUP_URL, self._payload(), format="json")
        assert response.status_code == status.HTTP_201_CREATED
