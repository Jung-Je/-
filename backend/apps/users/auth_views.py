"""세션 기반 JSON 로그인/로그아웃 뷰.

계약은 frontend/src/api/auth.ts 참고:
    GET  /api/v1/auth/csrf/    -> 204, csrftoken 쿠키 설정
    POST /api/v1/auth/login/   -> 200 { user } | 400 { detail } | 403 { detail } (axes 잠금)
    POST /api/v1/auth/logout/  -> 204
"""

import logging

from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.http import HttpResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from .models import User
from .serializers import LoginSerializer, UserSerializer

logger = logging.getLogger(__name__)


@require_GET
@ensure_csrf_cookie
def csrf_view(request):
    """csrftoken 쿠키를 내려주는 엔드포인트.

    프론트는 로그인 폼을 그리기 전에 이 엔드포인트를 먼저 호출해 CSRF 쿠키를
    확보해두고, 이후 로그인/로그아웃 POST에서 그 값을 X-CSRFToken 헤더로
    되돌려준다.
    """
    get_token(request)  # 응답에 실제로 Set-Cookie 되도록 토큰을 사용 처리해둔다
    return HttpResponse(status=204)


class LoginView(APIView):
    """이메일/비밀번호 로그인.

    형식 검증은 LoginSerializer가 담당하고, 실제 인증은 Django의
    authenticate()에 위임한다. AUTHENTICATION_BACKENDS 맨 앞의 axes가 잠금
    여부를 함께 판단하며, 잠긴 요청은 AxesMiddleware가 이 뷰의 응답을 통째로
    AXES_HTTP_RESPONSE_CODE(403) 응답으로 덮어쓴다 — 이 뷰가 직접 403을
    반환하는 코드 경로는 없다.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="로그인",
        tags=["Auth"],
        request=LoginSerializer,
        responses={200: UserSerializer},
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # DRF의 Request는 원본 Django HttpRequest를 감싼 래퍼라, axes가 잠금
        # 플래그(axes_locked_out)를 여기에 세팅해도 AxesMiddleware가 실제로
        # 들여다보는 원본 request에는 반영되지 않는다. authenticate()에는
        # 반드시 원본(request._request)을 넘겨야 잠금 응답 오버라이드가 동작한다.
        django_request = request._request

        # USERNAME_FIELD가 여전히 username이라 이메일로 먼저 조회해 변환한다.
        # 미등록 이메일이어도 원본 문자열을 그대로 넘겨 axes가 시도 자체는
        # 추적하게 하고(계정 존재 여부가 새지 않도록), 어차피 이후
        # authenticate()는 실패해 동일한 응답으로 귀결된다.
        username = (
            User.objects.filter(email__iexact=email).values_list("username", flat=True).first()
            or email
        )

        user = authenticate(django_request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "이메일 또는 비밀번호가 올바르지 않습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        django_login(django_request, user)
        logger.info("로그인 성공: user_id=%s", user.id)
        return Response({"user": UserSerializer(user).data})


class LogoutView(APIView):
    """세션 로그아웃. 이미 로그아웃 상태여도 멱등하게 204를 반환한다."""

    permission_classes = [AllowAny]

    @extend_schema(summary="로그아웃", tags=["Auth"], request=None, responses={204: None})
    def post(self, request):
        django_logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)
