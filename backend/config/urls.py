"""
Matching API URL Configuration
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.users.views import LoginView, LogoutView, csrf_view

urlpatterns = [
    # Admin (경로는 settings.ADMIN_URL — prod에서 ADMIN_URL 환경 변수로 바꿀 수 있음)
    path(settings.ADMIN_URL, admin.site.urls),
    # API v1
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/matching/", include("apps.matching.urls")),
    # 세션 기반 JSON 로그인/로그아웃 (계약: frontend/src/api/auth.ts)
    path("api/v1/auth/csrf/", csrf_view, name="auth-csrf"),
    path("api/v1/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/v1/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    # API Schema & Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# 개발 환경 전용 설정
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar

        urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
