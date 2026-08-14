import logging
from dataclasses import dataclass
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from apps.users.models import User

from ..models import Connection, MatchingRequest, MatchingResult, UserInterest

logger = logging.getLogger(__name__)

# 최종 점수 가중치 (관심사 > 성격 > 위치)
INTEREST_WEIGHT = Decimal("0.5")
PERSONALITY_WEIGHT = Decimal("0.3")
LOCATION_WEIGHT = Decimal("0.2")

# 관심사 레벨(1~5), 성향 척도(1~5)의 최대 차이
SCALE_MAX_DIFF = Decimal("4")

MBTI_LENGTH = 4
NEUTRAL_PERSONALITY_SCORE = Decimal("50.00")
ZERO_SCORE = Decimal("0.00")
FULL_SCORE = Decimal("100.00")

PERSONALITY_TRAIT_FIELDS = ["introvert_extrovert", "planning_spontaneous", "active_relaxed"]


@dataclass
class ScoreBreakdown:
    interest_score: Decimal
    personality_score: Decimal
    location_score: Decimal
    common_interests_count: int

    @property
    def total_score(self) -> Decimal:
        weighted = (
            self.interest_score * INTEREST_WEIGHT
            + self.personality_score * PERSONALITY_WEIGHT
            + self.location_score * LOCATION_WEIGHT
        )
        return weighted.quantize(Decimal("0.01"))


def calculate_interest_score(requester_interests, candidate_interests):
    """공통 관심사 개수와 레벨 유사도를 기반으로 관심사 일치도 점수(0~100) 계산.

    requester_interests / candidate_interests: {interest_id: level} 형태의 dict
    """
    if not requester_interests:
        return ZERO_SCORE, 0

    common_ids = requester_interests.keys() & candidate_interests.keys()
    if not common_ids:
        return ZERO_SCORE, 0

    coverage = Decimal(len(common_ids)) / Decimal(len(requester_interests))

    level_similarities = [
        Decimal(1) - Decimal(abs(requester_interests[i] - candidate_interests[i])) / SCALE_MAX_DIFF
        for i in common_ids
    ]
    avg_level_similarity = sum(level_similarities) / Decimal(len(level_similarities))

    score = (coverage * Decimal("0.6") + avg_level_similarity * Decimal("0.4")) * FULL_SCORE
    return score.quantize(Decimal("0.01")), len(common_ids)


def calculate_personality_score(requester_personality, candidate_personality):
    """MBTI 일치도와 성향 척도 유사도를 기반으로 성격 호환성 점수(0~100) 계산.

    둘 중 하나라도 성격 정보가 없으면 중립 점수를 반환한다.
    """
    if requester_personality is None or candidate_personality is None:
        return NEUTRAL_PERSONALITY_SCORE

    components = []

    if requester_personality.mbti and candidate_personality.mbti:
        matches = sum(
            1 for a, b in zip(requester_personality.mbti, candidate_personality.mbti) if a == b
        )
        components.append((Decimal(matches) / Decimal(MBTI_LENGTH), Decimal("0.4")))

    trait_similarities = []
    for field in PERSONALITY_TRAIT_FIELDS:
        requester_value = getattr(requester_personality, field)
        candidate_value = getattr(candidate_personality, field)
        if requester_value is not None and candidate_value is not None:
            trait_similarities.append(
                Decimal(1) - Decimal(abs(requester_value - candidate_value)) / SCALE_MAX_DIFF
            )

    if trait_similarities:
        avg_trait_similarity = sum(trait_similarities) / Decimal(len(trait_similarities))
        components.append((avg_trait_similarity, Decimal("0.6")))

    if not components:
        return NEUTRAL_PERSONALITY_SCORE

    total_weight = sum(weight for _, weight in components)
    weighted_sum = sum(similarity * weight for similarity, weight in components)
    score = (weighted_sum / total_weight) * FULL_SCORE
    return score.quantize(Decimal("0.01"))


