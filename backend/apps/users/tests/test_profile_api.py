from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.tests.factories import InterestFactory, UserInterestFactory
from apps.users.tests.factories import DEFAULT_PASSWORD, UserPersonalityFactory

ME_URL = "/api/v1/users/users/me/"
CHANGE_PASSWORD_URL = "/api/v1/users/users/change_password/"
CHECK_PROFILE_URL = "/api/v1/users/users/check_profile_completion/"


@pytest.mark.django_db
def test_me_requires_authentication():
    client = APIClient()
    response = client.get(ME_URL)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_me_returns_current_user(auth_client):
    client, user = auth_client
    response = client.get(ME_URL)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["username"] == user.username


@pytest.mark.django_db
class TestChangePassword:
    def test_change_password_succeeds_with_correct_old_password(self, auth_client):
        client, user = auth_client
        response = client.post(
            CHANGE_PASSWORD_URL,
            {
                "old_password": DEFAULT_PASSWORD,
                "new_password": "N3w-Even-Stronger-Pass!",
                "new_password_confirm": "N3w-Even-Stronger-Pass!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.check_password("N3w-Even-Stronger-Pass!")

    def test_change_password_rejects_wrong_old_password(self, auth_client):
        client, user = auth_client
        response = client.post(
            CHANGE_PASSWORD_URL,
            {
                "old_password": "totally-wrong-password",
                "new_password": "N3w-Even-Stronger-Pass!",
                "new_password_confirm": "N3w-Even-Stronger-Pass!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        user.refresh_from_db()
        assert user.check_password(DEFAULT_PASSWORD)

    def test_change_password_rejects_mismatched_confirmation(self, auth_client):
        client, _user = auth_client
        response = client.post(
            CHANGE_PASSWORD_URL,
            {
                "old_password": DEFAULT_PASSWORD,
                "new_password": "N3w-Even-Stronger-Pass!",
                "new_password_confirm": "does-not-match",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestProfileCompletion:
    def test_incomplete_profile_reports_missing_pieces(self, auth_client):
        client, _user = auth_client
        response = client.post(CHECK_PROFILE_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_complete"] is False
        assert response.data["missing_fields"]["personality"] is True
        assert response.data["missing_fields"]["interests"] is True

    def test_complete_profile_marks_user_as_complete(self, auth_client):
        client, user = auth_client
        user.gender = user.GenderChoices.OTHER
        user.date_of_birth = "1995-01-01"
        user.location = "Seoul"
        user.bio = "안녕하세요"
        user.save()
        UserPersonalityFactory(user=user)
        UserInterestFactory(user=user, interest=InterestFactory())

        response = client.post(CHECK_PROFILE_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_complete"] is True
        user.refresh_from_db()
        assert user.is_profile_complete is True
