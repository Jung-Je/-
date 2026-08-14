from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConnectionViewSet,
    InterestCategoryViewSet,
    InterestViewSet,
    MatchingRequestViewSet,
    MatchingResultViewSet,
    NotificationSummaryView,
    UserInterestViewSet,
)

app_name = "matching"

router = DefaultRouter()
router.register(r"categories", InterestCategoryViewSet, basename="category")
router.register(r"interests", InterestViewSet, basename="interest")
router.register(r"user-interests", UserInterestViewSet, basename="user-interest")
router.register(r"requests", MatchingRequestViewSet, basename="request")
router.register(r"results", MatchingResultViewSet, basename="result")
router.register(r"connections", ConnectionViewSet, basename="connection")

urlpatterns = [
    path("notifications/summary/", NotificationSummaryView.as_view(), name="notification-summary"),
    path("", include(router.urls)),
]
