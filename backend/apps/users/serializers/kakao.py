from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import User
from ..services import is_recently_verified
from .user import _validate_signup_date_of_birth


class KakaoSignupCompletionSerializer(serializers.Serializer):
    """카카오 소셜 가입의 마지막 단계 — KakaoLoginView가 signup_required를
    반환한 뒤, 부족한 정보(카카오가 안 준 닉네임/이메일, 그리고 카카오로는
    절대 못 받는 생년월일)를 마저 받아 계정을 만든다.

    비밀번호 필드가 없다 — 이 경로로 만든 계정은 카카오로만 로그인 가능
    (User.objects.create_user에 password=None을 넘기면 장고가 자동으로
    사용 불가능한 비밀번호로 설정한다).

    이메일 검증(validate() 참고) — UserCreateSerializer가 이메일 인증
    게이트 대상에서 카카오 가입을 빼준 전제는 "카카오 OAuth가 이미 이메일
    소유를 보증한다"는 것인데, 그건 실제로 제출된 email이 카카오가 준
    이메일 그 자체일 때만 성립한다. 검증 없이 그냥 받으면(코드 리뷰로
    발견) 프론트가 카카오 제공 이메일을 disabled로 잠가도 API를 직접
    호출해 임의의 미검증 이메일로 가입할 수 있는 구멍이었다.
    """

    username = serializers.CharField(
        validators=[
            UniqueValidator(queryset=User.objects.all(), message="이미 사용 중인 닉네임입니다.")
        ]
    )
    email = serializers.EmailField(
        validators=[
            UniqueValidator(queryset=User.objects.all(), message="이미 사용 중인 이메일입니다.")
        ]
    )
    date_of_birth = serializers.DateField()

    def validate_date_of_birth(self, value):
        return _validate_signup_date_of_birth(value)

    def validate(self, attrs):
        request = self.context["request"]
        kakao_email = request.session.get("kakao_pending_email")
        submitted_email = attrs["email"]

        if kakao_email:
            # 카카오가 이메일을 줬다면 그 이메일 그대로만 허용 — 프론트의
            # disabled 입력창은 이 서버 검증이 전제일 뿐, 강제하지 않으면
            # API 직접 호출로 다른 이메일을 끼워넣을 수 있다.
            if submitted_email.lower() != kakao_email.lower():
                raise serializers.ValidationError(
                    {"email": "카카오 계정 이메일과 일치해야 합니다."}
                )
        elif not is_recently_verified(submitted_email):
            # 카카오가 이메일을 안 줬을 때만 직접 입력을 허용하는데, 이
            # 경우엔 OAuth가 보증해주는 이메일이 아니므로 일반 회원가입
            # (UserCreateSerializer.validate)과 똑같이 이메일 인증
            # 게이트를 통과해야 한다.
            raise serializers.ValidationError({"email": "이메일 인증을 먼저 완료해주세요."})

        return attrs
