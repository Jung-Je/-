from rest_framework import status

import pytest

from apps.support.models import Inquiry
from apps.users.tests.factories import UserFactory

INQUIRIES_URL = "/api/v1/support/inquiries/"


def _payload(**overrides):
    payload = {
        "category": Inquiry.CategoryChoices.QUESTION,
        "title": "로그인이 안 돼요",
        "content": "카카오 로그인 버튼을 눌러도 반응이 없어요.",
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestInquiryCreate:
    def test_requires_authentication(self):
        from rest_framework.test import APIClient

        response = APIClient().post(INQUIRIES_URL, _payload(), format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_creates_inquiry_owned_by_current_user(self, auth_client):
        client, user = auth_client

        response = client.post(INQUIRIES_URL, _payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == Inquiry.StatusChoices.PENDING
        assert response.data["category_display"] == "문의"
        inquiry = Inquiry.objects.get(id=response.data["id"])
        assert inquiry.user_id == user.id

    def test_category_is_required(self, auth_client):
        client, _ = auth_client
        response = client.post(INQUIRIES_URL, _payload(category=""), format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_unknown_category(self, auth_client):
        client, _ = auth_client
        response = client.post(INQUIRIES_URL, _payload(category="ETC"), format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_status_cannot_be_set_by_client(self, auth_client):
        """status는 read_only_fields라 클라이언트가 보내도 무시되고
        항상 PENDING으로 생성돼야 한다 — 스태프만 바꿀 수 있는 필드."""
        client, _ = auth_client
        response = client.post(
            INQUIRIES_URL,
            _payload(status=Inquiry.StatusChoices.RESOLVED),
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == Inquiry.StatusChoices.PENDING


@pytest.mark.django_db
class TestInquiryList:
    def test_only_shows_own_inquiries(self, auth_client):
        client, user = auth_client
        other_user = UserFactory()
        Inquiry.objects.create(user=user, **_payload(title="내 문의"))
        Inquiry.objects.create(user=other_user, **_payload(title="남의 문의"))

        response = client.get(INQUIRIES_URL)

        assert response.status_code == status.HTTP_200_OK
        titles = [row["title"] for row in response.data["results"]]
        assert titles == ["내 문의"]

    def test_cannot_retrieve_other_users_inquiry(self, auth_client):
        client, _ = auth_client
        other_user = UserFactory()
        inquiry = Inquiry.objects.create(user=other_user, **_payload())

        response = client.get(f"{INQUIRIES_URL}{inquiry.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_and_delete_not_allowed(self, auth_client):
        client, user = auth_client
        inquiry = Inquiry.objects.create(user=user, **_payload())

        assert client.patch(f"{INQUIRIES_URL}{inquiry.id}/").status_code == 405
        assert client.delete(f"{INQUIRIES_URL}{inquiry.id}/").status_code == 405

    def test_admin_reply_is_visible_once_answered(self, auth_client):
        """스태프가 남긴 답변을 유저가 본인 문의 조회로 볼 수 있어야 함."""
        client, user = auth_client
        inquiry = Inquiry.objects.create(
            user=user,
            **_payload(),
            admin_reply="확인했습니다, 곧 조치할게요.",
            status=Inquiry.StatusChoices.RESOLVED,
        )

        response = client.get(f"{INQUIRIES_URL}{inquiry.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["admin_reply"] == "확인했습니다, 곧 조치할게요."
        assert response.data["status"] == Inquiry.StatusChoices.RESOLVED
