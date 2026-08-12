from rest_framework import serializers

from ..models import User
from .user import UserPersonalitySerializer


class AdminUserSerializer(serializers.ModelSerializer):
    """스태프 전용 사용자 목록/상세 — 읽기 전용.

    is_staff/is_superuser도 노출한다(누가 이미 관리자인지 보이는 건
    운영에 유용하다) — 하지만 이 시리얼라이저는 조회 전용이고, 실제
    변경 경로(AdminUserModerationSerializer)는 is_staff를 필드에서
    아예 뺐다. 권한 상승은 이 패널이 아니라 Django /admin/이나 shell
    에서만 하도록 의도적으로 좁혀둔 것.
    """

    personality = UserPersonalitySerializer(read_only=True)
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "age",
            "location",
            "bio",
            "profile_image",
            "is_profile_complete",
            "is_active",
            "is_active_for_matching",
            "is_staff",
            "is_superuser",
            "personality",
            "date_joined",
            "last_login",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminUserModerationSerializer(serializers.ModelSerializer):
    """계정 상태 변경 전용(PATCH). is_staff/is_superuser는 fields에 아예 없어서
    요청 바디에 섞여 들어와도 DRF가 조용히 무시한다 — 구조적으로 이
    엔드포인트로는 권한 상승이 불가능하다.
    """

    class Meta:
        model = User
        fields = ["is_active", "is_active_for_matching"]

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance == request.user and attrs.get("is_active") is False:
            raise serializers.ValidationError({"is_active": "본인 계정은 비활성화할 수 없습니다."})
        return attrs
