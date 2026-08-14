from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.users.tests.factories import UserFactory, UserPersonalityFactory

ADMIN_USERS_URL = "/api/v1/staff/users/"


def staff_client():
    staff = UserFactory(is_staff=True)
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


@pytest.mark.django_db
class TestAdminUsersPermission:
    def test_anonymous_gets_403(self):
        client = APIClient()
        response = client.get(ADMIN_USERS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_non_staff_gets_403(self, auth_client):
        client, _user = auth_client
        response = client.get(ADMIN_USERS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_can_list_all_users(self):
        client, staff = staff_client()
        regular = UserFactory()
        other_staff = UserFactory(is_staff=True)

        response = client.get(ADMIN_USERS_URL)

        assert response.status_code == status.HTTP_200_OK
        ids = {row["id"] for row in response.data["results"]}
        assert {staff.id, regular.id, other_staff.id} <= ids


@pytest.mark.django_db
class TestAdminUsersSearchAndFilter:
    def test_search_by_username(self):
        client, _staff = staff_client()
        target = UserFactory(username="findme123")
        UserFactory(username="somebodyelse")

        response = client.get(ADMIN_USERS_URL, {"search": "findme"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [target.id]

    def test_filter_by_is_active(self):
        client, _staff = staff_client()
        suspended = UserFactory(is_active=False)
        UserFactory(is_active=True)

        response = client.get(ADMIN_USERS_URL, {"is_active": "false"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [suspended.id]

    def test_filter_by_is_active_for_matching(self):
        client, _staff = staff_client()
        excluded = UserFactory(is_active_for_matching=False)
        UserFactory(is_active_for_matching=True)

        response = client.get(ADMIN_USERS_URL, {"is_active_for_matching": "false"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [excluded.id]


@pytest.mark.django_db
class TestAdminUserDetail:
    def test_retrieve_includes_personality(self):
        client, _staff = staff_client()
        target = UserFactory()
        UserPersonalityFactory(user=target, mbti="ENFP")

        response = client.get(f"{ADMIN_USERS_URL}{target.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["personality"]["mbti"] == "ENFP"

    def test_retrieve_handles_missing_personality(self):
        client, _staff = staff_client()
        target = UserFactory()

        response = client.get(f"{ADMIN_USERS_URL}{target.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["personality"] is None


@pytest.mark.django_db
class TestAdminUserModeration:
    def test_staff_can_suspend_user(self):
        client, _staff = staff_client()
        target = UserFactory(is_active=True)

        response = client.patch(f"{ADMIN_USERS_URL}{target.id}/", {"is_active": False})

        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_active is False

    def test_staff_can_reactivate_user(self):
        client, _staff = staff_client()
        target = UserFactory(is_active=False)

        response = client.patch(f"{ADMIN_USERS_URL}{target.id}/", {"is_active": True})

        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_active is True

    def test_staff_can_toggle_is_active_for_matching(self):
        client, _staff = staff_client()
        target = UserFactory(is_active_for_matching=True)

        response = client.patch(f"{ADMIN_USERS_URL}{target.id}/", {"is_active_for_matching": False})

        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_active_for_matching is False

    def test_moderation_endpoint_ignores_is_staff_field(self):
        client, _staff = staff_client()
        target = UserFactory(is_staff=False)

        response = client.patch(
            f"{ADMIN_USERS_URL}{target.id}/", {"is_staff": True, "is_active": True}
        )

        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_staff is False

    def test_self_lockout_prevented(self):
        client, staff = staff_client()

        response = client.patch(f"{ADMIN_USERS_URL}{staff.id}/", {"is_active": False})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        staff.refresh_from_db()
        assert staff.is_active is True

    def test_non_staff_moderation_forbidden(self, auth_client):
        client, user = auth_client
        target = UserFactory()

        response = client.patch(f"{ADMIN_USERS_URL}{target.id}/", {"is_active": False})

        assert response.status_code == status.HTTP_403_FORBIDDEN
