# 다른 모듈은 여전히 `from apps.staff.views import X` 그대로 쓰면
# 되도록, 실제 정의는 도메인별 서브모듈에 두고 여기서 전부 재수출한다.
from .connection import AdminConnectionViewSet
from .interest import AdminInterestCategoryViewSet, AdminInterestViewSet
from .matching_request import AdminMatchingRequestViewSet
from .user import AdminUserViewSet

__all__ = [
    "AdminConnectionViewSet",
    "AdminInterestCategoryViewSet",
    "AdminInterestViewSet",
    "AdminMatchingRequestViewSet",
    "AdminUserViewSet",
]
