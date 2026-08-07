import logging

from django.db import models
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from .caching import cache_response
from .models import (
    Connection,
    Interest,
    InterestCategory,
    MatchingRequest,
    MatchingResult,
    UserInterest,
)
from .notifications import notify_connection_accepted, notify_connection_requested
from .serializers import (
    ConnectionResponseSerializer,
    ConnectionSerializer,
    InterestCategorySerializer,
    InterestSerializer,
    MatchingRequestSerializer,
    MatchingResultSerializer,
    UserInterestCreateSerializer,
    UserInterestSerializer,
)
from .services import process_matching_request

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="관심사 카테고리 목록 조회", tags=["Interest Categories"]),
    retrieve=extend_schema(summary="관심사 카테고리 상세 조회", tags=["Interest Categories"]),
)
class InterestCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """관심사 카테고리 ViewSet (읽기 전용)"""

    queryset = InterestCategory.objects.all()
    serializer_class = InterestCategorySerializer
    permission_classes = [IsAuthenticated]

    @cache_response("interest_categories")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @cache_response("interest_categories")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


@extend_schema_view(
    list=extend_schema(summary="관심사 목록 조회", tags=["Interests"]),
    retrieve=extend_schema(summary="관심사 상세 조회", tags=["Interests"]),
)
class InterestViewSet(viewsets.ReadOnlyModelViewSet):
    """관심사 ViewSet (읽기 전용)"""

    queryset = Interest.objects.select_related("category").all()
    serializer_class = InterestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category"]
    search_fields = ["name", "description"]

    @cache_response("interests")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @cache_response("interests")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


@extend_schema_view(
    list=extend_schema(summary="내 관심사 목록 조회", tags=["User Interests"]),
    retrieve=extend_schema(summary="내 관심사 상세 조회", tags=["User Interests"]),
    create=extend_schema(summary="관심사 추가", tags=["User Interests"]),
    update=extend_schema(summary="관심사 수정", tags=["User Interests"]),
    partial_update=extend_schema(summary="관심사 부분 수정", tags=["User Interests"]),
    destroy=extend_schema(summary="관심사 삭제", tags=["User Interests"]),
)
class UserInterestViewSet(viewsets.ModelViewSet):
    """사용자 관심사 ViewSet"""

    queryset = UserInterest.objects.select_related("interest", "interest__category").all()
    serializer_class = UserInterestSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """액션별 시리얼라이저 설정"""
        if self.action == "create":
            return UserInterestCreateSerializer
        return UserInterestSerializer

    def get_queryset(self):
        """현재 사용자의 관심사만 조회"""
        return UserInterest.objects.filter(user=self.request.user).select_related(
            "interest", "interest__category"
        )


@extend_schema_view(
    list=extend_schema(summary="내 매칭 요청 목록 조회", tags=["Matching Requests"]),
    retrieve=extend_schema(summary="매칭 요청 상세 조회", tags=["Matching Requests"]),
    create=extend_schema(summary="매칭 요청 생성", tags=["Matching Requests"]),
)
class MatchingRequestViewSet(viewsets.ModelViewSet):
    """매칭 요청 ViewSet"""

    queryset = MatchingRequest.objects.select_related("requester").all()
    serializer_class = MatchingRequestSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]  # PUT, PATCH, DELETE 비활성화

    def get_queryset(self):
        """현재 사용자의 매칭 요청만 조회"""
        return MatchingRequest.objects.filter(requester=self.request.user).select_related(
            "requester"
        )

    def perform_create(self, serializer):
        """매칭 요청 생성 직후 매칭 알고리즘 실행"""
        matching_request = serializer.save()
        process_matching_request(matching_request)

    @extend_schema(
        summary="매칭 요청 취소",
        tags=["Matching Requests"],
    )
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """매칭 요청 취소"""
        matching_request = self.get_object()

        if matching_request.status not in [
            MatchingRequest.StatusChoices.PENDING,
            MatchingRequest.StatusChoices.PROCESSING,
        ]:
            return Response(
                {"detail": "취소할 수 없는 상태입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        matching_request.status = MatchingRequest.StatusChoices.CANCELLED
        matching_request.save(update_fields=["status", "updated_at"])

        logger.info("매칭 요청 취소: request_id=%s", matching_request.id)

        serializer = self.get_serializer(matching_request)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(summary="매칭 결과 목록 조회", tags=["Matching Results"]),
    retrieve=extend_schema(summary="매칭 결과 상세 조회", tags=["Matching Results"]),
)
class MatchingResultViewSet(viewsets.ReadOnlyModelViewSet):
    """매칭 결과 ViewSet (읽기 전용)"""

    queryset = MatchingResult.objects.select_related(
        "request", "request__requester", "matched_user"
    ).all()
    serializer_class = MatchingResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """현재 사용자의 매칭 결과만 조회"""
        return MatchingResult.objects.filter(request__requester=self.request.user).select_related(
            "request", "request__requester", "matched_user"
        )

    def retrieve(self, request, *args, **kwargs):
        """매칭 결과 조회 시 viewed 상태 업데이트"""
        instance = self.get_object()

        if not instance.is_viewed:
            instance.is_viewed = True
            instance.viewed_at = timezone.now()
            instance.save(update_fields=["is_viewed", "viewed_at"])

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


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
        """연결 요청 생성 시 상대방에게 이메일 알림"""
        connection = serializer.save()
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
