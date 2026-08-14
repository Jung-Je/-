import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.matching.models import MatchingRequest
from apps.matching.serializers import MatchingRequestSerializer, MatchingResultSerializer

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="[관리자] 전체 매칭 요청 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 매칭 요청 상세 조회", tags=["Admin"]),
)
class AdminMatchingRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """스태프 전용 매칭 요청 조회. 소비자용 MatchingRequestViewSet은
    requester=request.user로 좁혀져 있어서 자기 요청만 보이는데, 여기는
    참여자 제한 없이 전체를 본다. 소비자용 MatchingRequestSerializer를
    그대로 재사용 — 쓰기(생성/수정)는 이 뷰셋이 지원하지 않아서
    read_only_fields가 requester/status를 막고 있는 건 문제되지 않는다.
    """

    permission_classes = [IsAdminUser]
    queryset = MatchingRequest.objects.select_related("requester").all()
    serializer_class = MatchingRequestSerializer
    filterset_fields = ["status"]
    search_fields = ["requester__username", "requester__email", "preferred_location"]
    ordering_fields = ["created_at", "completed_at"]
    ordering = ["-created_at"]

    @extend_schema(summary="[관리자] 매칭 요청 취소", tags=["Admin"])
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """admin.py의 mark_as_cancelled 액션과 같은 규칙(완료된 요청은
        취소 불가) — 다만 대량 액션이 아니라 상세 화면의 행 단위 액션."""
        matching_request = self.get_object()

        if matching_request.status == MatchingRequest.StatusChoices.COMPLETED:
            return Response(
                {"detail": "완료된 요청은 취소할 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        matching_request.status = MatchingRequest.StatusChoices.CANCELLED
        matching_request.save(update_fields=["status", "updated_at"])

        logger.info(
            "관리자 매칭 요청 취소: request_id=%s actor_id=%s",
            matching_request.id,
            request.user.id,
        )

        return Response(MatchingRequestSerializer(matching_request).data)

    @extend_schema(summary="[관리자] 매칭 결과 목록 조회", tags=["Admin"])
    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        matching_request = self.get_object()
        result_qs = matching_request.results.select_related("matched_user")
        return Response(MatchingResultSerializer(result_qs, many=True).data)
