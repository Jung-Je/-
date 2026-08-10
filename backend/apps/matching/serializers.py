from rest_framework import serializers

from apps.users.serializers import UserDetailSerializer

from .models import (
    Connection,
    Interest,
    InterestCategory,
    MatchingRequest,
    MatchingResult,
    Message,
    UserInterest,
)


class InterestCategorySerializer(serializers.ModelSerializer):
    """관심사 카테고리 시리얼라이저"""

    interests_count = serializers.SerializerMethodField()

    class Meta:
        model = InterestCategory
        fields = [
            "id",
            "name",
            "description",
            "icon",
            "interests_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_interests_count(self, obj):
        """카테고리 내 관심사 개수"""
        return obj.interests.count()


class InterestSerializer(serializers.ModelSerializer):
    """관심사 시리얼라이저"""

    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Interest
        fields = [
            "id",
            "category",
            "category_name",
            "name",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "category_name", "created_at", "updated_at"]


class UserInterestSerializer(serializers.ModelSerializer):
    """사용자 관심사 시리얼라이저"""

    interest_detail = InterestSerializer(source="interest", read_only=True)

    class Meta:
        model = UserInterest
        fields = [
            "id",
            "interest",
            "interest_detail",
            "level",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "interest_detail", "created_at", "updated_at"]


class UserInterestCreateSerializer(serializers.ModelSerializer):
    """사용자 관심사 추가 시리얼라이저"""

    class Meta:
        model = UserInterest
        fields = ["interest", "level"]

    def validate(self, attrs):
        """중복 관심사 확인"""
        user = self.context["request"].user
        interest = attrs["interest"]

        if UserInterest.objects.filter(user=user, interest=interest).exists():
            raise serializers.ValidationError({"interest": "이미 추가된 관심사입니다."})
        return attrs

    def create(self, validated_data):
        """사용자 관심사 생성"""
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class MatchingRequestSerializer(serializers.ModelSerializer):
    """매칭 요청 시리얼라이저"""

    requester_detail = UserDetailSerializer(source="requester", read_only=True)
    results_count = serializers.SerializerMethodField()

    class Meta:
        model = MatchingRequest
        fields = [
            "id",
            "requester",
            "requester_detail",
            "status",
            "min_age",
            "max_age",
            "preferred_location",
            "max_results",
            "results_count",
            "created_at",
            "updated_at",
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "requester",
            "requester_detail",
            "status",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def get_results_count(self, obj):
        """매칭 결과 개수"""
        return obj.results.count()

    def create(self, validated_data):
        """매칭 요청 생성"""
        validated_data["requester"] = self.context["request"].user
        return super().create(validated_data)


class MatchingResultSerializer(serializers.ModelSerializer):
    """매칭 결과 시리얼라이저"""

    matched_user_detail = UserDetailSerializer(source="matched_user", read_only=True)
    common_interests = serializers.SerializerMethodField()

    class Meta:
        model = MatchingResult
        fields = [
            "id",
            "request",
            "matched_user",
            "matched_user_detail",
            "total_score",
            "interest_score",
            "personality_score",
            "location_score",
            "common_interests_count",
            "common_interests",
            "matching_reason",
            "is_viewed",
            "is_contacted",
            "created_at",
            "viewed_at",
            "contacted_at",
        ]
        read_only_fields = [
            "id",
            "matched_user_detail",
            "common_interests",
            "created_at",
            "viewed_at",
            "contacted_at",
        ]

    def get_common_interests(self, obj):
        """공통 관심사 목록"""
        requester = obj.request.requester
        matched_user = obj.matched_user

        requester_interests = set(requester.user_interests.values_list("interest_id", flat=True))
        matched_interests = set(matched_user.user_interests.values_list("interest_id", flat=True))

        common_interest_ids = requester_interests & matched_interests
        common_interests = Interest.objects.filter(id__in=common_interest_ids)

        return InterestSerializer(common_interests, many=True).data


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
