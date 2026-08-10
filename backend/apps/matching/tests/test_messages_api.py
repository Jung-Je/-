from rest_framework import status

import pytest

from apps.matching.models import Connection, Message
from apps.users.tests.factories import UserFactory

CONNECTIONS_URL = "/api/v1/matching/connections/"


def messages_url(connection_id):
    return f"/api/v1/matching/connections/{connection_id}/messages/"


@pytest.mark.django_db
class TestMessagingRequiresAcceptedConnection:
    def test_pending_connection_rejects_messages(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(from_user=from_user, to_user=to_user)

        response = client.post(messages_url(connection.id), {"body": "안녕하세요"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not Message.objects.exists()

    def test_rejected_connection_rejects_messages(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.REJECTED
        )

        response = client.get(messages_url(connection.id))

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unrelated_user_gets_not_found(self, auth_client):
        client, _unrelated_user = auth_client
        from_user = UserFactory()
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )

        response = client.get(messages_url(connection.id))

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSendMessage:
    def test_either_participant_can_send(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )

        response = client.post(messages_url(connection.id), {"body": "안녕하세요!"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["body"] == "안녕하세요!"
        assert response.data["sender"] == from_user.id
        message = Message.objects.get()
        assert message.connection == connection
        assert message.sender == from_user

    def test_rejects_empty_body(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )

        response = client.post(messages_url(connection.id), {"body": "   "}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not Message.objects.exists()


@pytest.mark.django_db
class TestListMessages:
    def test_returns_messages_oldest_first(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )
        Message.objects.create(connection=connection, sender=from_user, body="첫 번째")
        Message.objects.create(connection=connection, sender=to_user, body="두 번째")

        response = client.get(messages_url(connection.id))

        assert response.status_code == status.HTTP_200_OK
        assert [m["body"] for m in response.data] == ["첫 번째", "두 번째"]

    def test_reading_marks_the_other_partys_messages_as_read(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )
        their_message = Message.objects.create(connection=connection, sender=to_user, body="hi")
        my_message = Message.objects.create(connection=connection, sender=from_user, body="hey")

        client.get(messages_url(connection.id))

        their_message.refresh_from_db()
        my_message.refresh_from_db()
        assert their_message.read_at is not None
        # 내가 보낸 메시지는 내가 읽어도 read_at이 세팅되지 않는다
        # (상대방이 읽었는지를 나타내는 값이라, 내 조회로 바뀌면 안 됨).
        assert my_message.read_at is None


@pytest.mark.django_db
class TestConnectionMessagePreviewFields:
    """대화 목록(ConnectionSerializer)이 스레드를 열어보지 않아도
    안 읽은 개수/마지막 메시지를 보여줄 수 있는지 확인."""

    def test_unread_message_count_excludes_my_own_messages(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )
        Message.objects.create(connection=connection, sender=to_user, body="상대가 보낸 메시지")
        Message.objects.create(connection=connection, sender=from_user, body="내가 보낸 메시지")

        response = client.get(f"{CONNECTIONS_URL}sent/")

        assert response.data[0]["unread_message_count"] == 1

    def test_last_message_reflects_most_recent(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )
        Message.objects.create(connection=connection, sender=from_user, body="첫 메시지")
        Message.objects.create(connection=connection, sender=to_user, body="가장 최근 메시지")

        response = client.get(f"{CONNECTIONS_URL}sent/")

        assert response.data[0]["last_message"]["body"] == "가장 최근 메시지"

    def test_last_message_is_none_without_messages(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        Connection.objects.create(
            from_user=from_user, to_user=to_user, status=Connection.StatusChoices.ACCEPTED
        )

        response = client.get(f"{CONNECTIONS_URL}sent/")

        assert response.data[0]["last_message"] is None
        assert response.data[0]["unread_message_count"] == 0
