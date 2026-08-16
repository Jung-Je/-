from django.conf import settings
from django.db import models


class BoardCategory(models.Model):
    """게시판 카테고리(예: 자유게시판, 모임모집). 스태프만 생성/삭제할 수
    있다 — 유저는 글을 쓸 때 기존 카테고리 중에서 고르기만 한다."""

    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "board_categories"
        verbose_name = "게시판 카테고리"
        verbose_name_plural = "게시판 카테고리"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Post(models.Model):
    """게시글. 좋아요 없이 글/댓글만 있는 단순한 형태(사용자 확정)."""

    category = models.ForeignKey(
        BoardCategory,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="board_posts",
    )
    title = models.CharField(max_length=200)
    content = models.TextField(max_length=5000)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "board_posts"
        verbose_name = "게시글"
        verbose_name_plural = "게시글"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Comment(models.Model):
    """게시글 댓글. 대댓글 없이 1단으로만 나열(사용자 확정 — "간단하게")."""

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="board_comments",
    )
    content = models.TextField(max_length=1000)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "board_comments"
        verbose_name = "댓글"
        verbose_name_plural = "댓글"
        ordering = ["created_at"]

    def __str__(self):
        return f"댓글 #{self.id} (post={self.post_id})"
