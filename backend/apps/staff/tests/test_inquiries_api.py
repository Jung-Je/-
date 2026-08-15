from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.support.models import Inquiry
from apps.users.tests.factories import UserFactory

ADMIN_INQUIRIES_URL = "/api/v1/staff/inquiries/"


def staff_client():
    staff = UserFactory(is_staff=True)
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


def make_inquiry(**overrides):
    payload = {
        "user": UserFactory(),
        "category": Inquiry.CategoryChoices.REPORT,
        "title": "부적절한 메시지를 받았어요",
        "content": "상세 내용",
    }
    payload.update(overrides)
    return Inquiry.objects.create(**payload)


def status_url(inquiry_id):
    return f"{ADMIN_INQUIRIES_URL}{inquiry_id}/"


def reply_url(inquiry_id):
    return f"{ADMIN_INQUIRIES_URL}{inquiry_id}/reply/"


@pytest.mark.django_db
class TestAdminInquiriesPermission:
    def test_anonymous_gets_403(self):
        client = APIClient()
        response = client.get(ADMIN_INQUIRIES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_non_staff_gets_403(self, auth_client):
        client, _user = auth_client
        response = client.get(ADMIN_INQUIRIES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminInquiriesVisibility:
    def test_staff_sees_inquiries_from_any_user(self):
        client, _staff = staff_client()
        inquiry = make_inquiry()

        response = client.get(ADMIN_INQUIRIES_URL)

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [inquiry.id]
        assert response.data["results"][0]["username"] == inquiry.user.username

    def test_filter_by_status(self):
        client, _staff = staff_client()
        pending = make_inquiry(status=Inquiry.StatusChoices.PENDING)
        make_inquiry(status=Inquiry.StatusChoices.RESOLVED)

        response = client.get(ADMIN_INQUIRIES_URL, {"status": "PENDING"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [pending.id]

    def test_filter_by_category(self):
        client, _staff = staff_client()
        report = make_inquiry(category=Inquiry.CategoryChoices.REPORT)
        make_inquiry(category=Inquiry.CategoryChoices.SUGGESTION)

        response = client.get(ADMIN_INQUIRIES_URL, {"category": "REPORT"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [report.id]

    def test_search_by_author_username(self):
        client, _staff = staff_client()
        target_user = UserFactory(username="findme-author")
        target = make_inquiry(user=target_user)
        make_inquiry()

        response = client.get(ADMIN_INQUIRIES_URL, {"search": "findme-author"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [target.id]


@pytest.mark.django_db
class TestAdminInquiriesStatusChange:
    def test_marking_resolved_sets_resolved_at(self):
        client, _staff = staff_client()
        inquiry = make_inquiry()

        response = client.patch(status_url(inquiry.id), {"status": "RESOLVED"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        inquiry.refresh_from_db()
        assert inquiry.status == Inquiry.StatusChoices.RESOLVED
        assert inquiry.resolved_at is not None

    def test_reopening_clears_resolved_at(self):
        client, _staff = staff_client()
        inquiry = make_inquiry()
        client.patch(status_url(inquiry.id), {"status": "RESOLVED"}, format="json")

        response = client.patch(status_url(inquiry.id), {"status": "PENDING"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        inquiry.refresh_from_db()
        assert inquiry.status == Inquiry.StatusChoices.PENDING
        assert inquiry.resolved_at is None

    def test_non_staff_cannot_change_status(self, auth_client):
        client, _user = auth_client
        inquiry = make_inquiry()

        response = client.patch(status_url(inquiry.id), {"status": "RESOLVED"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        inquiry.refresh_from_db()
        assert inquiry.status == Inquiry.StatusChoices.PENDING

    def test_create_and_delete_not_allowed(self):
        client, _staff = staff_client()
        inquiry = make_inquiry()

        assert client.post(ADMIN_INQUIRIES_URL, {}, format="json").status_code == 405
        assert client.delete(status_url(inquiry.id)).status_code == 405


@pytest.mark.django_db
class TestAdminInquiriesReply:
    def test_reply_sets_replied_at_and_resolves(self):
        client, _staff = staff_client()
        inquiry = make_inquiry()

        response = client.post(
            reply_url(inquiry.id), {"admin_reply": "확인 후 조치했습니다."}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        inquiry.refresh_from_db()
        assert inquiry.admin_reply == "확인 후 조치했습니다."
        assert inquiry.replied_at is not None
        assert inquiry.status == Inquiry.StatusChoices.RESOLVED
        assert inquiry.resolved_at is not None

    def test_clearing_reply_keeps_status_unchanged(self):
        client, _staff = staff_client()
        inquiry = make_inquiry()
        client.post(reply_url(inquiry.id), {"admin_reply": "답변"}, format="json")

        response = client.post(reply_url(inquiry.id), {"admin_reply": ""}, format="json")

        assert response.status_code == status.HTTP_200_OK
        inquiry.refresh_from_db()
        assert inquiry.admin_reply == ""
        assert inquiry.replied_at is None
        # 답변을 지워도 이미 처리완료였던 상태는 그대로 유지된다.
        assert inquiry.status == Inquiry.StatusChoices.RESOLVED

    def test_reply_can_be_overwritten(self):
        client, _staff = staff_client()
        inquiry = make_inquiry()
        client.post(reply_url(inquiry.id), {"admin_reply": "첫 답변"}, format="json")

        response = client.post(reply_url(inquiry.id), {"admin_reply": "수정된 답변"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        inquiry.refresh_from_db()
        assert inquiry.admin_reply == "수정된 답변"

    def test_non_staff_cannot_reply(self, auth_client):
        client, _user = auth_client
        inquiry = make_inquiry()

        response = client.post(reply_url(inquiry.id), {"admin_reply": "답변"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        inquiry.refresh_from_db()
        assert inquiry.admin_reply == ""
