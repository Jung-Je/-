from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import User
from .user import _validate_signup_date_of_birth


class KakaoSignupCompletionSerializer(serializers.Serializer):
    """카카오 소셜 가입의 마지막 단계 — KakaoLoginView가 signup_required를
    반환한 뒤, 부족한 정보(카카오가 안 준 닉네임/이메일, 그리고 카카오로는
    절대 못 받는 생년월일)를 마저 받아 계정을 만든다.

    비밀번호 필드가 없다 — 이 경로로 만든 계정은 카카오로만 로그인 가능
    (User.objects.create_user에 password=None을 넘기면 장고가 자동으로
    사용 불가능한 비밀번호로 설정한다).
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
