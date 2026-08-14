import logging

from django.db import models
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from ..models import Connection, MatchingResult, Message
from ..serializers import (
    ConnectionResponseSerializer,
    ConnectionSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from ..services import notify_connection_accepted, notify_connection_requested

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="연결 목록 조회", tags=["Connections"]),
    retrieve=extend_schema(summary="연결 상세 조회", tags=["Connections"]),
    create=extend_schema(summary="연결 요청 생성", tags=["Connections"]),
)
class ConnectionViewSet(viewsets.ModelViewSet):
    """연결 ViewSet"""

    queryset = Connection.objects.select_related("from_user", "to_user").all()
    serializer_class = ConnectionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]  # PUT, PATCH, DELETE 비활성화

    def get_queryset(self):
        """현재 사용자와 관련된 연결만 조회"""
        user = self.request.user
        return Connection.objects.filter(
            models.Q(from_user=user) | models.Q(to_user=user)
        ).select_related("from_user", "to_user")

    def perform_create(self, serializer):
        """연결 요청 생성 시 상대방에게 이메일 알림.

        연결이 특정 매칭 결과에서 시작된 경우, 그 결과를 연결 시도됨으로
        표시한다 — is_contacted/contacted_at은 모델에 있을 뿐 이전까지
        어디서도 세팅되지 않던 필드였다.
        """
        connection = serializer.save()

        if connection.matching_result_id:
            MatchingResult.objects.filter(id=connection.matching_result_id).update(
                is_contacted=True, contacted_at=timezone.now()
            )

        logger.info(
            "연결 요청 생성: connection_id=%s from_user_id=%s to_user_id=%s",
            connection.id,
            connection.from_user_id,
            connection.to_user_id,
        )
        notify_connection_requested(connection)

    @extend_schema(
        summary="받은 연결 요청 목록",
        tags=["Connections"],
    )
    @action(detail=False, methods=["get"])
    def received(self, request):
        """받은 연결 요청 목록"""
        connections = Connection.objects.filter(
            to_user=request.user, status=Connection.StatusChoices.PENDING
        ).select_related("from_user", "to_user")

        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="보낸 연결 요청 목록",
        tags=["Connections"],
    )
    @action(detail=False, methods=["get"])
    def sent(self, request):
        """보낸 연결 요청 목록"""
        connections = Connection.objects.filter(from_user=request.user).select_related(
            "from_user", "to_user"
        )

        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="연결 요청 응답 (수락/거절/차단)",
        tags=["Connections"],
        request=ConnectionResponseSerializer,
    )
    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """연결 요청에 대한 응답"""
        connection = self.get_object()

        # 요청 받은 사용자만 응답 가능
        if connection.to_user != request.user:
            return Response(
                {"detail": "권한이 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ConnectionResponseSerializer(
            data=request.data, context={"connection": connection}
        )
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data["action"]

        # 상태 업데이트
        status_map = {
            "accept": Connection.StatusChoices.ACCEPTED,
            "reject": Connection.StatusChoices.REJECTED,
            "block": Connection.StatusChoices.BLOCKED,
        }

        connection.status = status_map[action_type]
        connection.responded_at = timezone.now()
        connection.save(update_fields=["status", "responded_at", "updated_at"])

        logger.info("연결 요청 응답: connection_id=%s action=%s", connection.id, action_type)

        if action_type == "accept":
            notify_connection_accepted(connection)

        return Response(self.get_serializer(connection).data)

    @extend_schema(
        summary="대화 메시지 목록 조회 / 전송",
        tags=["Connections"],
        request=MessageCreateSerializer,
        responses={200: MessageSerializer(many=True), 201: MessageSerializer},
    )
    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        """연결의 메시지 목록 조회 및 전송.

        get_object()가 get_queryset()(참여자만) 기준으로 조회하므로
        무관한 사용자는 이미 404. 여기서는 수락된 연결인지만 추가로
        확인한다 — 대화방을 따로 두지 않고 Connection을 그대로 쓰므로
        연결이 수락 상태일 때만 메시지를 주고받을 수 있다.
        """
        connection = self.get_object()

        if connection.status != Connection.StatusChoices.ACCEPTED:
            return Response(
                {"detail": "수락된 연결에서만 메시지를 주고받을 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.method == "POST":
            serializer = MessageCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            message = Message.objects.create(
                connection=connection,
                sender=request.user,
                body=serializer.validated_data["body"],
            )
            logger.info(
                "메시지 전송: connection_id=%s sender_id=%s", connection.id, request.user.id
            )
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

        # GET: 조회와 동시에 상대방이 보낸 안 읽은 메시지를 읽음 처리한다
        # (MatchingResult.retrieve가 is_viewed를 세팅하는 것과 같은 패턴).
        Message.objects.filter(connection=connection, read_at__isnull=True).exclude(
            sender=request.user
        ).update(read_at=timezone.now())

        message_qs = connection.messages.select_related("sender")
        serializer = MessageSerializer(message_qs, many=True)
        return Response(serializer.data)
