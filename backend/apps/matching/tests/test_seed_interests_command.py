from io import StringIO

from django.core.management import call_command

import pytest

from apps.matching.models import Interest, InterestCategory


@pytest.mark.django_db
class TestSeedInterestsCommand:
    def test_creates_categories_and_interests(self):
        call_command("seed_interests", stdout=StringIO())

        assert InterestCategory.objects.count() > 0
        assert Interest.objects.count() > 0
        # 모든 관심사가 카테고리에 속해 있어야 함
        assert not Interest.objects.filter(category__isnull=True).exists()

    def test_is_idempotent(self):
        call_command("seed_interests", stdout=StringIO())
        first_category_count = InterestCategory.objects.count()
        first_interest_count = Interest.objects.count()

        call_command("seed_interests", stdout=StringIO())

        assert InterestCategory.objects.count() == first_category_count
        assert Interest.objects.count() == first_interest_count
