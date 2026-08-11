import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

# ASCII 특수문자(공백 제외) 전체 — string.punctuation과 동일
SPECIAL_CHARACTERS = r"""!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~"""


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
