from django.conf import settings
from django.db import models


class Inquiry(models.Model):
    """유저가 관리자에게 남기는 문의/신고/건의. 특정 유저·연결에 종속되지
    않는 자유 작성 — 신고 대상을 지목하는 기능은 범위 밖(Phase 1)."""

    class CategoryChoices(models.TextChoices):
        REPORT = "REPORT", "신고"
        QUESTION = "QUESTION", "문의"
        SUGGESTION = "SUGGESTION", "건의"

    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", "미처리"
        RESOLVED = "RESOLVED", "처리완료"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inquiries",
    )
    category = models.CharField(max_length=20, choices=CategoryChoices.choices)
    title = models.CharField(max_length=200)
    content = models.TextField(max_length=2000)

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "inquiries"
        verbose_name = "문의"
        verbose_name_plural = "문의"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.title}"
