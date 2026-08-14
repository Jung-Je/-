from datetime import date, timedelta

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


@pytest.mark.django_db
class TestDateOfBirthValidation:
    """생년월일이 미래면 User.age가 음수를 반환해("-1세" 등) 화면에 그대로
    노출된 사례가 있었음 — 프론트 온보딩 폼에 max 속성이 없어서 서버에서
    막는다.
    """

    def test_rejects_future_date_of_birth(self, auth_client):
        client, user = auth_client
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        response = client.patch(f"/api/v1/users/users/{user.id}/", {"date_of_birth": tomorrow})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "date_of_birth" in response.data

    def test_rejects_date_of_birth_under_minimum_age(self, auth_client):
        """회원가입 때의 최소연령(만 19세) 검증을 가입 후 프로필 수정으로
        우회 못 하게 여기서도 같이 막는다."""
        client, user = auth_client
        ten_years_ago = date.today().replace(year=date.today().year - 10).isoformat()

        response = client.patch(f"/api/v1/users/users/{user.id}/", {"date_of_birth": ten_years_ago})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "date_of_birth" in response.data

    def test_accepts_past_date_of_birth(self, auth_client):
        client, user = auth_client

        response = client.patch(f"/api/v1/users/users/{user.id}/", {"date_of_birth": "1995-01-01"})

        assert response.status_code == status.HTTP_200_OK
