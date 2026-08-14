from datetime import date

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import User, UserPersonality
from ..services import MAX_UPLOAD_SIZE


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
            "is_adult_verified",
            "is_staff",
            "personality",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "age",
            "is_adult_verified",
            "is_staff",
            "created_at",
            "updated_at",
        ]
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
            # DRF의 UniqueValidator 기본 메시지("사용자 with this 이메일 already
            # exists.")는 모델 verbose_name만 번역되고 나머지는 영어로 남아
            # 뒤섞이므로, 화면에 그대로 노출되는 두 필드는 메시지를 직접 준다.
            "email": {
                "required": True,
                "validators": [
                    UniqueValidator(
                        queryset=User.objects.all(), message="이미 사용 중인 이메일입니다."
                    )
                ],
            },
            "username": {
                "validators": [
                    UniqueValidator(
                        queryset=User.objects.all(), message="이미 사용 중인 닉네임입니다."
                    )
                ],
            },
        }

    def validate(self, attrs):
        """카카오 성인인증 세션 확인 + 비밀번호 확인 검증.

        성인인증이 진짜 방어선 — KakaoAgeVerificationView가 세션에 심어둔
        플래그를 여기서 다시 확인한다. 프론트가 인증 화면을 건너뛰고
        가입 API를 직접 호출해도 여기서 막힌다.
        """
        request = self.context["request"]
        if not request.session.get("kakao_age_verified"):
            raise serializers.ValidationError(
                {"kakao_verification": "카카오 성인인증을 먼저 완료해주세요."}
            )
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "비밀번호가 일치하지 않습니다."})
        return attrs

    def create(self, validated_data):
        """사용자 생성 + 카카오 인증 정보 저장.

        가입이 끝나면 세션의 인증 플래그를 지워서 1회성으로 소모한다 —
        같은 세션으로 계정을 여러 개 만들 수 없고, 다음 가입엔 다시
        카카오 인증을 거쳐야 한다.
        """
        request = self.context["request"]
        validated_data.pop("password_confirm")
        validated_data["kakao_id"] = request.session.get("kakao_verified_id")
        validated_data["is_adult_verified"] = True
        user = User.objects.create_user(**validated_data)

        for key in ("kakao_age_verified", "kakao_verified_id"):
            request.session.pop(key, None)

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

    def validate_profile_image(self, value):
        """업로드 자체를 막을 파일 크기 상한 확인 (실제 리사이즈/재인코딩은 User.save()에서 수행)"""
        if value and value.size > MAX_UPLOAD_SIZE:
            raise serializers.ValidationError(
                f"이미지 파일은 {MAX_UPLOAD_SIZE // (1024 * 1024)}MB를 초과할 수 없습니다."
            )
        return value

    def validate_date_of_birth(self, value):
        """미래 날짜 방지 — 프론트 온보딩 폼에 max 속성이 없어서 그대로
        보내면 User.age 프로퍼티가 음수를 반환하고("-1세" 등), 화면에
        가드 없이 그대로 노출된 사례가 있었음. 서버에서 원천 차단."""
        if value and value > date.today():
            raise serializers.ValidationError("생년월일은 미래 날짜일 수 없습니다.")
        return value


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
