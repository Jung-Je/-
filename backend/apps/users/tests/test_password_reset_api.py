from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.tests.factories import DEFAULT_PASSWORD, UserFactory

PASSWORD_RESET_URL = "/api/v1/users/users/password_reset/"
PASSWORD_RESET_CONFIRM_URL = "/api/v1/users/users/password_reset_confirm/"
LOGIN_URL = "/api/v1/auth/login/"

NEW_PASSWORD = "Br4nd-New-Pass!42"


def _uid_and_token(user):
    return urlsafe_base64_encode(force_bytes(user.pk)), default_token_generator.make_token(user)


@pytest.mark.django_db
class TestPasswordResetRequest:
    def test_does_not_require_authentication(self, mailoutbox):
        user = UserFactory()
        client = APIClient()
        response = client.post(PASSWORD_RESET_URL, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_sends_email_with_working_link_for_existing_user(self, mailoutbox):
        user = UserFactory()
        client = APIClient()

        client.post(PASSWORD_RESET_URL, {"email": user.email}, format="json")

        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [user.email]
        assert "uid=" in mailoutbox[0].body
        assert "token=" in mailoutbox[0].body

    def test_unknown_email_gets_same_response_as_known_email(self, mailoutbox):
        user = UserFactory(email="someone-real@example.com")
        client = APIClient()

        known_response = client.post(PASSWORD_RESET_URL, {"email": user.email}, format="json")
        unknown_response = client.post(
            PASSWORD_RESET_URL, {"email": "nobody-here@example.com"}, format="json"
        )

        assert unknown_response.status_code == known_response.status_code
        assert unknown_response.data == known_response.data
        # Only the request for the real user actually triggers an email.
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [user.email]

    def test_rejects_invalid_email_format(self):
        client = APIClient()
        response = client.post(PASSWORD_RESET_URL, {"email": "not-an-email"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPasswordResetConfirm:
    def test_valid_token_changes_password(self):
        user = UserFactory()
        uid, token = _uid_and_token(user)
        client = APIClient()

        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.check_password(NEW_PASSWORD)
        assert not user.check_password(DEFAULT_PASSWORD)

    def test_old_password_no_longer_logs_in_after_reset(self, client):
        user = UserFactory(username="resetme")
        uid, token = _uid_and_token(user)
        APIClient().post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
        )

        old_login = client.post(LOGIN_URL, {"username": "resetme", "password": DEFAULT_PASSWORD})
        assert old_login.status_code == 200  # form re-rendered, not authenticated

        new_login = client.post(LOGIN_URL, {"username": "resetme", "password": NEW_PASSWORD})
        assert new_login.status_code == 302  # redirected away from the form, authenticated

    def test_token_cannot_be_reused_after_password_already_changed(self):
        user = UserFactory()
        uid, token = _uid_and_token(user)
        client = APIClient()
        payload = {
            "uid": uid,
            "token": token,
            "new_password": NEW_PASSWORD,
            "new_password_confirm": NEW_PASSWORD,
        }
        first = client.post(PASSWORD_RESET_CONFIRM_URL, payload, format="json")
        assert first.status_code == status.HTTP_200_OK

        second = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                **payload,
                "new_password": "Another-New-Pass!99",
                "new_password_confirm": "Another-New-Pass!99",
            },
            format="json",
        )
        assert second.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_token_is_rejected(self):
        user = UserFactory()
        uid, _token = _uid_and_token(user)
        client = APIClient()

        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": "not-a-real-token",
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        user.refresh_from_db()
        assert user.check_password(DEFAULT_PASSWORD)

    def test_invalid_uid_is_rejected(self):
        client = APIClient()
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": "not-valid-base64",
                "token": "irrelevant",
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mismatched_password_confirmation_is_rejected(self):
        user = UserFactory()
        uid, token = _uid_and_token(user)
        client = APIClient()

        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": "does-not-match",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        user.refresh_from_db()
        assert user.check_password(DEFAULT_PASSWORD)

    def test_does_not_require_authentication(self):
        user = UserFactory()
        uid, token = _uid_and_token(user)
        client = APIClient()  # deliberately not authenticated

        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
