from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class MatchingRequest(models.Model):
    """
    사용자의 매칭 요청을 저장.
    """

    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", "대기중"
        PROCESSING = "PROCESSING", "처리중"
        COMPLETED = "COMPLETED", "완료"
        CANCELLED = "CANCELLED", "취소됨"

    # 완료된 요청은 취소할 수 없다는 규칙 — Django admin의 일괄 취소
    # 액션(admin.py)과 스태프 API의 단건 취소(apps.staff.views.
    # matching_request.cancel)가 각자 다른 코드로 같은 규칙을 구현하고
    # 있었다(코드 리뷰로 발견). 나중에 규칙이 바뀌면(예: 이미 매칭
    # 결과가 있으면도 막기) 한쪽만 고치고 놓칠 위험이 있어서 여기 한
    # 곳으로 모은다 — 대량 업데이트(admin)는 cancellable_queryset(),
    # 단건 판단(API)은 can_be_cancelled 프로퍼티를 쓴다.
    NON_CANCELLABLE_STATUSES = [StatusChoices.COMPLETED]

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matching_requests",
    )

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        db_index=True,
    )

    # 매칭 선호 조건
    min_age = models.IntegerField(
        validators=[MinValueValidator(18), MaxValueValidator(100)],
        null=True,
        blank=True,
    )
    max_age = models.IntegerField(
        validators=[MinValueValidator(18), MaxValueValidator(100)],
        null=True,
        blank=True,
    )
    preferred_location = models.CharField(max_length=100, blank=True)
    max_results = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        default=10,
    )

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "matching_requests"
        verbose_name = "매칭 요청"
        verbose_name_plural = "매칭 요청"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["requester", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.requester.username} - {self.status} ({self.created_at})"

    @property
    def can_be_cancelled(self) -> bool:
        return self.status not in self.NON_CANCELLABLE_STATUSES

    @classmethod
    def cancellable_queryset(cls, queryset):
        """대량 취소(admin.py의 mark_as_cancelled)용 — can_be_cancelled와
        같은 규칙을 쿼리셋 필터로 표현한 것."""
        return queryset.exclude(status__in=cls.NON_CANCELLABLE_STATUSES)


class MatchingResult(models.Model):
    """
    계산된 호환성 점수를 포함한 매칭 결과 저장.
    """

    request = models.ForeignKey(
        MatchingRequest,
        on_delete=models.CASCADE,
        related_name="results",
    )
    matched_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_matches",
    )

    # 매칭 점수 (0-100)
    total_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        db_index=True,
    )
    interest_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    personality_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    location_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    # 매칭 상세 정보
    common_interests_count = models.IntegerField(default=0)
    matching_reason = models.TextField(
        blank=True,
        help_text="이 사용자들이 매칭된 이유에 대한 AI 생성 설명",
    )

    # 사용자 인터랙션
    is_viewed = models.BooleanField(default=False)
    is_contacted = models.BooleanField(default=False)

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    viewed_at = models.DateTimeField(null=True, blank=True)
    contacted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "matching_results"
        verbose_name = "매칭 결과"
        verbose_name_plural = "매칭 결과"
        ordering = ["-total_score", "-created_at"]
        unique_together = [["request", "matched_user"]]
        indexes = [
            models.Index(fields=["request", "-total_score"]),
            models.Index(fields=["matched_user", "is_contacted"]),
            models.Index(fields=["total_score"]),
        ]

    def __str__(self):
        return (
            f"{self.request.requester.username} -> "
            f"{self.matched_user.username} (점수: {self.total_score})"
        )
