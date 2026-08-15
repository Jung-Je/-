from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAuthorOrReadOnly(BasePermission):
    """게시판 글/댓글은 전체 공개(조회는 누구나) — 수정·삭제만 작성자
    본인으로 제한한다. Inquiry/UserInterest처럼 아예 "본인 것만
    보이게" 큐어리셋을 필터링하는 게 아니라, 조회는 열어두고 쓰기만
    막는 게 이 게시판의 성격에 맞아서 새로 만든 권한 클래스."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.author_id == request.user.id
