from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.matching.models import Interest, InterestCategory
from apps.matching.serializers import InterestCategorySerializer, InterestSerializer


@extend_schema_view(
    list=extend_schema(summary="[관리자] 관심사 카테고리 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 관심사 카테고리 상세 조회", tags=["Admin"]),
    create=extend_schema(summary="[관리자] 관심사 카테고리 생성", tags=["Admin"]),
    update=extend_schema(summary="[관리자] 관심사 카테고리 수정", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 관심사 카테고리 부분 수정", tags=["Admin"]),
    destroy=extend_schema(summary="[관리자] 관심사 카테고리 삭제", tags=["Admin"]),
)
class AdminInterestCategoryViewSet(viewsets.ModelViewSet):
    """스태프 전용 관심사 카테고리 관리. 민감 데이터가 없는 콘텐츠
    큐레이션이라 Phase 1(유저/연결)과 다르게 생성·삭제까지 전부 허용한다.
    소비자용 InterestCategorySerializer를 그대로 재사용 — 쓰기 제한이
    필요한 필드가 없어서 별도 Admin 시리얼라이저가 필요 없다. 카테고리
    삭제 시 소속 관심사는 모델의 on_delete=CASCADE로 같이 삭제됨(목록의
    interests_count로 영향 범위가 미리 보임). 캐시 무효화는
    apps.matching.signals의 모델 시그널이 저장/삭제마다 자동으로 처리한다.
    """

    permission_classes = [IsAdminUser]
    queryset = InterestCategory.objects.all()
    serializer_class = InterestCategorySerializer
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]


@extend_schema_view(
    list=extend_schema(summary="[관리자] 관심사 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 관심사 상세 조회", tags=["Admin"]),
    create=extend_schema(summary="[관리자] 관심사 생성", tags=["Admin"]),
    update=extend_schema(summary="[관리자] 관심사 수정", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 관심사 부분 수정", tags=["Admin"]),
    destroy=extend_schema(summary="[관리자] 관심사 삭제", tags=["Admin"]),
)
class AdminInterestViewSet(viewsets.ModelViewSet):
    """스태프 전용 관심사 관리. (category, name) unique_together가
    모델에 이미 있어서 중복 생성은 DRF가 자동으로 400 처리한다.
    """

    permission_classes = [IsAdminUser]
    queryset = Interest.objects.select_related("category").all()
    serializer_class = InterestSerializer
    filterset_fields = ["category"]
    search_fields = ["name", "description", "category__name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["category", "name"]
