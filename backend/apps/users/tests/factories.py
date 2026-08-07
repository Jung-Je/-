import factory
from factory.django import DjangoModelFactory

from apps.users.models import User, UserPersonality

DEFAULT_PASSWORD = "S0me-Strong-Pass!23"


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
