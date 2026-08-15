from rest_framework import status

import pytest

from apps.board.models import BoardCategory, Comment, Post
from apps.users.tests.factories import UserFactory

COMMENTS_URL = "/api/v1/board/comments/"


def _post(**overrides):
    payload = {
        "category": BoardCategory.objects.get_or_create(name="자유게시판")[0],
        "author": UserFactory(),
        "title": "제목",
        "content": "내용",
    }
    payload.update(overrides)
    return Post.objects.create(**payload)


def comment_url(comment_id):
    return f"{COMMENTS_URL}{comment_id}/"


@pytest.mark.django_db
class TestCommentCreate:
    def test_requires_authentication(self):
        from rest_framework.test import APIClient

        post = _post()
        response = APIClient().post(
            COMMENTS_URL, {"post": post.id, "content": "댓글"}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_creates_comment_owned_by_current_user(self, auth_client):
        client, user = auth_client
        post = _post()

        response = client.post(
            COMMENTS_URL, {"post": post.id, "content": "저도 갈게요"}, format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        comment = Comment.objects.get(id=response.data["id"])
        assert comment.author_id == user.id
        assert comment.post_id == post.id


@pytest.mark.django_db
class TestCommentVisibility:
    def test_shows_comments_from_every_user(self, auth_client):
        client, _user = auth_client
        post = _post()
        other_user = UserFactory()
        comment = Comment.objects.create(post=post, author=other_user, content="다른 사람 댓글")

        response = client.get(COMMENTS_URL, {"post": post.id})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [comment.id]

    def test_filters_by_post(self, auth_client):
        client, user = auth_client
        post_a = _post(title="A")
        post_b = _post(title="B")
        comment_a = Comment.objects.create(post=post_a, author=user, content="a")
        Comment.objects.create(post=post_b, author=user, content="b")

        response = client.get(COMMENTS_URL, {"post": post_a.id})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [comment_a.id]


@pytest.mark.django_db
class TestCommentOwnership:
    def test_author_can_update_own_comment(self, auth_client):
        client, user = auth_client
        post = _post()
        comment = Comment.objects.create(post=post, author=user, content="원래 댓글")

        response = client.patch(comment_url(comment.id), {"content": "수정된 댓글"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        comment.refresh_from_db()
        assert comment.content == "수정된 댓글"

    def test_author_can_delete_own_comment(self, auth_client):
        client, user = auth_client
        post = _post()
        comment = Comment.objects.create(post=post, author=user, content="댓글")

        response = client.delete(comment_url(comment.id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Comment.objects.filter(id=comment.id).exists()

    def test_non_author_cannot_update_comment(self, auth_client):
        client, _user = auth_client
        post = _post()
        other_user = UserFactory()
        comment = Comment.objects.create(post=post, author=other_user, content="댓글")

        response = client.patch(comment_url(comment.id), {"content": "해킹"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        comment.refresh_from_db()
        assert comment.content == "댓글"

    def test_non_author_cannot_delete_comment(self, auth_client):
        client, _user = auth_client
        post = _post()
        other_user = UserFactory()
        comment = Comment.objects.create(post=post, author=other_user, content="댓글")

        response = client.delete(comment_url(comment.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Comment.objects.filter(id=comment.id).exists()
