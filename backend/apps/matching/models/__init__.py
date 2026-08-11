# 모델이 늘어날수록 하나의 models.py에서 뭐가 어디 있는지 찾기 어려워져서
# 도메인별로 나눴다. 다른 모듈은 여전히 `from apps.matching.models import X`
# 그대로 쓰면 되도록, 실제 정의는 각 서브모듈에 두고 여기서 전부 재수출한다.
from .connection import Connection, Message
from .interest import Interest, InterestCategory, UserInterest
from .matching_request import MatchingRequest, MatchingResult

__all__ = [
    "Connection",
    "Message",
    "Interest",
    "InterestCategory",
    "UserInterest",
    "MatchingRequest",
    "MatchingResult",
]
