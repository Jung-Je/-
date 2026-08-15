from django.apps import AppConfig


class SupportConfig(AppConfig):
    """유저가 관리자에게 남기는 문의/신고/건의(Inquiry)를 다루는 앱.
    스태프 처리(상태 변경)는 여기 없음 — apps/staff가 이 모델을 가져다
    쓴다(관리자 기능이 도메인 앱에 흩어지지 않도록 하는 기존 컨벤션)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.support"
