# 비즈니스 로직(매칭 채점 알고리즘, 알림 발송)을 뷰/시리얼라이저와
# 분리해두는 곳. 도메인별 서비스가 늘어나도 같은 자리에 파일만 추가하면
# 되도록 패키지로 만들어뒀다.
from .matching import (
    ScoreBreakdown,
    calculate_interest_score,
    calculate_location_score,
    calculate_personality_score,
    process_matching_request,
)
from .notifications import notify_connection_accepted, notify_connection_requested

__all__ = [
    "ScoreBreakdown",
    "calculate_interest_score",
    "calculate_location_score",
    "calculate_personality_score",
    "process_matching_request",
    "notify_connection_accepted",
    "notify_connection_requested",
]
