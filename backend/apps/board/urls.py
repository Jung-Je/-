from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BoardCategoryViewSet, CommentViewSet, PostViewSet

app_name = "board"

router = DefaultRouter()
router.register(r"categories", BoardCategoryViewSet, basename="board-category")
router.register(r"posts", PostViewSet, basename="post")
router.register(r"comments", CommentViewSet, basename="comment")

urlpatterns = [
    path("", include(router.urls)),
]
