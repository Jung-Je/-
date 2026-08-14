from decimal import Decimal

from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.models import MatchingRequest, MatchingResult
from apps.users.tests.factories import UserFactory

ADMIN_REQUESTS_URL = "/api/v1/matching/admin/matching-requests/"


def staff_client():
    staff = UserFactory(is_staff=True)
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


def cancel_url(request_id):
    return f"{ADMIN_REQUESTS_URL}{request_id}/cancel/"


def results_url(request_id):
    return f"{ADMIN_REQUESTS_URL}{request_id}/results/"


def make_result(matching_request, matched_user, total_score="80.00"):
    return MatchingResult.objects.create(
        request=matching_request,
        matched_user=matched_user,
        total_score=Decimal(total_score),
        interest_score=Decimal("80.00"),
        personality_score=Decimal("80.00"),
        location_score=Decimal("80.00"),
        common_interests_count=2,
    )


@pytest.mark.django_db
class TestAdminMatchingRequestsPermission:
    def test_anonymous_gets_403(self):
        client = APIClient()
        response = client.get(ADMIN_REQUESTS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_non_staff_gets_403(self, auth_client):
        client, _user = auth_client
        response = client.get(ADMIN_REQUESTS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminMatchingRequestsVisibility:
    def test_staff_sees_requests_not_owned_by_self(self):
        client, _staff = staff_client()
        other_user = UserFactory()
        matching_request = MatchingRequest.objects.create(requester=other_user)

        response = client.get(ADMIN_REQUESTS_URL)

        ids = [row["id"] for row in response.data["results"]]
        assert matching_request.id in ids

    def test_filter_by_status(self):
        client, _staff = staff_client()
        pending = MatchingRequest.objects.create(
            requester=UserFactory(), status=MatchingRequest.StatusChoices.PENDING
        )
        MatchingRequest.objects.create(
            requester=UserFactory(), status=MatchingRequest.StatusChoices.COMPLETED
        )

        response = client.get(ADMIN_REQUESTS_URL, {"status": "PENDING"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [pending.id]

    def test_search_by_requester_username(self):
        client, _staff = staff_client()
        target_user = UserFactory(username="findme-requester")
        target = MatchingRequest.objects.create(requester=target_user)
        MatchingRequest.objects.create(requester=UserFactory())

        response = client.get(ADMIN_REQUESTS_URL, {"search": "findme-requester"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [target.id]


@pytest.mark.django_db
class TestAdminMatchingRequestsCancel:
    def test_pending_request_can_be_cancelled(self):
        client, _staff = staff_client()
        matching_request = MatchingRequest.objects.create(
            requester=UserFactory(), status=MatchingRequest.StatusChoices.PENDING
        )

        response = client.post(cancel_url(matching_request.id))

        assert response.status_code == status.HTTP_200_OK
        matching_request.refresh_from_db()
        assert matching_request.status == MatchingRequest.StatusChoices.CANCELLED

    def test_processing_request_can_be_cancelled(self):
        client, _staff = staff_client()
        matching_request = MatchingRequest.objects.create(
            requester=UserFactory(), status=MatchingRequest.StatusChoices.PROCESSING
        )

        response = client.post(cancel_url(matching_request.id))

        assert response.status_code == status.HTTP_200_OK
        matching_request.refresh_from_db()
        assert matching_request.status == MatchingRequest.StatusChoices.CANCELLED

    def test_completed_request_cannot_be_cancelled(self):
        client, _staff = staff_client()
        matching_request = MatchingRequest.objects.create(
            requester=UserFactory(), status=MatchingRequest.StatusChoices.COMPLETED
        )

        response = client.post(cancel_url(matching_request.id))

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        matching_request.refresh_from_db()
        assert matching_request.status == MatchingRequest.StatusChoices.COMPLETED

    def test_non_staff_cannot_cancel(self, auth_client):
        client, _user = auth_client
        matching_request = MatchingRequest.objects.create(
            requester=UserFactory(), status=MatchingRequest.StatusChoices.PENDING
        )

        response = client.post(cancel_url(matching_request.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        matching_request.refresh_from_db()
        assert matching_request.status == MatchingRequest.StatusChoices.PENDING


@pytest.mark.django_db
class TestAdminMatchingRequestsResults:
    def test_results_action_returns_only_own_results(self):
        client, _staff = staff_client()
        matching_request = MatchingRequest.objects.create(requester=UserFactory())
        other_request = MatchingRequest.objects.create(requester=UserFactory())

        own_result = make_result(matching_request, UserFactory())
        make_result(other_request, UserFactory())

        response = client.get(results_url(matching_request.id))

        assert response.status_code == status.HTTP_200_OK
        ids = [row["id"] for row in response.data]
        assert ids == [own_result.id]

    def test_non_staff_cannot_view_results(self, auth_client):
        client, _user = auth_client
        matching_request = MatchingRequest.objects.create(requester=UserFactory())

        response = client.get(results_url(matching_request.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN
