from django.apps import AppConfig


class StaffConfig(AppConfig):
    """스태프 전용 REST API(관리자 패널 백엔드) 앱. 모델은 없고, users·
    matching 앱의 모델·소비자용 시리얼라이저를 그대로 가져다 쓴다 —
    관리자 기능이 도메인 앱에 흩어지지 않고 한 곳에 모여 있도록 분리."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.staff"
