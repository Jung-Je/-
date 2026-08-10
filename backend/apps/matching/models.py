from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class InterestCategory(models.Model):
    """
    사용자 관심사 카테고리 (예: 스포츠, 음악, 기술).
    """

    name = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="아이콘 이름 또는 이모지")

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "interest_categories"
        verbose_name = "관심사 카테고리"
        verbose_name_plural = "관심사 카테고리"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Interest(models.Model):
    """
    카테고리 내의 구체적인 관심사 (예: 농구, 록 음악, AI).
    """

    category = models.ForeignKey(
        InterestCategory,
        on_delete=models.CASCADE,
        related_name="interests",
    )
    name = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True)

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "interests"
        verbose_name = "관심사"
        verbose_name_plural = "관심사"
        ordering = ["category", "name"]
        unique_together = [["category", "name"]]
        indexes = [
            models.Index(fields=["category", "name"]),
        ]

    def __str__(self):
        return f"{self.category.name} - {self.name}"


class UserInterest(models.Model):
    """
    사용자와 관심사 간의 다대다 관계 및 숙련도 레벨.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_interests",
    )
    interest = models.ForeignKey(
        Interest,
        on_delete=models.CASCADE,
        related_name="user_interests",
    )

    # 숙련도/관심도 레벨 (1-5)
    level = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        default=3,
        help_text="1=초보/궁금함, 3=중급, 5=전문가/열정적",
    )

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_interests"
        verbose_name = "사용자 관심사"
        verbose_name_plural = "사용자 관심사"
        unique_together = [["user", "interest"]]
        ordering = ["-level", "interest__category"]
        indexes = [
            models.Index(fields=["user", "level"]),
            models.Index(fields=["interest", "level"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.interest.name} (레벨 {self.level})"


class MatchingRequest(models.Model):
    """
    사용자의 매칭 요청을 저장.
    """

    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", "대기중"
        PROCESSING = "PROCESSING", "처리중"
        COMPLETED = "COMPLETED", "완료"
        CANCELLED = "CANCELLED", "취소됨"

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
