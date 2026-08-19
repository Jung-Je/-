import logging

from django.db.models import Count
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAdminUser

from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.board.models import BoardCategory, Comment, Post
from apps.board.serializers import BoardCategorySerializer

from ..serializers import AdminCommentSerializer, AdminPostSerializer

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="[관리자] 게시판 카테고리 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 게시판 카테고리 상세 조회", tags=["Admin"]),
    create=extend_schema(summary="[관리자] 게시판 카테고리 생성", tags=["Admin"]),
    update=extend_schema(summary="[관리자] 게시판 카테고리 수정", tags=["Admin"]),
    partial_update=extend_schema(summary="[관리자] 게시판 카테고리 부분 수정", tags=["Admin"]),
    destroy=extend_schema(summary="[관리자] 게시판 카테고리 삭제", tags=["Admin"]),
)
class AdminBoardCategoryViewSet(viewsets.ModelViewSet):
    """스태프 전용 게시판 카테고리 관리. AdminInterestCategoryViewSet과
    동일한 이유로 생성·삭제까지 전부 허용 — 민감 데이터가 없는 콘텐츠
    큐레이션. 소비자용 BoardCategorySerializer를 그대로 재사용(쓰기
    제한이 필요한 필드가 없음). 카테고리 삭제 시 소속 글은 모델의
    on_delete=CASCADE로 같이 삭제됨(목록의 posts_count로 영향 범위가
    미리 보임)."""

    permission_classes = [IsAdminUser]
    # apps.board.views.BoardCategoryViewSet과 같은 이유(N+1 방지)로 annotate.
    queryset = BoardCategory.objects.annotate(posts_count=Count("posts")).all()
    serializer_class = BoardCategorySerializer
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]


@extend_schema_view(
    list=extend_schema(summary="[관리자] 게시글 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 게시글 상세 조회", tags=["Admin"]),
    destroy=extend_schema(summary="[관리자] 게시글 강제 삭제", tags=["Admin"]),
)
class AdminPostViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """스태프 전용 게시글 모더레이션. 조회+강제삭제만 지원 — 작성은
    유저만, 수정은 이 패널 범위 밖(AdminInquiryViewSet과 같은 이유로
    mixin만 조합)."""

    permission_classes = [IsAdminUser]
    # apps.board.views.PostViewSet과 같은 이유(N+1 방지)로 annotate.
    queryset = (
        Post.objects.select_related("author", "category")
        .annotate(comment_count=Count("comments"))
        .all()
    )
    serializer_class = AdminPostSerializer
    filterset_fields = ["category"]
    search_fields = ["title", "content", "author__username", "author__email"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def perform_destroy(self, instance):
        logger.info(
            "관리자 게시글 강제 삭제: post_id=%s title=%s",
            instance.id,
            instance.title,
        )
        instance.delete()


@extend_schema_view(
    list=extend_schema(summary="[관리자] 댓글 목록 조회", tags=["Admin"]),
    retrieve=extend_schema(summary="[관리자] 댓글 상세 조회", tags=["Admin"]),
    destroy=extend_schema(summary="[관리자] 댓글 강제 삭제", tags=["Admin"]),
)
class AdminCommentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """스태프 전용 댓글 모더레이션. ?post=<id>로 특정 글의 댓글만도
    조회 가능."""

    permission_classes = [IsAdminUser]
    queryset = Comment.objects.select_related("author", "post").all()
    serializer_class = AdminCommentSerializer
    filterset_fields = ["post"]
    search_fields = ["content", "author__username", "author__email"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def perform_destroy(self, instance):
        logger.info(
            "관리자 댓글 강제 삭제: comment_id=%s post_id=%s",
            instance.id,
            instance.post_id,
        )
        instance.delete()
