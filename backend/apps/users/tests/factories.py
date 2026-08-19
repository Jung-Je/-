from datetime import timedelta

from django.utils import timezone

import factory
from factory.django import DjangoModelFactory

from apps.users.models import EmailVerification, User, UserPersonality

DEFAULT_PASSWORD = "S0me-Strong-Pass!23"


def verify_email_for_test(email: str) -> None:
    """회원가입 테스트에서 이메일 인증 게이트(UserCreateSerializer.validate
    -> is_recently_verified)를 통과시키는 헬퍼 — 실제 코드 발송/입력
    과정 없이 이미 인증된 것처럼 EmailVerification 레코드를 만든다."""
    EmailVerification.objects.create(
        email=email,
        code_hash="",
        verified_at=timezone.now(),
        expires_at=timezone.now() + timedelta(minutes=10),
    )


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("username",)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    location = "Seoul"
    is_active_for_matching = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or DEFAULT_PASSWORD)
        if create:
            self.save(update_fields=["password"])


class UserPersonalityFactory(DjangoModelFactory):
    class Meta:
        model = UserPersonality

    user = factory.SubFactory(UserFactory)
    mbti = "INTJ"
    introvert_extrovert = 3
    planning_spontaneous = 3
    active_relaxed = 3
    values_description = "정직과 성장을 중요하게 생각합니다."
