from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.board.models import BoardCategory, Comment, Post
from apps.users.tests.factories import UserFactory

ADMIN_CATEGORIES_URL = "/api/v1/staff/board-categories/"
ADMIN_POSTS_URL = "/api/v1/staff/board-posts/"
ADMIN_COMMENTS_URL = "/api/v1/staff/board-comments/"


def staff_client():
    staff = UserFactory(is_staff=True)
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


def make_category(name="자유게시판"):
    return BoardCategory.objects.get_or_create(name=name)[0]


def make_post(**overrides):
    payload = {
        "category": make_category(),
        "author": UserFactory(),
        "title": "제목",
        "content": "내용",
    }
    payload.update(overrides)
    return Post.objects.create(**payload)


def make_comment(**overrides):
    payload = {"post": make_post(), "author": UserFactory(), "content": "댓글"}
    payload.update(overrides)
    return Comment.objects.create(**payload)


@pytest.mark.django_db
class TestAdminBoardCategories:
    def test_anonymous_gets_403(self):
        response = APIClient().get(ADMIN_CATEGORIES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_non_staff_gets_403(self, auth_client):
        client, _user = auth_client
        response = client.get(ADMIN_CATEGORIES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_can_create_category(self):
        client, _staff = staff_client()
        response = client.post(ADMIN_CATEGORIES_URL, {"name": "모임모집"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert BoardCategory.objects.filter(name="모임모집").exists()

    def test_deleting_category_cascades_to_posts(self):
        client, _staff = staff_client()
        category = make_category()
        post = make_post(category=category)

        response = client.delete(f"{ADMIN_CATEGORIES_URL}{category.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Post.objects.filter(id=post.id).exists()

    def test_posts_count_reflects_cascade_impact(self):
        client, _staff = staff_client()
        category = make_category()
        make_post(category=category)
        make_post(category=category)

        response = client.get(ADMIN_CATEGORIES_URL)

        row = next(r for r in response.data["results"] if r["id"] == category.id)
        assert row["posts_count"] == 2


@pytest.mark.django_db
class TestAdminPosts:
    def test_anonymous_gets_403(self):
        response = APIClient().get(ADMIN_POSTS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_sees_posts_from_any_user(self):
        client, _staff = staff_client()
        post = make_post()

        response = client.get(ADMIN_POSTS_URL)

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [post.id]
        assert response.data["results"][0]["username"] == post.author.username

    def test_staff_can_force_delete_post(self):
        client, _staff = staff_client()
        post = make_post()

        response = client.delete(f"{ADMIN_POSTS_URL}{post.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Post.objects.filter(id=post.id).exists()

    def test_non_staff_cannot_force_delete_post(self, auth_client):
        client, _user = auth_client
        post = make_post()

        response = client.delete(f"{ADMIN_POSTS_URL}{post.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Post.objects.filter(id=post.id).exists()

    def test_create_and_update_not_allowed(self):
        client, _staff = staff_client()
        post = make_post()

        assert client.post(ADMIN_POSTS_URL, {}, format="json").status_code == 405
        assert client.patch(f"{ADMIN_POSTS_URL}{post.id}/", {}, format="json").status_code == 405


@pytest.mark.django_db
class TestAdminComments:
    def test_staff_sees_comments_from_any_user(self):
        client, _staff = staff_client()
        comment = make_comment()

        response = client.get(ADMIN_COMMENTS_URL)

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [comment.id]

    def test_filters_by_post(self):
        client, _staff = staff_client()
        post_a = make_post(title="A")
        post_b = make_post(title="B")
        comment_a = make_comment(post=post_a)
        make_comment(post=post_b)

        response = client.get(ADMIN_COMMENTS_URL, {"post": post_a.id})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [comment_a.id]

    def test_staff_can_force_delete_comment(self):
        client, _staff = staff_client()
        comment = make_comment()

        response = client.delete(f"{ADMIN_COMMENTS_URL}{comment.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Comment.objects.filter(id=comment.id).exists()

    def test_non_staff_cannot_force_delete_comment(self, auth_client):
        client, _user = auth_client
        comment = make_comment()

        response = client.delete(f"{ADMIN_COMMENTS_URL}{comment.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Comment.objects.filter(id=comment.id).exists()
