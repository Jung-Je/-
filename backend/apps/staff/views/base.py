from rest_framework.permissions import IsAdminUser


class StaffPermissionMixin:
    """스태프 전용 뷰셋 공통 베이스 — permission_classes = [IsAdminUser]를
    한 곳에 모아둔다.

    예전엔 이 프로젝트의 스태프 뷰셋 9개가 각자 `permission_classes =
    [IsAdminUser]`를 따로 선언했다(코드 리뷰로 발견) — 전역 DRF 기본값이
    IsAdminUser가 아니라 IsAuthenticated라서, 다음에 스태프 엔드포인트를
    추가하는 사람이 이 한 줄을 깜빡하면 아무 에러 없이 그냥 일반
    로그인 유저에게도 열려버리는 구멍이었다. 상속만 하면 자동으로
    적용되도록 여기 한 곳으로 모아서, 실수할 여지 자체를 줄인다(완전히
    없애진 못하므로 test_staff_permissions.py의 라우터 전수 검사 테스트가
    실제 방어선).
    """

    permission_classes = [IsAdminUser]
