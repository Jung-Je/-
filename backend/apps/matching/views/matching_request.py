import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from ..models import MatchingRequest, MatchingResult
from ..serializers import MatchingRequestSerializer, MatchingResultSerializer
from ..services import process_matching_request

logger = logging.getLogger(__name__)


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

    # "매칭 시작" 버튼은 제출 중 비활성화되지만, 그래도 짧은 간격으로 POST가
    # 두 번 도착해 결과 없는 중복 MatchingRequest("가상 티켓")가 남는 사례가
    # 실제로 있었다 — 느린 네트워크·연속 클릭 등 프론트에서 완전히 막기
    # 어려운 경우에 대비해 백엔드에서도 짧은 시간 내 중복 생성을 막는다.
    DUPLICATE_REQUEST_WINDOW = timedelta(seconds=5)

    def get_queryset(self):
        """현재 사용자의 매칭 요청만 조회"""
        return MatchingRequest.objects.filter(requester=self.request.user).select_related(
            "requester"
        )

    def create(self, request, *args, **kwargs):
        recent_cutoff = timezone.now() - self.DUPLICATE_REQUEST_WINDOW
        recent_request = (
            MatchingRequest.objects.filter(requester=request.user, created_at__gte=recent_cutoff)
            .order_by("-created_at")
            .first()
        )
        if recent_request is not None:
            logger.info(
                "중복 매칭 요청 생성 차단: requester_id=%s existing_request_id=%s",
                request.user.id,
                recent_request.id,
            )
            serializer = self.get_serializer(recent_request)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

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
