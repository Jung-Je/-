import logging
import random
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.utils import timezone

from ..models import EmailVerification

logger = logging.getLogger(__name__)

CODE_LENGTH = 6
CODE_EXPIRY_MINUTES = 10
RESEND_COOLDOWN_SECONDS = 60
MAX_ATTEMPTS = 5
# 코드 자체는 10분이면 만료되지만, 인증에 성공한 뒤 회원가입 나머지
# 필드를 채우는 데는 더 시간이 걸릴 수 있어 별도로 더 길게 잡는다.
VERIFIED_VALIDITY_HOURS = 1


class CooldownError(Exception):
    """재전송 쿨다운(RESEND_COOLDOWN_SECONDS) 안에 다시 요청했을 때."""

    def __init__(self, wait_seconds: int):
        self.wait_seconds = wait_seconds
        super().__init__(f"{wait_seconds}초 후 다시 시도해주세요.")


def _generate_code() -> str:
    return f"{random.randint(0, 10**CODE_LENGTH - 1):0{CODE_LENGTH}d}"


def generate_and_send_code(email: str) -> None:
    """인증 코드를 생성해 이메일로 발송한다. 마지막 발송이
    RESEND_COOLDOWN_SECONDS 이내면 CooldownError를 던진다."""
    latest = EmailVerification.objects.filter(
        email__iexact=email
    ).first()  # Meta.ordering = -created_at
    if latest is not None:
        elapsed = (timezone.now() - latest.created_at).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            raise CooldownError(wait_seconds=int(RESEND_COOLDOWN_SECONDS - elapsed))

    code = _generate_code()
    EmailVerification.objects.create(
        email=email,
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(minutes=CODE_EXPIRY_MINUTES),
    )
    send_mail(
        subject="[매칭 API] 이메일 인증 코드",
        message=(
            f"인증 코드: {code}\n\n"
            f"{CODE_EXPIRY_MINUTES}분 이내에 회원가입 화면에 입력해주세요.\n"
            "본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다."
        ),
        from_email=None,
        recipient_list=[email],
    )
    logger.info("이메일 인증 코드 발송: email=%s", email)


def confirm_code(email: str, code: str) -> tuple[bool, str | None]:
    """코드를 확인한다. (성공 여부, 실패 시 에러 메시지) 튜플을 반환."""
    record = (
        EmailVerification.objects.filter(
            email__iexact=email,
            verified_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )
    if record is None:
        return False, "인증 코드가 만료됐거나 존재하지 않습니다. 다시 요청해주세요."

    if record.attempts >= MAX_ATTEMPTS:
        return False, "인증 코드 확인 시도 횟수를 초과했습니다. 인증 코드를 다시 요청해주세요."

    if not check_password(code, record.code_hash):
        record.attempts += 1
        record.save(update_fields=["attempts"])
        return False, "인증 코드가 일치하지 않습니다."

    record.verified_at = timezone.now()
    record.save(update_fields=["verified_at"])
    logger.info("이메일 인증 완료: email=%s", email)
    return True, None


def is_recently_verified(email: str) -> bool:
    """최근(VERIFIED_VALIDITY_HOURS 이내) 인증을 마친 기록이 있는지 —
    UserCreateSerializer가 회원가입을 막을지 판단하는 데 쓴다."""
    cutoff = timezone.now() - timedelta(hours=VERIFIED_VALIDITY_HOURS)
    return EmailVerification.objects.filter(
        email__iexact=email,
        verified_at__isnull=False,
        verified_at__gte=cutoff,
    ).exists()
