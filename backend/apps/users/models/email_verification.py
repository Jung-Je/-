from django.db import models


class EmailVerification(models.Model):
    """
    회원가입 전 이메일 소유 확인용 인증 코드.

    아직 계정이 생기기 전(회원가입 폼 작성 중)의 이메일 주소가 대상이라
    User와 FK로 엮이지 않는다 — 이메일 문자열 자체가 식별자.
    apps.users.services.email_verification 참고.
    """

    email = models.EmailField(db_index=True)
    # 6자리 코드를 User.password와 같은 방식(make_password)으로 해싱해
    # 저장 — DB가 그대로 노출돼도 코드가 평문으로 보이지 않게.
    code_hash = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    verified_at = models.DateTimeField(null=True, blank=True)
    # 코드 자체(확인 시도)의 유효시간. 인증에 성공한 뒤 회원가입을
    # 마칠 때까지 허용되는 시간은 이것과 별개로 더 길게 잡는다
    # (apps.users.services.email_verification.is_recently_verified).
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_verifications"
        verbose_name = "이메일 인증"
        verbose_name_plural = "이메일 인증"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.email} 인증 코드 ({self.created_at:%Y-%m-%d %H:%M})"
