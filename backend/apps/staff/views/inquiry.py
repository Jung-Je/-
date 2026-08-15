import logging

from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.support.models import Inquiry

from ..serializers import AdminInquirySerializer, AdminInquiryStatusSerializer

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="[관리자] 문의/신고/건의 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 문의 상세 조회", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 문의 처리 상태 변경", tags=["Admin"]),
)
class AdminInquiryViewSet(viewsets.ModelViewSet):
    """스태프 전용 문의/신고/건의 관리. 소비자용 InquiryViewSet은
    본인 것만 보이는데, 여기는 작성자 무관하게 전체를 본다. 상태
    변경(PATCH)만 지원 — 답장 기능은 없음(Phase 1)."""

    permission_classes = [IsAdminUser]
    queryset = Inquiry.objects.select_related("user").all()
    http_method_names = ["get", "patch", "head", "options"]

    filterset_fields = ["status", "category"]
    search_fields = ["title", "content", "user__username", "user__email"]
    ordering_fields = ["created_at", "resolved_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return AdminInquiryStatusSerializer
        return AdminInquirySerializer

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(
            "관리자 문의 상태 변경: inquiry_id=%s actor_id=%s status=%s",
            instance.id,
            request.user.id,
            instance.status,
        )

        return Response(AdminInquirySerializer(instance).data)
