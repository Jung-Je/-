from rest_framework import status

import pytest

from apps.matching.models import Connection
from apps.users.tests.factories import UserFactory

CONNECTIONS_URL = "/api/v1/matching/connections/"


@pytest.mark.django_db
class TestConnectionCreate:
    def test_create_connection_request(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()

        response = client.post(CONNECTIONS_URL, {"to_user": to_user.id}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["from_user"] == from_user.id
        assert response.data["status"] == Connection.StatusChoices.PENDING

    def test_cannot_connect_to_self(self, auth_client):
        client, from_user = auth_client
        response = client.post(CONNECTIONS_URL, {"to_user": from_user.id}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_duplicate_connection(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        client.post(CONNECTIONS_URL, {"to_user": to_user.id}, format="json")

        response = client.post(CONNECTIONS_URL, {"to_user": to_user.id}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestConnectionInboxes:
    def test_received_lists_pending_incoming_requests(self, auth_client):
        client, to_user = auth_client
        from_user = UserFactory()
        Connection.objects.create(from_user=from_user, to_user=to_user)

        response = client.get(f"{CONNECTIONS_URL}received/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["from_user"] == from_user.id

    def test_sent_lists_outgoing_requests(self, auth_client):
        client, from_user = auth_client
        to_user = UserFactory()
        Connection.objects.create(from_user=from_user, to_user=to_user)

        response = client.get(f"{CONNECTIONS_URL}sent/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["to_user"] == to_user.id


@pytest.mark.django_db
class TestConnectionRespond:
    def test_recipient_can_accept(self, auth_client):
        client, to_user = auth_client
        from_user = UserFactory()
        connection = Connection.objects.create(from_user=from_user, to_user=to_user)

        response = client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "accept"}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Connection.StatusChoices.ACCEPTED
        connection.refresh_from_db()
        assert connection.responded_at is not None

    def test_recipient_can_reject(self, auth_client):
        client, to_user = auth_client
        from_user = UserFactory()
        connection = Connection.objects.create(from_user=from_user, to_user=to_user)

        response = client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "reject"}, format="json"
        )
        assert response.data["status"] == Connection.StatusChoices.REJECTED

    def test_sender_cannot_respond_to_their_own_request(self, auth_client):
        # The sender IS a party to the connection (so it's visible in their
        # queryset, unlike a totally unrelated user who'd 404 instead), but
        # only the recipient (to_user) may accept/reject/block.
        client, sender = auth_client
        to_user = UserFactory()
        connection = Connection.objects.create(from_user=sender, to_user=to_user)

        response = client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "accept"}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unrelated_user_gets_not_found(self, auth_client):
        client, _unrelated_user = auth_client
        from_user = UserFactory()
        to_user = UserFactory()
        connection = Connection.objects.create(from_user=from_user, to_user=to_user)

        response = client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "accept"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_respond_twice(self, auth_client):
        client, to_user = auth_client
        from_user = UserFactory()
        connection = Connection.objects.create(from_user=from_user, to_user=to_user)
        client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "accept"}, format="json"
        )

        response = client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "reject"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestConnectionEmailNotifications:
    def test_creating_a_connection_emails_the_recipient(self, auth_client, mailoutbox):
        client, from_user = auth_client
        to_user = UserFactory()

        client.post(CONNECTIONS_URL, {"to_user": to_user.id}, format="json")

        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [to_user.email]
        assert from_user.username in mailoutbox[0].body

    def test_accepting_emails_the_original_sender(self, auth_client, mailoutbox):
        client, to_user = auth_client
        from_user = UserFactory()
        connection = Connection.objects.create(from_user=from_user, to_user=to_user)

        client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "accept"}, format="json"
        )

        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [from_user.email]
        assert to_user.username in mailoutbox[0].body

    def test_rejecting_does_not_send_an_email(self, auth_client, mailoutbox):
        client, to_user = auth_client
        from_user = UserFactory()
        connection = Connection.objects.create(from_user=from_user, to_user=to_user)

        client.post(
            f"{CONNECTIONS_URL}{connection.id}/respond/", {"action": "reject"}, format="json"
        )

        assert len(mailoutbox) == 0

    def test_email_failure_does_not_break_connection_creation(self, auth_client, monkeypatch):
        def _broken_send_mail(*args, **kwargs):
            raise RuntimeError("smtp down")

        client, _from_user = auth_client
        to_user = UserFactory()
        monkeypatch.setattr("apps.matching.notifications.send_mail", _broken_send_mail)

        response = client.post(CONNECTIONS_URL, {"to_user": to_user.id}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Connection.objects.filter(to_user=to_user).exists()
