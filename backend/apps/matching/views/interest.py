from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema, extend_schema_view

from ..caching import cache_response
from ..models import Interest, InterestCategory, UserInterest
from ..serializers import (
    InterestCategorySerializer,
    InterestSerializer,
    UserInterestCreateSerializer,
    UserInterestSerializer,
)


@extend_schema_view(
    list=extend_schema(summary="관심사 카테고리 목록 조회", tags=["Interest Categories"]),
    retrieve=extend_schema(summary="관심사 카테고리 상세 조회", tags=["Interest Categories"]),
)
class InterestCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """관심사 카테고리 ViewSet (읽기 전용)"""

    queryset = InterestCategory.objects.all()
    serializer_class = InterestCategorySerializer
    permission_classes = [IsAuthenticated]

    @cache_response("interest_categories")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @cache_response("interest_categories")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


@extend_schema_view(
    list=extend_schema(summary="관심사 목록 조회", tags=["Interests"]),
    retrieve=extend_schema(summary="관심사 상세 조회", tags=["Interests"]),
)
class InterestViewSet(viewsets.ReadOnlyModelViewSet):
    """관심사 ViewSet (읽기 전용)"""

    queryset = Interest.objects.select_related("category").all()
    serializer_class = InterestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category"]
    search_fields = ["name", "description"]

    @cache_response("interests")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @cache_response("interests")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


@extend_schema_view(
    list=extend_schema(summary="내 관심사 목록 조회", tags=["User Interests"]),
    retrieve=extend_schema(summary="내 관심사 상세 조회", tags=["User Interests"]),
    create=extend_schema(summary="관심사 추가", tags=["User Interests"]),
    update=extend_schema(summary="관심사 수정", tags=["User Interests"]),
    partial_update=extend_schema(summary="관심사 부분 수정", tags=["User Interests"]),
    destroy=extend_schema(summary="관심사 삭제", tags=["User Interests"]),
)
class UserInterestViewSet(viewsets.ModelViewSet):
    """사용자 관심사 ViewSet"""

    queryset = UserInterest.objects.select_related("interest", "interest__category").all()
    serializer_class = UserInterestSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """액션별 시리얼라이저 설정"""
        if self.action == "create":
            return UserInterestCreateSerializer
        return UserInterestSerializer

    def get_queryset(self):
        """현재 사용자의 관심사만 조회"""
        return UserInterest.objects.filter(user=self.request.user).select_related(
            "interest", "interest__category"
        )
