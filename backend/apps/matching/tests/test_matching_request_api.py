from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.models import MatchingRequest
from apps.matching.tests.factories import InterestFactory, UserInterestFactory
from apps.users.tests.factories import UserFactory

REQUESTS_URL = "/api/v1/matching/requests/"
RESULTS_URL = "/api/v1/matching/results/"


@pytest.mark.django_db
class TestMatchingRequestCreate:
    def test_requires_authentication(self):
        client = APIClient()
        response = client.post(REQUESTS_URL, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_creates_request_and_runs_algorithm_immediately(self, auth_client):
        client, requester = auth_client
        interest = InterestFactory()
        UserInterestFactory(user=requester, interest=interest, level=3)
        matched = UserFactory(location=requester.location)
        UserInterestFactory(user=matched, interest=interest, level=3)

        response = client.post(REQUESTS_URL, {"max_results": 5}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == MatchingRequest.StatusChoices.COMPLETED
        assert response.data["results_count"] == 1
        assert response.data["requester"] == requester.id

    def test_requester_is_forced_to_current_user(self, auth_client):
        client, requester = auth_client
        other_user = UserFactory()

        response = client.post(
            REQUESTS_URL, {"max_results": 5, "requester": other_user.id}, format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["requester"] == requester.id


@pytest.mark.django_db
class TestMatchingRequestList:
    def test_only_sees_own_requests(self, auth_client):
        client, requester = auth_client
        other_user = UserFactory()
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        other_client.post(REQUESTS_URL, {"max_results": 5}, format="json")

        client.post(REQUESTS_URL, {"max_results": 5}, format="json")

        response = client.get(REQUESTS_URL)
        assert response.status_code == status.HTTP_200_OK
        requester_ids = {r["requester"] for r in response.data["results"]}
        assert requester_ids == {requester.id}


@pytest.mark.django_db
class TestMatchingRequestCancel:
    # perform_create() runs the matching algorithm synchronously and always
    # ends in COMPLETED, so a request created via the API can never be
    # cancelled in practice. Create directly via the ORM to exercise the
    # cancel action's own PENDING/PROCESSING check in isolation.
    def test_cancel_pending_request(self, auth_client):
        client, requester = auth_client
        matching_request = MatchingRequest.objects.create(
            requester=requester, status=MatchingRequest.StatusChoices.PENDING
        )

        response = client.post(f"{REQUESTS_URL}{matching_request.id}/cancel/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == MatchingRequest.StatusChoices.CANCELLED

    def test_cancel_already_cancelled_request_fails(self, auth_client):
        client, requester = auth_client
        matching_request = MatchingRequest.objects.create(
            requester=requester, status=MatchingRequest.StatusChoices.CANCELLED
        )

        response = client.post(f"{REQUESTS_URL}{matching_request.id}/cancel/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancel_completed_request_fails(self, auth_client):
        client, requester = auth_client
        create_response = client.post(REQUESTS_URL, {"max_results": 5}, format="json")
        request_id = create_response.data["id"]
        assert create_response.data["status"] == MatchingRequest.StatusChoices.COMPLETED

        response = client.post(f"{REQUESTS_URL}{request_id}/cancel/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMatchingResults:
    def test_viewing_result_marks_it_viewed(self, auth_client):
        client, requester = auth_client
        interest = InterestFactory()
        UserInterestFactory(user=requester, interest=interest)
        matched = UserFactory(location=requester.location)
        UserInterestFactory(user=matched, interest=interest)
        client.post(REQUESTS_URL, {"max_results": 5}, format="json")

        list_response = client.get(RESULTS_URL)
        result_id = list_response.data["results"][0]["id"]
        assert list_response.data["results"][0]["is_viewed"] is False

        detail_response = client.get(f"{RESULTS_URL}{result_id}/")
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.data["is_viewed"] is True

    def test_only_sees_own_results(self, auth_client):
        client, requester = auth_client
        other_requester = UserFactory()
        other_client = APIClient()
        other_client.force_authenticate(user=other_requester)
        interest = InterestFactory()
        UserInterestFactory(user=other_requester, interest=interest)
        UserInterestFactory(user=UserFactory(location=other_requester.location), interest=interest)
        other_client.post(REQUESTS_URL, {"max_results": 5}, format="json")

        response = client.get(RESULTS_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []
