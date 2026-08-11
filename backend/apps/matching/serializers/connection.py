from rest_framework import serializers

from apps.users.serializers import UserDetailSerializer

from ..models import Connection, Message


class ConnectionLastMessageSerializer(serializers.ModelSerializer):
    """대화 목록에서 미리보기로 쓰는 축약 메시지 표현"""

    class Meta:
        model = Message
        fields = ["id", "sender", "body", "created_at"]


class ConnectionSerializer(serializers.ModelSerializer):
    """연결 시리얼라이저"""

    from_user_detail = UserDetailSerializer(source="from_user", read_only=True)
    to_user_detail = UserDetailSerializer(source="to_user", read_only=True)
    unread_message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

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
            "unread_message_count",
            "last_message",
            "created_at",
            "updated_at",
            "responded_at",
        ]
        read_only_fields = [
            "id",
            "from_user",
            "from_user_detail",
            "to_user_detail",
            "status",
            "unread_message_count",
            "last_message",
            "created_at",
            "updated_at",
            "responded_at",
        ]

    def get_unread_message_count(self, obj):
        """내가 아직 안 읽은, 상대방이 보낸 메시지 개수"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        return obj.messages.filter(read_at__isnull=True).exclude(sender=request.user).count()

    def get_last_message(self, obj):
        """대화 목록 미리보기용 — 가장 최근 메시지 하나"""
        message = obj.messages.order_by("-created_at").first()
        if message is None:
            return None
        return ConnectionLastMessageSerializer(message).data

    def validate(self, attrs):
        """중복 연결 확인 및 자기 자신에게 연결 방지"""
        from_user = self.context["request"].user
        to_user = attrs["to_user"]

        if from_user == to_user:
            raise serializers.ValidationError(
                {"to_user": "자기 자신에게 연결 요청을 보낼 수 없습니다."}
            )

        if Connection.objects.filter(from_user=from_user, to_user=to_user).exists():
            raise serializers.ValidationError({"to_user": "이미 연결 요청을 보냈습니다."})

        return attrs

    def create(self, validated_data):
        """연결 요청 생성"""
        validated_data["from_user"] = self.context["request"].user
        return super().create(validated_data)


class ConnectionResponseSerializer(serializers.Serializer):
    """연결 응답 시리얼라이저"""

    action = serializers.ChoiceField(
        choices=["accept", "reject", "block"],
        required=True,
    )

    def validate(self, attrs):
        """연결 상태 확인"""
        connection = self.context["connection"]

        if connection.status != Connection.StatusChoices.PENDING:
            raise serializers.ValidationError({"action": "이미 응답한 연결 요청입니다."})

        return attrs


class MessageSerializer(serializers.ModelSerializer):
    """메시지 조회용 시리얼라이저"""

    sender_username = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "connection",
            "sender",
            "sender_username",
            "body",
            "created_at",
            "read_at",
        ]
        read_only_fields = fields


class MessageCreateSerializer(serializers.ModelSerializer):
    """메시지 전송 시리얼라이저. connection/sender는 뷰에서 채운다."""

    class Meta:
        model = Message
        fields = ["body"]

    def validate_body(self, value):
        if not value.strip():
            raise serializers.ValidationError("메시지 내용을 입력하세요.")
        return value
