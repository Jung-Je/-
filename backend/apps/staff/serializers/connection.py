from rest_framework import serializers

from apps.matching.models import Connection, Message
from apps.users.serializers import UserDetailSerializer


class AdminConnectionSerializer(serializers.ModelSerializer):
    """스태프 전용 연결 목록/상세 — 읽기 전용. 소비자용 ConnectionSerializer와
    달리 참여자 제한 없이(get_queryset이 전체 조회) 어떤 연결이든 보여준다.
    """

    from_user_detail = UserDetailSerializer(source="from_user", read_only=True)
    to_user_detail = UserDetailSerializer(source="to_user", read_only=True)
    message_count = serializers.IntegerField(read_only=True)  # 뷰의 .annotate() 소스

    class Meta:
        model = Connection
        fields = [
            "id",
            "from_user",
            "from_user_detail",
            "to_user",
            "to_user_detail",
            "status",
            "matching_result",
            "message",
            "message_count",
            "created_at",
            "updated_at",
            "responded_at",
        ]
        read_only_fields = fields


class AdminConnectionStatusUpdateSerializer(serializers.Serializer):
    """어느 상태로든 강제 전환 가능 — BLOCKED로 차단하는 게 주 용도지만,
    잘못 차단한 걸 되돌릴 수도 있어야 하므로 choices를 좁히지 않는다.
    """

    status = serializers.ChoiceField(choices=Connection.StatusChoices.choices)


class AdminMessageSerializer(serializers.ModelSerializer):
    """스태프 전용 메시지 조회 — 소비자용 MessageSerializer와 필드는
    동일하지만, 이걸로 조회한다고 read_at이 바뀌지는 않는다(뷰 참고).
    """

    sender_username = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "connection", "sender", "sender_username", "body", "created_at", "read_at"]
        read_only_fields = fields