def calculate_location_score(requester, candidate):
    """같은 지역이면 만점, 아니면 0점 (지역 정보가 없으면 0점)."""
    if not requester.location or not candidate.location:
        return ZERO_SCORE
    if requester.location.strip().lower() == candidate.location.strip().lower():
        return FULL_SCORE
    return ZERO_SCORE


def _passes_age_filter(user: User, matching_request: MatchingRequest) -> bool:
    if matching_request.min_age is None and matching_request.max_age is None:
        return True

    age = user.age
    if age is None:
        return False
    if matching_request.min_age is not None and age < matching_request.min_age:
        return False
    if matching_request.max_age is not None and age > matching_request.max_age:
        return False
    return True


def _get_candidate_queryset(matching_request: MatchingRequest):
    """매칭 후보 사용자 조회 (요청자 본인, 차단 관계, 관리자 계정 제외).

    관리자(is_staff/is_superuser) 계정은 createsuperuser로 생성돼도
    is_active_for_matching 기본값이 True라 걸러내지 않으면 일반 유저와
    똑같이 매칭 후보로 나온다 — 실제 매칭 대상이 아니므로 명시적으로 제외.
    """
    requester = matching_request.requester

    blocked_pairs = Connection.objects.filter(
        Q(from_user=requester, status=Connection.StatusChoices.BLOCKED)
        | Q(to_user=requester, status=Connection.StatusChoices.BLOCKED)
    ).values_list("from_user_id", "to_user_id")

    excluded_ids = {requester.id}
    for from_id, to_id in blocked_pairs:
        excluded_ids.add(from_id)
        excluded_ids.add(to_id)

    return (
        User.objects.filter(is_active_for_matching=True, is_staff=False, is_superuser=False)
        .exclude(id__in=excluded_ids)
        .select_related("personality")
        .prefetch_related("user_interests")
    )


def process_matching_request(matching_request: MatchingRequest) -> list[MatchingResult]:
    """매칭 요청을 처리하여 점수 상위 N명의 MatchingResult를 생성한다."""
    logger.info(
        "매칭 요청 처리 시작: request_id=%s requester_id=%s",
        matching_request.id,
        matching_request.requester_id,
    )

    matching_request.status = MatchingRequest.StatusChoices.PROCESSING
    matching_request.save(update_fields=["status", "updated_at"])

    requester = matching_request.requester
    requester_interests = dict(
        UserInterest.objects.filter(user=requester).values_list("interest_id", "level")
    )
    requester_personality = getattr(requester, "personality", None)

    scored_candidates = []
    for candidate in _get_candidate_queryset(matching_request):
        if not _passes_age_filter(candidate, matching_request):
            continue

        candidate_interests = {ui.interest_id: ui.level for ui in candidate.user_interests.all()}

        interest_score, common_count = calculate_interest_score(
            requester_interests, candidate_interests
        )
        personality_score = calculate_personality_score(
            requester_personality, getattr(candidate, "personality", None)
        )
        location_score = calculate_location_score(requester, candidate)

        breakdown = ScoreBreakdown(
            interest_score=interest_score,
            personality_score=personality_score,
            location_score=location_score,
            common_interests_count=common_count,
        )
        scored_candidates.append((candidate, breakdown))

    scored_candidates.sort(key=lambda pair: pair[1].total_score, reverse=True)
    top_candidates = scored_candidates[: matching_request.max_results]

    results = MatchingResult.objects.bulk_create(
        MatchingResult(
            request=matching_request,
            matched_user=candidate,
            total_score=breakdown.total_score,
            interest_score=breakdown.interest_score,
            personality_score=breakdown.personality_score,
            location_score=breakdown.location_score,
            common_interests_count=breakdown.common_interests_count,
        )
        for candidate, breakdown in top_candidates
    )

    matching_request.status = MatchingRequest.StatusChoices.COMPLETED
    matching_request.completed_at = timezone.now()
    matching_request.save(update_fields=["status", "completed_at", "updated_at"])

    logger.info(
        "매칭 요청 처리 완료: request_id=%s candidates=%d results=%d",
        matching_request.id,
        len(scored_candidates),
        len(results),
    )

    return results
