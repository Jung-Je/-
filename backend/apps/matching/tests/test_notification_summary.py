from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.models import Connection, MatchingRequest, MatchingResult, Message
from apps.users.tests.factories import UserFactory

SUMMARY_URL = "/api/v1/matching/notifications/summary/"


@pytest.mark.django_db
class TestNotificationSummary:
    def test_requires_authentication(self):
        client = APIClient()
        response = client.get(SUMMARY_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_counts_unviewed_results_and_pending_requests(self, auth_client):
        client, requester = auth_client

        matching_request = MatchingRequest.objects.create(
            requester=requester, status=MatchingRequest.StatusChoices.COMPLETED
        )
        MatchingResult.objects.create(
            request=matching_request,
            matched_user=UserFactory(),
            total_score=80,
            interest_score=80,
            personality_score=80,
            location_score=80,
            is_viewed=False,
        )
        MatchingResult.objects.create(
            request=matching_request,
            matched_user=UserFactory(),
            total_score=70,
            interest_score=70,
            personality_score=70,
            location_score=70,
            is_viewed=True,  # 이미 본 결과는 카운트에서 빠져야 함
        )
        Connection.objects.create(
            from_user=UserFactory(), to_user=requester, status=Connection.StatusChoices.PENDING
        )
        Connection.objects.create(
            from_user=UserFactory(),
            to_user=requester,
            status=Connection.StatusChoices.ACCEPTED,  # 이미 응답한 요청은 카운트에서 빠져야 함
        )

        response = client.get(SUMMARY_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "unviewed_matching_results": 1,
            "pending_connection_requests": 1,
            "unread_messages": 0,
        }

    def test_zero_when_nothing_pending(self, auth_client):
        client, _requester = auth_client

        response = client.get(SUMMARY_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "unviewed_matching_results": 0,
            "pending_connection_requests": 0,
            "unread_messages": 0,
        }

    def test_does_not_count_other_users_notifications(self, auth_client):
        client, _requester = auth_client
        other_user = UserFactory()
        other_request = MatchingRequest.objects.create(
            requester=other_user, status=MatchingRequest.StatusChoices.COMPLETED
        )
        MatchingResult.objects.create(
            request=other_request,
            matched_user=UserFactory(),
            total_score=80,
            interest_score=80,
            personality_score=80,
            location_score=80,
            is_viewed=False,
        )
        Connection.objects.create(
            from_user=UserFactory(), to_user=other_user, status=Connection.StatusChoices.PENDING
        )

        response = client.get(SUMMARY_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "unviewed_matching_results": 0,
            "pending_connection_requests": 0,
            "unread_messages": 0,
        }

    def test_counts_unread_messages_from_other_participant_only(self, auth_client):
        """AppNav '메시지' 탭 배지 — 예전엔 항상 0으로 고정돼 있던 값."""
        client, requester = auth_client
        peer = UserFactory()
        connection = Connection.objects.create(
            from_user=requester, to_user=peer, status=Connection.StatusChoices.ACCEPTED
        )
        Message.objects.create(connection=connection, sender=peer, body="안 읽은 메시지 1")
        Message.objects.create(connection=connection, sender=peer, body="안 읽은 메시지 2")
        Message.objects.create(
            connection=connection, sender=requester, body="내가 보낸 메시지는 안 셈"
        )

        response = client.get(SUMMARY_URL)

        assert response.data["unread_messages"] == 2

    def test_read_messages_and_other_connections_are_excluded(self, auth_client):
        client, requester = auth_client
        peer = UserFactory()
        connection = Connection.objects.create(
            from_user=requester, to_user=peer, status=Connection.StatusChoices.ACCEPTED
        )
        Message.objects.create(
            connection=connection, sender=peer, body="이미 읽음", read_at=timezone.now()
        )

        other_connection = Connection.objects.create(
            from_user=UserFactory(),
            to_user=UserFactory(),
            status=Connection.StatusChoices.ACCEPTED,
        )
        Message.objects.create(
            connection=other_connection, sender=other_connection.from_user, body="나랑 무관"
        )

        response = client.get(SUMMARY_URL)

        assert response.data["unread_messages"] == 0
