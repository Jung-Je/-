from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UserPersonalityViewSet, UserViewSet

app_name = "users"

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"personalities", UserPersonalityViewSet, basename="personality")

urlpatterns = [
    path("", include(router.urls)),
]
