import logging

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Inquiry
from .serializers import InquirySerializer

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="내 문의 목록 조회", tags=["Support"]),
    retrieve=extend_schema(summary="내 문의 상세 조회", tags=["Support"]),
    create=extend_schema(summary="문의/신고/건의 작성", tags=["Support"]),
)
class InquiryViewSet(viewsets.ModelViewSet):
    """유저가 관리자에게 남기는 문의/신고/건의. 본인이 작성한 것만
    조회할 수 있고, 수정·삭제는 지원하지 않는다(작성 후 정정하고 싶으면
    새로 작성 — 관리자 처리 이력이 바뀌는 걸 막기 위함). 상태 변경은
    스태프 전용(apps.staff.views.AdminInquiryViewSet)에서만 가능."""

    permission_classes = [IsAuthenticated]
    serializer_class = InquirySerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Inquiry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        inquiry = serializer.save(user=self.request.user)
        logger.info(
            "문의 작성: inquiry_id=%s user_id=%s category=%s",
            inquiry.id,
            self.request.user.id,
            inquiry.category,
        )
