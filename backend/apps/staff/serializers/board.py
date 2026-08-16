from rest_framework import serializers

from apps.board.models import Comment, Post


class AdminPostSerializer(serializers.ModelSerializer):
    """스태프 전용 게시글 조회 — 읽기 전용. 작성자를 알아볼 수 있게
    username/email을 같이 노출한다(소비자용 PostSerializer는
    author_username만 있고 email이 없음)."""

    username = serializers.CharField(source="author.username", read_only=True)
    email = serializers.CharField(source="author.email", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "category",
            "category_name",
            "author",
            "username",
            "email",
            "title",
            "content",
            "comment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_comment_count(self, obj):
        return obj.comments.count()


class AdminCommentSerializer(serializers.ModelSerializer):
    """스태프 전용 댓글 조회 — 읽기 전용."""

    username = serializers.CharField(source="author.username", read_only=True)
    email = serializers.CharField(source="author.email", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "author",
            "username",
            "email",
            "content",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
