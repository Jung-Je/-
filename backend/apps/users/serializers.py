from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from .models import User, UserPersonality


class UserPersonalitySerializer(serializers.ModelSerializer):
    """사용자 성격 정보 시리얼라이저"""

    class Meta:
        model = UserPersonality
        fields = [
            "id",
            "mbti",
            "introvert_extrovert",
            "planning_spontaneous",
            "active_relaxed",
            "values_description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    """사용자 기본 정보 시리얼라이저"""

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
            "is_active_for_matching",
            "personality",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "age", "created_at", "updated_at"]
        extra_kwargs = {
            "email": {"required": True},
        }


class UserCreateSerializer(serializers.ModelSerializer):
    """사용자 생성 시리얼라이저"""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "email": {"required": True},
        }

    def validate(self, attrs):
        """비밀번호 확인 검증"""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "비밀번호가 일치하지 않습니다."})
        return attrs

    def create(self, validated_data):
        """사용자 생성"""
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """사용자 정보 수정 시리얼라이저"""

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "location",
            "bio",
            "profile_image",
            "is_active_for_matching",
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    """사용자 상세 정보 시리얼라이저 (매칭 결과 등에서 사용)"""

    personality = UserPersonalitySerializer(read_only=True)
    age = serializers.IntegerField(read_only=True)
    interests_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "gender",
            "age",
            "location",
            "bio",
            "profile_image",
            "personality",
            "interests_count",
        ]
        read_only_fields = ["id", "age"]

    def get_interests_count(self, obj):
        """사용자의 관심사 개수"""
        return obj.user_interests.count()


class PasswordChangeSerializer(serializers.Serializer):
    """비밀번호 변경 시리얼라이저"""

    old_password = serializers.CharField(required=True, style={"input_type": "password"})
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        """새 비밀번호 확인 검증"""
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "새 비밀번호가 일치하지 않습니다."}
            )
        return attrs

    def validate_old_password(self, value):
        """기존 비밀번호 확인"""
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("기존 비밀번호가 올바르지 않습니다.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """비밀번호 재설정 요청 시리얼라이저"""

    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """비밀번호 재설정 확인 시리얼라이저"""

    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        """새 비밀번호 확인 및 uid/token 검증"""
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "새 비밀번호가 일치하지 않습니다."}
            )

        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "유효하지 않은 사용자입니다."})

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "유효하지 않거나 만료된 토큰입니다."})

        attrs["user"] = user
        return attrs
