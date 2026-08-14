from rest_framework import serializers

from ..models import Interest, InterestCategory, UserInterest


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
