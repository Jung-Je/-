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
