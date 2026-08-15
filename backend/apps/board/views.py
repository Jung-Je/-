import logging

from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import BoardCategory, Comment, Post
from .permissions import IsAuthorOrReadOnly
from .serializers import (
    BoardCategorySerializer,
    CommentCreateSerializer,
    CommentSerializer,
    PostSerializer,
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="게시판 카테고리 목록 조회", tags=["Board"]),
    retrieve=extend_schema(summary="게시판 카테고리 상세 조회", tags=["Board"]),
)
class BoardCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """게시판 카테고리 조회 전용 — 생성/삭제는 스태프만
    (apps.staff.views.AdminBoardCategoryViewSet)."""

    queryset = BoardCategory.objects.all()
    serializer_class = BoardCategorySerializer
    permission_classes = [IsAuthenticated]


@extend_schema_view(
    list=extend_schema(summary="게시글 목록 조회", tags=["Board"]),
    retrieve=extend_schema(summary="게시글 상세 조회", tags=["Board"]),
    create=extend_schema(summary="게시글 작성", tags=["Board"]),
    update=extend_schema(summary="게시글 수정", tags=["Board"]),
    partial_update=extend_schema(summary="게시글 부분 수정", tags=["Board"]),
    destroy=extend_schema(summary="게시글 삭제", tags=["Board"]),
)
class PostViewSet(viewsets.ModelViewSet):
    """게시글 — 조회는 전체 공개(Inquiry와 반대로 본인 것만 필터링하지
    않음), 수정·삭제만 작성자 본인으로 제한(IsAuthorOrReadOnly)."""

    queryset = Post.objects.select_related("author", "category").all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]

    filterset_fields = ["category"]
    search_fields = ["title", "content", "author__username"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        logger.info("게시글 작성: post_id=%s user_id=%s", post.id, self.request.user.id)


@extend_schema_view(
    list=extend_schema(summary="댓글 목록 조회", tags=["Board"]),
    retrieve=extend_schema(summary="댓글 상세 조회", tags=["Board"]),
    create=extend_schema(summary="댓글 작성", tags=["Board"]),
    update=extend_schema(summary="댓글 수정", tags=["Board"]),
    partial_update=extend_schema(summary="댓글 부분 수정", tags=["Board"]),
    destroy=extend_schema(summary="댓글 삭제", tags=["Board"]),
)
class CommentViewSet(viewsets.ModelViewSet):
    """댓글 — Post와 동일하게 조회는 전체 공개, 수정·삭제만 작성자
    본인. ?post=<id>로 특정 글의 댓글만 조회."""

    queryset = Comment.objects.select_related("author", "post").all()
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    filterset_fields = ["post"]

    def get_serializer_class(self):
        if self.action == "create":
            return CommentCreateSerializer
        return CommentSerializer

    def create(self, request, *args, **kwargs):
        """CommentCreateSerializer는 post/content만 받으므로, 그걸 그대로
        응답하면 프론트가 목록에 바로 붙이는 데 필요한 id/author_username
        /created_at이 빠진다 — 저장 후 CommentSerializer로 다시 감싸서
        돌려준다(AdminInquiryViewSet.reply와 같은 이유의 패턴)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(CommentSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        logger.info(
            "댓글 작성: comment_id=%s post_id=%s user_id=%s",
            comment.id,
            comment.post_id,
            self.request.user.id,
        )
