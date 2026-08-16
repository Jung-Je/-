from rest_framework import status

import pytest

from apps.board.models import BoardCategory, Post
from apps.users.tests.factories import UserFactory

POSTS_URL = "/api/v1/board/posts/"


def _category(name="자유게시판"):
    return BoardCategory.objects.create(name=name)


def _payload(category, **overrides):
    payload = {
        "category": category.id,
        "title": "이번 주말에 등산 가실 분",
        "content": "북한산 등산 같이 가실 분 구해요.",
    }
    payload.update(overrides)
    return payload


def post_url(post_id):
    return f"{POSTS_URL}{post_id}/"


@pytest.mark.django_db
class TestPostCreate:
    def test_requires_authentication(self):
        from rest_framework.test import APIClient

        category = _category()
        response = APIClient().post(POSTS_URL, _payload(category), format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_creates_post_owned_by_current_user(self, auth_client):
        client, user = auth_client
        category = _category()

        response = client.post(POSTS_URL, _payload(category), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["author"] == user.id
        assert response.data["author_username"] == user.username
        assert response.data["category_name"] == category.name
        assert response.data["comment_count"] == 0

    def test_author_cannot_be_set_by_client(self, auth_client):
        client, user = auth_client
        other = UserFactory()
        category = _category()

        response = client.post(POSTS_URL, _payload(category, author=other.id), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["author"] == user.id


@pytest.mark.django_db
class TestPostVisibility:
    def test_shows_posts_from_every_user(self, auth_client):
        """Inquiry와 정반대 — 게시판은 전체 공개라 다른 유저 글도 보여야 함."""
        client, _user = auth_client
        category = _category()
        other_user = UserFactory()
        post = Post.objects.create(
            category=category, author=other_user, title="다른 사람 글", content="내용"
        )

        response = client.get(POSTS_URL)

        ids = [row["id"] for row in response.data["results"]]
        assert post.id in ids

    def test_can_retrieve_other_users_post(self, auth_client):
        client, _user = auth_client
        category = _category()
        other_user = UserFactory()
        post = Post.objects.create(
            category=category, author=other_user, title="다른 사람 글", content="내용"
        )

        response = client.get(post_url(post.id))

        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_category(self, auth_client):
        client, user = auth_client
        cat_a = _category("자유게시판")
        cat_b = _category("모임모집")
        post_a = Post.objects.create(category=cat_a, author=user, title="A", content="a")
        Post.objects.create(category=cat_b, author=user, title="B", content="b")

        response = client.get(POSTS_URL, {"category": cat_a.id})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [post_a.id]

    def test_search_by_title(self, auth_client):
        client, user = auth_client
        category = _category()
        target = Post.objects.create(
            category=category, author=user, title="findme-title", content="내용"
        )
        Post.objects.create(category=category, author=user, title="다른 글", content="내용")

        response = client.get(POSTS_URL, {"search": "findme-title"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [target.id]


@pytest.mark.django_db
class TestPostOwnership:
    def test_author_can_update_own_post(self, auth_client):
        client, user = auth_client
        category = _category()
        post = Post.objects.create(
            category=category, author=user, title="원래 제목", content="내용"
        )

        response = client.patch(post_url(post.id), {"title": "수정된 제목"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        post.refresh_from_db()
        assert post.title == "수정된 제목"

    def test_author_can_delete_own_post(self, auth_client):
        client, user = auth_client
        category = _category()
        post = Post.objects.create(category=category, author=user, title="제목", content="내용")

        response = client.delete(post_url(post.id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Post.objects.filter(id=post.id).exists()

    def test_non_author_cannot_update_post(self, auth_client):
        client, _user = auth_client
        category = _category()
        other_user = UserFactory()
        post = Post.objects.create(
            category=category, author=other_user, title="제목", content="내용"
        )

        response = client.patch(post_url(post.id), {"title": "해킹"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        post.refresh_from_db()
        assert post.title == "제목"

    def test_non_author_cannot_delete_post(self, auth_client):
        client, _user = auth_client
        category = _category()
        other_user = UserFactory()
        post = Post.objects.create(
            category=category, author=other_user, title="제목", content="내용"
        )

        response = client.delete(post_url(post.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Post.objects.filter(id=post.id).exists()
