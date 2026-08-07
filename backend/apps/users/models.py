from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from .image_processing import optimize_profile_image


class User(AbstractUser):
    """
    Django AbstractUser를 확장한 커스텀 사용자 모델.
    인증 및 프로필을 위한 기본 사용자 정보를 저장.
    """

    class GenderChoices(models.TextChoices):
        MALE = "M", "남성"
        FEMALE = "F", "여성"
        OTHER = "O", "기타"
        PREFER_NOT_TO_SAY = "N", "선택 안함"

    # 프로필 정보
    email = models.EmailField(unique=True, db_index=True)
    gender = models.CharField(
        max_length=1,
        choices=GenderChoices.choices,
        null=True,
        blank=True,
    )
    date_of_birth = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=100, blank=True, db_index=True)
    bio = models.TextField(max_length=500, blank=True)
    profile_image = models.ImageField(
        upload_to="profiles/%Y/%m/%d/",
        null=True,
        blank=True,
    )

    # 계정 상태
    is_profile_complete = models.BooleanField(default=False)
    is_active_for_matching = models.BooleanField(default=True, db_index=True)

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"
        verbose_name = "사용자"
        verbose_name_plural = "사용자"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["location"]),
            models.Index(fields=["is_active_for_matching", "is_profile_complete"]),
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 인스턴스 로드/생성 시점의 profile_image를 기억해뒀다가 save()에서
        # 실제로 새 파일이 들어온 경우에만 최적화를 수행한다 (다른 필드만
        # 바뀐 저장에서 매번 재인코딩하는 낭비를 피하기 위함).
        self._original_profile_image = self.profile_image

    def save(self, *args, **kwargs):
        if self.profile_image and self.profile_image != self._original_profile_image:
            self.profile_image = optimize_profile_image(self.profile_image)
        super().save(*args, **kwargs)
        self._original_profile_image = self.profile_image

    def __str__(self):
        return f"{self.username} ({self.email})"

    @property
    def age(self):
        """생년월일로부터 사용자 나이 계산"""
        if not self.date_of_birth:
            return None
        from datetime import date

        today = date.today()
        return (
            today.year
            - self.date_of_birth.year
            - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        )


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
