from django.apps import AppConfig


class BoardConfig(AppConfig):
    """유저들끼리 자유롭게 글·댓글을 남기는 게시판. 카테고리별로 구분되고,
    좋아요 같은 부가 기능 없이 글/댓글만 있는 단순한 형태(사용자 확정).
    모더레이션(강제 삭제)은 여기 없음 — apps/staff가 이 모델을 가져다
    쓴다(관리자 기능이 도메인 앱에 흩어지지 않도록 하는 기존 컨벤션)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.board"
