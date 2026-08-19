from rest_framework.permissions import IsAdminUser

from apps.staff.urls import router


class TestStaffViewSetsRequireIsAdminUser:
    """apps.staff의 9개 뷰셋이 전부 permission_classes = [IsAdminUser]를
    각자 따로 선언하고 있었다(StaffPermissionMixin으로 정리하기 전, 코드
    리뷰로 발견) — 새 스태프 엔드포인트를 추가할 때 이 한 줄을 깜빡하면
    전역 기본값(IsAuthenticated)으로 조용히 열려버리는데, 그걸 잡아줄
    테스트가 하나도 없었다.

    라우터에 등록된 뷰셋을 전수 검사해서, 앞으로 새 뷰셋이 추가돼도
    이 테스트를 따로 안 고쳐도 자동으로 커버되게 한다 — 개별 엔드포인트의
    '스태프 아니면 403' 테스트(test_users_api.py 등)는 그대로 유지하되,
    이건 그 테스트를 깜빡 안 쓴 경우까지 잡는 구조적 방어선이다."""

    def test_every_registered_viewset_requires_is_admin_user(self):
        assert len(router.registry) > 0, "라우터에 등록된 뷰셋이 없습니다 — urls.py를 확인하세요."

        missing = [
            viewset_cls.__name__
            for _prefix, viewset_cls, _basename in router.registry
            if IsAdminUser not in viewset_cls.permission_classes
        ]

        assert not missing, (
            f"IsAdminUser 없이 등록된 스태프 뷰셋: {missing} — "
            "StaffPermissionMixin을 상속하거나 permission_classes에 IsAdminUser를 추가하세요."
        )
