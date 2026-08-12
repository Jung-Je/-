# 다른 모듈은 여전히 `from apps.matching.serializers import X` 그대로 쓰면
# 되도록, 실제 정의는 도메인별 서브모듈에 두고 여기서 전부 재수출한다.
from .admin import (
    AdminConnectionSerializer,
    AdminConnectionStatusUpdateSerializer,
    AdminMessageSerializer,
)
from .connection import (
    ConnectionLastMessageSerializer,
    ConnectionResponseSerializer,
    ConnectionSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from .interest import (
    InterestCategorySerializer,
    InterestSerializer,
    UserInterestCreateSerializer,
    UserInterestSerializer,
)
from .matching_request import MatchingRequestSerializer, MatchingResultSerializer

__all__ = [
    "AdminConnectionSerializer",
    "AdminConnectionStatusUpdateSerializer",
    "AdminMessageSerializer",
    "ConnectionLastMessageSerializer",
    "ConnectionResponseSerializer",
    "ConnectionSerializer",
    "MessageCreateSerializer",
    "MessageSerializer",
    "InterestCategorySerializer",
    "InterestSerializer",
    "UserInterestCreateSerializer",
    "UserInterestSerializer",
    "MatchingRequestSerializer",
    "MatchingResultSerializer",
]
