from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminUserViewSet, UserPersonalityViewSet, UserViewSet

app_name = "users"

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"personalities", UserPersonalityViewSet, basename="personality")
# basename 명시 필수 — 안 주면 User.objects.all()에서 자동 유추된 "user"가
# 위 UserViewSet(basename="user")과 충돌한다.
router.register(r"admin/users", AdminUserViewSet, basename="admin-user")

urlpatterns = [
    path("", include(router.urls)),
]
