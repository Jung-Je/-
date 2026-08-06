import factory
from factory.django import DjangoModelFactory

from apps.matching.models import Interest, InterestCategory, UserInterest
from apps.users.tests.factories import UserFactory


class InterestCategoryFactory(DjangoModelFactory):
    class Meta:
        model = InterestCategory
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"카테고리{n}")


class InterestFactory(DjangoModelFactory):
    class Meta:
        model = Interest
        django_get_or_create = ("category", "name")

    category = factory.SubFactory(InterestCategoryFactory)
    name = factory.Sequence(lambda n: f"관심사{n}")


class UserInterestFactory(DjangoModelFactory):
    class Meta:
        model = UserInterest
        django_get_or_create = ("user", "interest")

    user = factory.SubFactory(UserFactory)
    interest = factory.SubFactory(InterestFactory)
    level = 3
