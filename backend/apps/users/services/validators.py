import re
from datetime import date

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

# ASCII 특수문자(공백 제외) 전체 — string.punctuation과 동일
SPECIAL_CHARACTERS = r"""!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~"""

# 회원가입 최소 연령. 원래는 카카오 로그인 age_range 동의항목으로 실제
# 신원인증을 붙이려 했으나(연동 코드는 services/kakao.py에 남아있음),
# 그 동의항목이 "비즈니스 앱" 전환 + 사업자등록번호를 요구해서 이 프로젝트
# 규모에서는 막혀 자기신고 생년월일 + 최소연령 검증으로 전환했다.
MIN_ADULT_AGE = 19


def calculate_age(birth_date):
    """생년월일로부터 만 나이 계산. User.age 프로퍼티와 같은 로직인데,
    회원가입 시점엔 아직 User 인스턴스가 없어 프로퍼티를 못 쓰므로 여기
    별도로 둔다."""
    today = date.today()
    return (
        today.year
        - birth_date.year
        - ((today.month, today.day) < (birth_date.month, birth_date.day))
    )


def is_adult_birthdate(birth_date):
    """자기신고 생년월일이 회원가입 최소 연령(만 19세) 이상인지 확인."""
    return calculate_age(birth_date) >= MIN_ADULT_AGE


class PasswordComplexityValidator:
    """비밀번호에 영문·숫자·특수문자를 모두 포함하도록 강제한다.

    Django 기본 AUTH_PASSWORD_VALIDATORS(길이/공통 비밀번호/전부 숫자 여부)만으로는
    영문+숫자만 조합해도 통과돼서, 회원가입/비밀번호 변경/재설정 어디서도
    문자 종류 조합을 실제로 강제하지 못하고 있었다.
    """

    def validate(self, password, user=None):
        has_letter = re.search(r"[A-Za-z]", password) is not None
        has_digit = re.search(r"\d", password) is not None
        has_special = any(char in SPECIAL_CHARACTERS for char in password)

        if not (has_letter and has_digit and has_special):
            raise ValidationError(self.get_help_text(), code="password_no_complexity")

    def get_help_text(self):
        return _("비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.")
