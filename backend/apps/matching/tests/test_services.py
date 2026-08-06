from decimal import Decimal

import pytest

from apps.matching.models import Connection, MatchingRequest
from apps.matching.services import (
    ScoreBreakdown,
    calculate_interest_score,
    calculate_location_score,
    calculate_personality_score,
    process_matching_request,
)
from apps.matching.tests.factories import InterestFactory, UserInterestFactory
from apps.users.tests.factories import UserFactory, UserPersonalityFactory


class TestCalculateInterestScore:
    def test_no_requester_interests_scores_zero(self):
        score, common = calculate_interest_score({}, {1: 3})
        assert score == Decimal("0.00")
        assert common == 0

    def test_no_overlap_scores_zero(self):
        score, common = calculate_interest_score({1: 3}, {2: 3})
        assert score == Decimal("0.00")
        assert common == 0

    def test_full_overlap_identical_levels_scores_max(self):
        score, common = calculate_interest_score({1: 3, 2: 5}, {1: 3, 2: 5})
        assert score == Decimal("100.00")
        assert common == 2

    def test_partial_overlap_with_level_gap_scores_between(self):
        # 1 of 2 requester interests shared (coverage 0.5), level gap of 2 out of 4 (similarity 0.5)
        score, common = calculate_interest_score({1: 3, 2: 5}, {1: 1})
        assert common == 1
        # coverage(0.5)*0.6 + similarity(0.5)*0.4 = 0.5 -> 50.00
        assert score == Decimal("50.00")


class TestCalculatePersonalityScore:
    def test_missing_personality_on_either_side_is_neutral(self):
        assert calculate_personality_score(None, None) == Decimal("50.00")

    def test_identical_mbti_and_traits_scores_max(self):
        p1 = UserPersonalityFactory.build(
            mbti="INTJ", introvert_extrovert=3, planning_spontaneous=3, active_relaxed=3
        )
        p2 = UserPersonalityFactory.build(
            mbti="INTJ", introvert_extrovert=3, planning_spontaneous=3, active_relaxed=3
        )
        assert calculate_personality_score(p1, p2) == Decimal("100.00")

    def test_completely_different_mbti_and_traits_scores_min(self):
        p1 = UserPersonalityFactory.build(
            mbti="INTJ", introvert_extrovert=1, planning_spontaneous=1, active_relaxed=1
        )
        p2 = UserPersonalityFactory.build(
            mbti="ESFP", introvert_extrovert=5, planning_spontaneous=5, active_relaxed=5
        )
        assert calculate_personality_score(p1, p2) == Decimal("0.00")

    def test_missing_traits_falls_back_to_mbti_only(self):
        p1 = UserPersonalityFactory.build(
            mbti="INTJ", introvert_extrovert=None, planning_spontaneous=None, active_relaxed=None
        )
        p2 = UserPersonalityFactory.build(
            mbti="INTJ", introvert_extrovert=None, planning_spontaneous=None, active_relaxed=None
        )
        assert calculate_personality_score(p1, p2) == Decimal("100.00")


class TestCalculateLocationScore:
    def test_same_location_case_and_whitespace_insensitive(self):
        requester = UserFactory.build(location="  Seoul ")
        candidate = UserFactory.build(location="seoul")
        assert calculate_location_score(requester, candidate) == Decimal("100.00")

    def test_different_location_scores_zero(self):
        requester = UserFactory.build(location="Seoul")
        candidate = UserFactory.build(location="Busan")
        assert calculate_location_score(requester, candidate) == Decimal("0.00")

    def test_missing_location_scores_zero(self):
        requester = UserFactory.build(location="")
        candidate = UserFactory.build(location="Seoul")
        assert calculate_location_score(requester, candidate) == Decimal("0.00")


class TestScoreBreakdownTotal:
    def test_weighted_total_matches_expected_formula(self):
        breakdown = ScoreBreakdown(
            interest_score=Decimal("100.00"),
            personality_score=Decimal("50.00"),
            location_score=Decimal("0.00"),
            common_interests_count=2,
        )
        # 100*0.5 + 50*0.3 + 0*0.2 = 65.00
        assert breakdown.total_score == Decimal("65.00")


@pytest.mark.django_db
class TestProcessMatchingRequest:
    def _make_requester_with_interest(self, interest, location="Seoul", level=3):
        user = UserFactory(location=location)
        UserInterestFactory(user=user, interest=interest, level=level)
        return user

    def test_ranks_more_similar_candidate_first(self):
        interest = InterestFactory()
        requester = self._make_requester_with_interest(interest, location="Seoul", level=3)

        good_match = self._make_requester_with_interest(interest, location="Seoul", level=3)
        poor_match = UserFactory(location="Busan", is_active_for_matching=True)

        matching_request = MatchingRequest.objects.create(requester=requester, max_results=10)
        results = process_matching_request(matching_request)

        assert list(r.matched_user_id for r in results) == [good_match.id, poor_match.id]
        assert results[0].total_score > results[1].total_score

    def test_excludes_requester_and_inactive_users(self):
        interest = InterestFactory()
        requester = self._make_requester_with_interest(interest)
        UserFactory(is_active_for_matching=False)  # should never appear

        matching_request = MatchingRequest.objects.create(requester=requester, max_results=10)
        results = process_matching_request(matching_request)

        matched_ids = {r.matched_user_id for r in results}
        assert requester.id not in matched_ids
        assert len(results) == 0  # only the inactive user existed as a candidate

    def test_excludes_blocked_users(self):
        interest = InterestFactory()
        requester = self._make_requester_with_interest(interest)
        blocked_user = UserFactory(is_active_for_matching=True)
        Connection.objects.create(
            from_user=requester, to_user=blocked_user, status=Connection.StatusChoices.BLOCKED
        )

        matching_request = MatchingRequest.objects.create(requester=requester, max_results=10)
        results = process_matching_request(matching_request)

        assert blocked_user.id not in {r.matched_user_id for r in results}

    def test_respects_age_filter(self):
        import datetime

        interest = InterestFactory()
        requester = self._make_requester_with_interest(interest)
        today = datetime.date.today()

        too_young = UserFactory(date_of_birth=today.replace(year=today.year - 15))
        right_age = UserFactory(date_of_birth=today.replace(year=today.year - 25))

        matching_request = MatchingRequest.objects.create(
            requester=requester, min_age=18, max_age=99, max_results=10
        )
        results = process_matching_request(matching_request)

        matched_ids = {r.matched_user_id for r in results}
        assert too_young.id not in matched_ids
        assert right_age.id in matched_ids

    def test_limits_to_max_results(self):
        interest = InterestFactory()
        requester = self._make_requester_with_interest(interest)
        for _ in range(3):
            self._make_requester_with_interest(interest)

        matching_request = MatchingRequest.objects.create(requester=requester, max_results=2)
        results = process_matching_request(matching_request)

        assert len(results) == 2

    def test_marks_request_completed(self):
        interest = InterestFactory()
        requester = self._make_requester_with_interest(interest)

        matching_request = MatchingRequest.objects.create(requester=requester, max_results=10)
        process_matching_request(matching_request)

        matching_request.refresh_from_db()
        assert matching_request.status == MatchingRequest.StatusChoices.COMPLETED
        assert matching_request.completed_at is not None
