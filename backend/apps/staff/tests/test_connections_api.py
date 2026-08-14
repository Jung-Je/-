from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.models import Connection, Message
from apps.users.tests.factories import UserFactory

ADMIN_CONNECTIONS_URL = "/api/v1/staff/connections/"


def staff_client():
    staff = UserFactory(is_staff=True)
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


def messages_url(connection_id):
    return f"{ADMIN_CONNECTIONS_URL}{connection_id}/messages/"


def message_detail_url(connection_id, message_id):
    return f"{ADMIN_CONNECTIONS_URL}{connection_id}/messages/{message_id}/"


def status_url(connection_id):
    return f"{ADMIN_CONNECTIONS_URL}{connection_id}/status/"


@pytest.mark.django_db
class TestAdminConnectionsPermission:
    def test_anonymous_gets_403(self):
        client = APIClient()
        response = client.get(ADMIN_CONNECTIONS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_non_staff_gets_403(self, auth_client):
        client, _user = auth_client
        response = client.get(ADMIN_CONNECTIONS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_can_list_connection_between_two_unrelated_users(self):
        """공개 API(ConnectionViewSet)와의 핵심 차이 — 스태프는 자기가
        참여자가 아닌 연결도 조회할 수 있다."""
        client, _staff = staff_client()
        connection = Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())

        response = client.get(ADMIN_CONNECTIONS_URL)

        ids = [row["id"] for row in response.data["results"]]
        assert connection.id in ids


@pytest.mark.django_db
class TestAdminConnectionsSearchAndFilter:
    def test_filter_by_status(self):
        client, _staff = staff_client()
        blocked = Connection.objects.create(
            from_user=UserFactory(), to_user=UserFactory(), status=Connection.StatusChoices.BLOCKED
        )
        Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())

        response = client.get(ADMIN_CONNECTIONS_URL, {"status": "BLOCKED"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [blocked.id]

    def test_search_by_username(self):
        client, _staff = staff_client()
        target_user = UserFactory(username="moderationtarget")
        connection = Connection.objects.create(from_user=target_user, to_user=UserFactory())
        Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())

        response = client.get(ADMIN_CONNECTIONS_URL, {"search": "moderationtarget"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [connection.id]


@pytest.mark.django_db
class TestAdminConnectionMessageHistory:
    def test_staff_can_view_messages(self):
        client, _staff = staff_client()
        connection = Connection.objects.create(
            from_user=UserFactory(), to_user=UserFactory(), status=Connection.StatusChoices.ACCEPTED
        )
        Message.objects.create(connection=connection, sender=connection.from_user, body="첫 번째")
        Message.objects.create(connection=connection, sender=connection.to_user, body="두 번째")

        response = client.get(messages_url(connection.id))

        assert response.status_code == status.HTTP_200_OK
        assert [m["body"] for m in response.data] == ["첫 번째", "두 번째"]

    def test_viewing_does_not_mark_messages_read(self):
        """이 액션의 핵심 회귀 방지 지점 — 스태프가 봤다고 당사자의
        안읽음 배지가 줄면 안 된다."""
        client, _staff = staff_client()
        connection = Connection.objects.create(
            from_user=UserFactory(), to_user=UserFactory(), status=Connection.StatusChoices.ACCEPTED
        )
        message = Message.objects.create(
            connection=connection, sender=connection.from_user, body="안 읽음"
        )

        client.get(messages_url(connection.id))

        message.refresh_from_db()
        assert message.read_at is None

    def test_messages_scoped_to_connection(self):
        client, _staff = staff_client()
        connection_a = Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())
        connection_b = Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())
        Message.objects.create(
            connection=connection_a, sender=connection_a.from_user, body="A의 메시지"
        )
        Message.objects.create(
            connection=connection_b, sender=connection_b.from_user, body="B의 메시지"
        )

        response = client.get(messages_url(connection_a.id))

        assert [m["body"] for m in response.data] == ["A의 메시지"]


@pytest.mark.django_db
class TestAdminMessageDelete:
    def test_staff_can_delete_message(self):
        client, _staff = staff_client()
        connection = Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())
        message = Message.objects.create(
            connection=connection, sender=connection.from_user, body="부적절한 내용"
        )

        response = client.delete(message_detail_url(connection.id, message.id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Message.objects.filter(pk=message.id).exists()

    def test_delete_scoped_to_connection(self):
        client, _staff = staff_client()
        connection_a = Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())
        connection_b = Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())
        message = Message.objects.create(
            connection=connection_b, sender=connection_b.from_user, body="B 소속 메시지"
        )

        response = client.delete(message_detail_url(connection_a.id, message.id))

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Message.objects.filter(pk=message.id).exists()

    def test_non_staff_cannot_delete_message(self, auth_client):
        client, user = auth_client
        connection = Connection.objects.create(from_user=user, to_user=UserFactory())
        message = Message.objects.create(connection=connection, sender=user, body="메시지")

        response = client.delete(message_detail_url(connection.id, message.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Message.objects.filter(pk=message.id).exists()


@pytest.mark.django_db
class TestAdminConnectionStatusOverride:
    def test_staff_can_force_block(self):
        client, _staff = staff_client()
        connection = Connection.objects.create(
            from_user=UserFactory(), to_user=UserFactory(), status=Connection.StatusChoices.ACCEPTED
        )

        response = client.patch(status_url(connection.id), {"status": "BLOCKED"})

        assert response.status_code == status.HTTP_200_OK
        connection.refresh_from_db()
        assert connection.status == Connection.StatusChoices.BLOCKED

    def test_invalid_status_value_rejected(self):
        client, _staff = staff_client()
        connection = Connection.objects.create(from_user=UserFactory(), to_user=UserFactory())

        response = client.patch(status_url(connection.id), {"status": "NOT_A_REAL_STATUS"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_staff_cannot_override_status(self, auth_client):
        client, user = auth_client
        connection = Connection.objects.create(from_user=user, to_user=UserFactory())

        response = client.patch(status_url(connection.id), {"status": "BLOCKED"})

        assert response.status_code == status.HTTP_403_FORBIDDEN
