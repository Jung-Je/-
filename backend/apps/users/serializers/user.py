from datetime import date

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import User, UserPersonality
from ..services import MAX_UPLOAD_SIZE, MIN_ADULT_AGE, is_adult_birthdate, is_recently_verified


def _validate_signup_date_of_birth(value):
    """미래 날짜 방지 + 최소 연령(만 19세) 검증 — 자기신고라 마음만
    먹으면 속일 수 있지만, 검증이 전혀 없던 것보다는 실질적 방어.
    UserCreateSerializer(이메일 가입)와 KakaoSignupCompletionSerializer
    (카카오 소셜 가입) 둘 다 같은 관문을 통과해야 하므로 여기 한 곳에
    모아두고 재사용한다."""
    if value > date.today():
        raise serializers.ValidationError("생년월일은 미래 날짜일 수 없습니다.")
    if not is_adult_birthdate(value):
        raise serializers.ValidationError(f"회원가입은 만 {MIN_ADULT_AGE}세 이상만 가능합니다.")
    return value


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
            "has_completed_onboarding",
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
            "is_profile_complete",
            "has_completed_onboarding",
            "is_adult_verified",
            "is_staff",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "email": {"required": True},
        }


class EmailVerificationRequestSerializer(serializers.Serializer):
    """이메일 인증 코드 요청. 회원가입 마지막 단계에서야 "이미 사용 중인
    이메일"이라는 걸 알게 되는 걸 막기 위해, 이 시점에도 같은 메시지로
    미리 거부한다 — UserCreateSerializer의 email UniqueValidator와
    문구를 맞춤."""

    email = serializers.EmailField()

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value


class EmailVerificationConfirmSerializer(serializers.Serializer):
    """이메일 인증 코드 확인. 실제 대조 로직은
    apps.users.services.email_verification.confirm_code가 담당 —
    여기는 입력 형식만 검증한다."""

    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)


class UserCreateSerializer(serializers.ModelSerializer):
    """사용자 생성 시리얼라이저.

    회원가입은 만 19세 이상만 가능. 원래는 카카오 로그인 age_range
    동의항목으로 실제 신원인증을 붙이려 했으나(연동 코드는
    apps/users/services/kakao.py, KakaoAgeVerificationView에 남아있음 —
    나중에 사업자등록을 하게 되면 다시 이 시리얼라이저에 연결하면 됨),
    그 동의항목이 "비즈니스 앱" 전환 + 사업자등록번호를 요구해서 이
    프로젝트 규모에서는 막혀 자기신고 생년월일 + 최소연령 검증으로
    전환했다.

    나이 인증과 별개로, 이메일이 실제로 존재/접근 가능한 주소인지는
    무료로 확인할 수 있어서(사용자 확정) 회원가입 자체를 이메일 인증
    완료 후로 막는다 — validate()에서 is_recently_verified()로 게이트.
    카카오 소셜 가입(KakaoSignupCompletionSerializer)은 카카오 OAuth가
    이미 이메일 소유를 보증하는 별도 신뢰 경로라 이 게이트 대상이 아님.
    """

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
            "date_of_birth",
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
            "date_of_birth": {"required": True},
        }

    def validate_date_of_birth(self, value):
        return _validate_signup_date_of_birth(value)

    def validate(self, attrs):
        """비밀번호 확인 + 이메일 인증 완료 여부 검증"""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "비밀번호가 일치하지 않습니다."})
        if not is_recently_verified(attrs["email"]):
            raise serializers.ValidationError({"email": "이메일 인증을 먼저 완료해주세요."})
        return attrs

    def create(self, validated_data):
        """사용자 생성. is_adult_verified는 여기까지 왔다는 것 자체가
        validate_date_of_birth를 통과했다는 뜻이라 True로 저장 — "진짜
        신원 확인"은 아니고 "가입 시점 최소연령 검증 통과"라는 뜻이다."""
        validated_data.pop("password_confirm")
        validated_data["is_adult_verified"] = True
        return User.objects.create_user(**validated_data)


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
        # date_of_birth는 가입 시(UserCreateSerializer/KakaoSignupCompletionSerializer)
        # 딱 한 번만 받고 최소연령을 검증한다. 예전엔 여기서도 수정을
        # 허용하고 미래 날짜·최소연령만 재검증했는데, 그러면 가입 때
        # 검증한 값과 다른(그러나 여전히 성인인) 값으로 조용히 덮어써서
        # "가입 시 자기신고 검증"이라는 전제 자체가 무의미해질 수 있었다
        # (사용자 리포트로 발견 — 온보딩 프로필 단계가 이 필드를 다시
        # 입력받고 있었음). 그래서 아예 읽기 전용으로 잠근다 — PATCH 바디에
        # 뭘 보내든 조용히 무시되고 원래 값이 유지된다(400을 던지진 않음,
        # 다른 필드와 같이 보내는 정상 요청까지 막을 이유는 없어서).
        read_only_fields = ["date_of_birth"]

    def validate_profile_image(self, value):
        """업로드 자체를 막을 파일 크기 상한 확인 (실제 리사이즈/재인코딩은 User.save()에서 수행)"""
        if value and value.size > MAX_UPLOAD_SIZE:
            raise serializers.ValidationError(
                f"이미지 파일은 {MAX_UPLOAD_SIZE // (1024 * 1024)}MB를 초과할 수 없습니다."
            )
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
