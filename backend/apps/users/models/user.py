from django.contrib.auth.models import AbstractUser
from django.db import models

from ..services import optimize_profile_image


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
    # is_profile_complete와 달리 한 방향으로만 바뀐다(한 번 True면 계속
    # True) — 온보딩을 이미 끝낸 유저가 나중에 무슨 이유로든(관심사를
    # 다 지우는 등) is_profile_complete가 다시 False가 돼도, 마법사를
    # 처음부터 다시 태우지 않고 바로 앱으로 들여보내기 위한 판단 기준.
    # apps.users.views.user.UserViewSet.check_profile_completion 참고.
    has_completed_onboarding = models.BooleanField(default=False)
    is_active_for_matching = models.BooleanField(default=True, db_index=True)

    # 성인인증 (카카오 로그인 age_range 연동) — 회원가입 시 관문으로만 쓰고,
    # 여기 저장은 감사·추후 재사용(배지 노출 등) 목적. 기존 유저는 둘 다
    # 기본값(null/False)으로 남는다 — 이 기능 이전에 가입한 계정이라 로그인엔
    # 영향 없음.
    kakao_id = models.CharField(max_length=64, null=True, blank=True, unique=True, db_index=True)
    is_adult_verified = models.BooleanField(default=False)

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
