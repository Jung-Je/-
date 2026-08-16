from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.board.models import BoardCategory

CATEGORIES_URL = "/api/v1/board/categories/"


@pytest.mark.django_db
class TestBoardCategoryList:
    def test_requires_authentication(self):
        response = APIClient().get(CATEGORIES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_lists_categories(self, auth_client):
        client, _user = auth_client
        BoardCategory.objects.create(name="자유게시판")
        BoardCategory.objects.create(name="모임모집")

        response = client.get(CATEGORIES_URL)

        assert response.status_code == status.HTTP_200_OK
        names = [row["name"] for row in response.data["results"]]
        assert set(names) == {"자유게시판", "모임모집"}

    def test_create_update_delete_not_allowed(self, auth_client):
        """카테고리 생성/삭제는 스태프 전용(apps.staff) — 소비자 엔드포인트는
        읽기 전용."""
        client, _user = auth_client
        category = BoardCategory.objects.create(name="자유게시판")

        assert (
            client.post(CATEGORIES_URL, {"name": "새 카테고리"}, format="json").status_code == 405
        )
        assert client.delete(f"{CATEGORIES_URL}{category.id}/").status_code == 405
