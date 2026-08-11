from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from .user import User


class UserPersonality(models.Model):
    """
    매칭 알고리즘을 위한 성격 및 가치관 기반 정보 저장.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="personality",
    )

    # MBTI
    mbti = models.CharField(max_length=4, blank=True, db_index=True)

    # 라이프스타일 성향 (1-5 척도)
    introvert_extrovert = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1=내향적, 5=외향적",
        null=True,
        blank=True,
    )
    planning_spontaneous = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1=계획적, 5=즉흥적",
        null=True,
        blank=True,
    )
    active_relaxed = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1=활동적, 5=여유로운",
        null=True,
        blank=True,
    )

    # 가치관
    values_description = models.TextField(
        max_length=500,
        blank=True,
        help_text="개인 가치관에 대한 자유 텍스트 설명",
    )

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_personalities"
        verbose_name = "사용자 성격"
        verbose_name_plural = "사용자 성격"
        indexes = [
            models.Index(fields=["mbti"]),
        ]

    def __str__(self):
        return f"{self.user.username}의 성격"
