from rest_framework import serializers

from .models import BoardCategory, Comment, Post


class BoardCategorySerializer(serializers.ModelSerializer):
    """InterestCategorySerializer와 동일 패턴. posts_count는 소비자
    화면엔 안 쓰지만, 스태프가 카테고리 삭제 시 영향 범위(CASCADE로
    같이 지워질 글 수)를 미리 보여주는 데 그대로 재사용한다."""

    posts_count = serializers.SerializerMethodField()

    class Meta:
        model = BoardCategory
        fields = ["id", "name", "description", "posts_count", "created_at", "updated_at"]
        read_only_fields = ["id", "posts_count", "created_at", "updated_at"]

    def get_posts_count(self, obj):
        # 목록 조회는 뷰의 queryset이 .annotate(posts_count=Count("posts"))로
        # 미리 세어와서 obj에 그 값이 이미 붙어있다(코드 리뷰로 N+1 발견 —
        # 원래는 카테고리 행마다 별도 COUNT 쿼리가 나갔음). 카테고리 생성
        # 직후(perform_create) 응답처럼 annotate를 안 거친 인스턴스는
        # 속성 자체가 없으니 그때만 직접 센다.
        if hasattr(obj, "posts_count"):
            return obj.posts_count
        return obj.posts.count()


class PostSerializer(serializers.ModelSerializer):
    """글 조회/작성/수정 공용. author는 뷰의 perform_create가
    request.user로 세팅하는 읽기 전용 필드 — 수정 시 다른 사람 글로
    바꿔치기 못하게 한다."""

    author_username = serializers.CharField(source="author.username", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "category",
            "category_name",
            "author",
            "author_username",
            "title",
            "content",
            "comment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "category_name",
            "author",
            "author_username",
            "comment_count",
            "created_at",
            "updated_at",
        ]

    def get_comment_count(self, obj):
        # posts_count와 같은 이유 — PostViewSet.queryset이
        # .annotate(comment_count=Count("comments"))로 미리 세어오는데,
        # 글 작성 직후 응답(perform_create)의 인스턴스는 annotate를 안
        # 거쳐서 속성이 없다.
        if hasattr(obj, "comment_count"):
            return obj.comment_count
        return obj.comments.count()


class CommentSerializer(serializers.ModelSerializer):
    """댓글 조회/수정용 — post는 생성 후 다른 글로 옮기지 못하게
    읽기 전용(내용만 고칠 수 있음)."""

    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "post", "author", "author_username", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "post", "author", "author_username", "created_at", "updated_at"]


class CommentCreateSerializer(serializers.ModelSerializer):
    """댓글 작성 전용 — post를 이때만 입력받는다."""

    class Meta:
        model = Comment
        fields = ["post", "content"]
