from django.conf import settings
from django.db import models

from .matching_request import MatchingResult


class Connection(models.Model):
    """
    사용자 간 연결/친구 관계 저장.
    """

    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", "대기중"
        ACCEPTED = "ACCEPTED", "수락됨"
        REJECTED = "REJECTED", "거절됨"
        BLOCKED = "BLOCKED", "차단됨"

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="connections_sent",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="connections_received",
    )

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        db_index=True,
    )

    # 선택사항: 이 연결로 이어진 매칭 결과 링크
    matching_result = models.ForeignKey(
        MatchingResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="connections",
    )

    message = models.TextField(max_length=500, blank=True)

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "connections"
        verbose_name = "연결"
        verbose_name_plural = "연결"
        ordering = ["-created_at"]
        unique_together = [["from_user", "to_user"]]
        indexes = [
            models.Index(fields=["from_user", "status"]),
            models.Index(fields=["to_user", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.from_user.username} -> {self.to_user.username} ({self.status})"


class Message(models.Model):
    """
    연결(Connection) 안에서 오가는 1:1 메시지.

    별도의 "대화방" 모델을 두지 않고 Connection을 그대로 대화방으로
    재사용한다 — 두 사용자가 ACCEPTED 상태로 연결된 것 자체가 이미
    유일한 1:1 관계(unique_together)라, 대화방 개념을 새로 만들 이유가
    없다. 메시지를 주고받을 수 있는지(수락된 연결인지)는 뷰에서 검사.
    """

    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField(max_length=2000)

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        verbose_name = "메시지"
        verbose_name_plural = "메시지"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["connection", "created_at"]),
            models.Index(fields=["connection", "read_at"]),
        ]

    def __str__(self):
        return f"{self.sender.username}: {self.body[:30]}"
