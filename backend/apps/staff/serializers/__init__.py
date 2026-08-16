# 다른 모듈은 여전히 `from apps.staff.serializers import X` 그대로 쓰면
# 되도록, 실제 정의는 도메인별 서브모듈에 두고 여기서 전부 재수출한다.
from .board import AdminCommentSerializer, AdminPostSerializer
from .connection import (
    AdminConnectionSerializer,
    AdminConnectionStatusUpdateSerializer,
    AdminMessageSerializer,
)
from .inquiry import (
    AdminInquiryReplySerializer,
    AdminInquirySerializer,
    AdminInquiryStatusSerializer,
)
from .user import AdminUserModerationSerializer, AdminUserSerializer

__all__ = [
    "AdminCommentSerializer",
    "AdminPostSerializer",
    "AdminConnectionSerializer",
    "AdminConnectionStatusUpdateSerializer",
    "AdminMessageSerializer",
    "AdminInquiryReplySerializer",
    "AdminInquirySerializer",
    "AdminInquiryStatusSerializer",
    "AdminUserModerationSerializer",
    "AdminUserSerializer",
]
