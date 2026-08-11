from rest_framework import serializers

from apps.users.serializers import UserDetailSerializer

from ..models import Interest, MatchingRequest, MatchingResult
from .interest import InterestSerializer


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
