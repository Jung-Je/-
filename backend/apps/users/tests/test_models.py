import datetime

import pytest

from apps.users.tests.factories import UserFactory, UserPersonalityFactory


@pytest.mark.django_db
class TestUserAge:
    def test_age_is_none_without_date_of_birth(self):
        user = UserFactory(date_of_birth=None)
        assert user.age is None

    def test_age_computed_from_date_of_birth(self):
        today = datetime.date.today()
        twenty_years_ago = today.replace(year=today.year - 20)
        user = UserFactory(date_of_birth=twenty_years_ago)
        assert user.age == 20

    def test_age_not_yet_had_birthday_this_year(self):
        today = datetime.date.today()
        # Born 20 years ago, but the birthday hasn't happened yet this year.
        future_month_day = today + datetime.timedelta(days=1)
        try:
            dob = future_month_day.replace(year=today.year - 20)
        except ValueError:
            # Feb 29 edge case on non-leap years; not worth the complexity here.
            pytest.skip("edge case date, skip")
        user = UserFactory(date_of_birth=dob)
        assert user.age == 19


@pytest.mark.django_db
def test_user_str_includes_username_and_email():
    user = UserFactory(username="alice", email="alice@example.com")
    assert str(user) == "alice (alice@example.com)"


@pytest.mark.django_db
def test_user_personality_str_includes_username():
    personality = UserPersonalityFactory(user__username="bob")
    assert str(personality) == "bob의 성격"
