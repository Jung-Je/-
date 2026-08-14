import logging

from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from ..models import Connection, Interest, InterestCategory, Message
from ..serializers import InterestCategorySerializer, InterestSerializer
from ..serializers.admin import (
    AdminConnectionSerializer,
    AdminConnectionStatusUpdateSerializer,
    AdminMessageSerializer,
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="[관리자] 전체 연결 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 연결 상세 조회", tags=["Admin"]),
)
class AdminConnectionViewSet(viewsets.ReadOnlyModelViewSet):
    """스태프 전용 연결·메시지 모더레이션. 참여자 상관없이 모든 연결을
    본다 — 소비자용 ConnectionViewSet.get_queryset()은 request.user가
    참여자인 것만 보여주므로 별도로 둔다.
    """

    permission_classes = [IsAdminUser]
    queryset = (
        Connection.objects.select_related("from_user", "to_user")
        .annotate(message_count=Count("messages"))
        .all()
    )
    serializer_class = AdminConnectionSerializer

    filterset_fields = ["status", "from_user", "to_user"]
    search_fields = ["from_user__username", "to_user__username", "message"]
    ordering_fields = ["created_at", "updated_at", "responded_at"]
    ordering = ["-created_at"]

    @extend_schema(summary="[관리자] 상태 강제 변경", tags=["Admin"])
    @action(detail=True, methods=["patch"], url_path="status")
    def override_status(self, request, pk=None):
        connection = self.get_object()
        serializer = AdminConnectionStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = connection.status
        connection.status = serializer.validated_data["status"]
        connection.save(update_fields=["status", "updated_at"])

        logger.info(
            "관리자 연결 상태 강제 변경: connection_id=%s %s -> %s actor_id=%s",
            connection.id,
            old_status,
            connection.status,
            request.user.id,
        )

        return Response(AdminConnectionSerializer(connection).data)

    @extend_schema(summary="[관리자] 메시지 이력 조회 (읽음 처리 없음)", tags=["Admin"])
    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        """소비자용 ConnectionViewSet.messages()와 달리 read_at을 절대
        건드리지 않는다 — 스태프가 들여다본다고 당사자의 안읽음 배지가
        줄면 안 됨.
        """
        connection = self.get_object()
        message_qs = connection.messages.select_related("sender")
        return Response(AdminMessageSerializer(message_qs, many=True).data)

    @extend_schema(summary="[관리자] 메시지 삭제", tags=["Admin"])
    @action(detail=True, methods=["delete"], url_path=r"messages/(?P<message_id>\d+)")
    def delete_message(self, request, pk=None, message_id=None):
        connection = self.get_object()
        # connection=connection으로 스코프 — 다른 연결의 message_id를 넣어도 404
        message = get_object_or_404(Message, pk=message_id, connection=connection)
        message.delete()

        logger.info(
            "관리자 메시지 삭제: connection_id=%s message_id=%s actor_id=%s",
            connection.id,
            message_id,
            request.user.id,
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(summary="[관리자] 관심사 카테고리 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 관심사 카테고리 상세 조회", tags=["Admin"]),
    create=extend_schema(summary="[관리자] 관심사 카테고리 생성", tags=["Admin"]),
    update=extend_schema(summary="[관리자] 관심사 카테고리 수정", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 관심사 카테고리 부분 수정", tags=["Admin"]),
    destroy=extend_schema(summary="[관리자] 관심사 카테고리 삭제", tags=["Admin"]),
)
class AdminInterestCategoryViewSet(viewsets.ModelViewSet):
    """스태프 전용 관심사 카테고리 관리. 민감 데이터가 없는 콘텐츠
    큐레이션이라 Phase 1(유저/연결)과 다르게 생성·삭제까지 전부 허용한다.
    소비자용 InterestCategorySerializer를 그대로 재사용 — 쓰기 제한이
    필요한 필드가 없어서 별도 Admin 시리얼라이저가 필요 없다. 카테고리
    삭제 시 소속 관심사는 모델의 on_delete=CASCADE로 같이 삭제됨(목록의
    interests_count로 영향 범위가 미리 보임). 캐시 무효화는
    signals.py의 모델 시그널이 저장/삭제마다 자동으로 처리한다.
    """

    permission_classes = [IsAdminUser]
    queryset = InterestCategory.objects.all()
    serializer_class = InterestCategorySerializer
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]


@extend_schema_view(
    list=extend_schema(summary="[관리자] 관심사 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 관심사 상세 조회", tags=["Admin"]),
    create=extend_schema(summary="[관리자] 관심사 생성", tags=["Admin"]),
    update=extend_schema(summary="[관리자] 관심사 수정", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 관심사 부분 수정", tags=["Admin"]),
    destroy=extend_schema(summary="[관리자] 관심사 삭제", tags=["Admin"]),
)
class AdminInterestViewSet(viewsets.ModelViewSet):
    """스태프 전용 관심사 관리. (category, name) unique_together가
    모델에 이미 있어서 중복 생성은 DRF가 자동으로 400 처리한다.
    """

    permission_classes = [IsAdminUser]
    queryset = Interest.objects.select_related("category").all()
    serializer_class = InterestSerializer
    filterset_fields = ["category"]
    search_fields = ["name", "description", "category__name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["category", "name"]
