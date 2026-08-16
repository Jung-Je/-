from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminBoardCategoryViewSet,
    AdminCommentViewSet,
    AdminConnectionViewSet,
    AdminInquiryViewSet,
    AdminInterestCategoryViewSet,
    AdminInterestViewSet,
    AdminMatchingRequestViewSet,
    AdminPostViewSet,
    AdminUserViewSet,
)

app_name = "staff"

# 스태프 전용 REST API 전부를 한 라우터에 모은다 — users/matching 도메인
# 앱에 admin/ 서브경로가 섞여 들어가던 것과 달리, "관리자 기능이 어디
# 있는지"를 이 파일 하나만 보면 알 수 있도록 통합.
router = DefaultRouter()
router.register(r"users", AdminUserViewSet, basename="admin-user")
router.register(r"connections", AdminConnectionViewSet, basename="admin-connection")
router.register(
    r"interest-categories", AdminInterestCategoryViewSet, basename="admin-interest-category"
)
router.register(r"interests", AdminInterestViewSet, basename="admin-interest")
router.register(
    r"matching-requests", AdminMatchingRequestViewSet, basename="admin-matching-request"
)
router.register(r"inquiries", AdminInquiryViewSet, basename="admin-inquiry")
router.register(r"board-categories", AdminBoardCategoryViewSet, basename="admin-board-category")
router.register(r"board-posts", AdminPostViewSet, basename="admin-board-post")
router.register(r"board-comments", AdminCommentViewSet, basename="admin-board-comment")

urlpatterns = [
    path("", include(router.urls)),
]
