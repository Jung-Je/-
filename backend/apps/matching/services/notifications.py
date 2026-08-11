import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _send_notification_email(subject, message, recipient_email):
    """알림 이메일 발송. 실패해도 호출자의 주 작업(연결 생성/수락 등)은 막지 않는다."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=[recipient_email],
        )
    except Exception:
        logger.warning("알림 이메일 발송 실패: %s", recipient_email, exc_info=True)


def notify_connection_requested(connection):
    """연결 요청을 받은 사용자에게 이메일 알림"""
    _send_notification_email(
        subject="[매칭 API] 새로운 연결 요청이 도착했습니다",
        message=(
            f"{connection.from_user.username}님이 연결을 요청했습니다.\n\n"
            f"{settings.FRONTEND_URL}/connections/received 에서 확인해보세요."
        ),
        recipient_email=connection.to_user.email,
    )


def notify_connection_accepted(connection):
    """연결 요청이 수락되었을 때 요청을 보낸 사용자에게 이메일 알림"""
    _send_notification_email(
        subject="[매칭 API] 연결 요청이 수락되었습니다",
        message=(
            f"{connection.to_user.username}님이 회원님의 연결 요청을 수락했습니다.\n\n"
            f"{settings.FRONTEND_URL}/connections 에서 확인해보세요."
        ),
        recipient_email=connection.from_user.email,
    )
