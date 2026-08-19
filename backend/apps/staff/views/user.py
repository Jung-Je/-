import logging

from rest_framework import viewsets
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.users.models import User

from ..serializers import AdminUserModerationSerializer, AdminUserSerializer
from .base import StaffPermissionMixin

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="[관리자] 사용자 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 사용자 상세 조회", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 계정 상태 변경", tags=["Admin"]),
)
class AdminUserViewSet(StaffPermissionMixin, viewsets.ModelViewSet):
    """스태프 전용 사용자 관리. is_staff/is_superuser 변경은 의도적으로
    미제공 — 권한 상승은 Django /admin/ 또는 shell에서만 하도록 범위를
    좁혔다(AdminUserModerationSerializer 참고).
    """

    queryset = User.objects.all().select_related("personality").order_by("-created_at")
    http_method_names = ["get", "patch", "head", "options"]  # 생성/삭제는 이 패널 범위 밖

    filterset_fields = ["is_active", "is_active_for_matching", "is_staff", "gender"]
    search_fields = ["username", "email", "location"]
    ordering_fields = ["created_at", "username", "date_joined", "last_login"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return AdminUserModerationSerializer
        return AdminUserSerializer

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(
            "관리자 사용자 상태 변경: target_user_id=%s actor_id=%s data=%s",
            instance.id,
            request.user.id,
            request.data,
        )

        return Response(AdminUserSerializer(instance).data)
