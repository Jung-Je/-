# 다른 모듈은 여전히 `from apps.matching.views import X` 그대로 쓰면
# 되도록, 실제 정의는 도메인별 서브모듈에 두고 여기서 전부 재수출한다.
from .admin import (
    AdminConnectionViewSet,
    AdminInterestCategoryViewSet,
    AdminInterestViewSet,
    AdminMatchingRequestViewSet,
)
from .connection import ConnectionViewSet
from .interest import InterestCategoryViewSet, InterestViewSet, UserInterestViewSet
from .matching_request import MatchingRequestViewSet, MatchingResultViewSet
from .notification_summary import NotificationSummaryView

__all__ = [
    "AdminConnectionViewSet",
    "AdminInterestCategoryViewSet",
    "AdminInterestViewSet",
    "AdminMatchingRequestViewSet",
    "ConnectionViewSet",
    "InterestCategoryViewSet",
    "InterestViewSet",
    "UserInterestViewSet",
    "MatchingRequestViewSet",
    "MatchingResultViewSet",
    "NotificationSummaryView",
]
