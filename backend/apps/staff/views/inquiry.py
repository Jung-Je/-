import logging

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.support.models import Inquiry

from ..serializers import (
    AdminInquiryReplySerializer,
    AdminInquirySerializer,
    AdminInquiryStatusSerializer,
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="[관리자] 문의/신고/건의 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 문의 상세 조회", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 문의 처리 상태 변경", tags=["Admin"]),
)
class AdminInquiryViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """스태프 전용 문의/신고/건의 관리. 소비자용 InquiryViewSet은
    본인 것만 보이는데, 여기는 작성자 무관하게 전체를 본다. 생성·삭제는
    지원 안 함 — ModelViewSet 대신 필요한 mixin만 조합해서 create/destroy
    자체가 라우팅되지 않게 했다(AdminMatchingRequestViewSet과 같은
    이유로, http_method_names만으로 막는 것보다 더 명확함)."""

    permission_classes = [IsAdminUser]
    queryset = Inquiry.objects.select_related("user").all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    filterset_fields = ["status", "category"]
    search_fields = ["title", "content", "user__username", "user__email"]
    ordering_fields = ["created_at", "resolved_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return AdminInquiryStatusSerializer
        if self.action == "reply":
            return AdminInquiryReplySerializer
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

    @extend_schema(summary="[관리자] 문의 답변 작성/수정", tags=["Admin"])
    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        """문의당 답변 1개(사용자 확정) — 이미 답변이 있어도 그냥
        덮어쓴다(별도 이력 없음). 빈 문자열이 아닌 답변을 저장하면
        AdminInquiryReplySerializer가 자동으로 처리완료 상태까지
        전환한다."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(
            "관리자 문의 답변 작성: inquiry_id=%s actor_id=%s",
            instance.id,
            request.user.id,
        )

        return Response(AdminInquirySerializer(instance).data)
