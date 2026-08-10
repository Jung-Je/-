from django.core.exceptions import ValidationError

import pytest

from apps.users.validators import PasswordComplexityValidator


class TestPasswordComplexityValidator:
    def setup_method(self):
        self.validator = PasswordComplexityValidator()

    @pytest.mark.parametrize(
        "password",
        [
            "LettersOnly",
            "12345678",
            "LettersAndDigits123",
            "letters-and-specials!",
            "12345678!@#",
        ],
    )
    def test_rejects_passwords_missing_a_character_class(self, password):
        with pytest.raises(ValidationError):
            self.validator.validate(password)

    @pytest.mark.parametrize(
        "password",
        [
            "S0me-Strong-Pass!23",
            "abc123!@#",
            "abc가나다123!",  # 한글이 섞여 있어도 영문+숫자+특수문자 조건만 만족하면 통과
        ],
    )
    def test_accepts_passwords_with_all_three_character_classes(self, password):
        self.validator.validate(password)  # 예외가 안 나면 통과
