from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from ..models import Connection, MatchingResult, Message


@extend_schema(
    summary="알림 요약 (안 읽은 매칭 결과·받은 연결 요청·안 읽은 메시지 수)",
    tags=["Notifications"],
)
class NotificationSummaryView(APIView):
    """AppNav의 매칭/연결/메시지 탭 배지에 쓰는 가벼운 카운트 전용 엔드포인트.

    매칭 결과·연결 요청·메시지 목록을 통째로 불러오지 않고 개수만
    필요할 때(내비게이션 바는 모든 화면에 떠 있어서 주기적으로 폴링한다)
    쓰라고 따로 뺐다. is_viewed/PENDING/read_at 전부 이미 있는 필드·
    상태라 새 모델 변경 없이 집계만 한다.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        unviewed_matching_results = MatchingResult.objects.filter(
            request__requester=user, is_viewed=False
        ).count()
        pending_connection_requests = Connection.objects.filter(
            to_user=user, status=Connection.StatusChoices.PENDING
        ).count()
        # 내가 참여자인 연결에서, 내가 안 보낸(=상대가 보낸) 메시지 중
        # 아직 안 읽은 것. read_at은 스레드를 열어서 GET하는 순간
        # ConnectionViewSet.messages()가 채운다 — 그때 자연히 줄어든다.
        unread_messages = (
            Message.objects.filter(Q(connection__from_user=user) | Q(connection__to_user=user))
            .filter(read_at__isnull=True)
            .exclude(sender=user)
            .count()
        )

        return Response(
            {
                "unviewed_matching_results": unviewed_matching_results,
                "pending_connection_requests": pending_connection_requests,
                "unread_messages": unread_messages,
            }
        )
