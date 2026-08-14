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

from ..models import User
from ..serializers import KakaoSignupCompletionSerializer, LoginSerializer, UserSerializer
from ..services import KakaoVerificationError, fetch_kakao_profile, verify_kakao_adult

logger = logging.getLogger(__name__)


def _login_without_password(django_request, user):
    """authenticate()를 거치지 않고 바로 세션을 만들 때 쓴다(카카오 소셜
    로그인/가입 — 비밀번호 자체가 없거나 확인할 필요가 없는 경우).
    django_login()은 보통 authenticate()가 user.backend에 심어준 값으로
    어느 인증 백엔드가 이 로그인을 승인했는지 판단하는데, 여기선 그
    과정을 안 거치니 직접 지정해줘야 한다 — 안 그러면
    AUTHENTICATION_BACKENDS가 2개(axes 포함)라 장고가 어느 쪽인지 판단을
    못 해 AttributeError를 던진다."""
    user.backend = "django.contrib.auth.backends.ModelBackend"
    django_login(django_request, user)


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


class KakaoAgeVerificationView(APIView):
    """카카오 로그인 age_range 동의항목으로 성인인증을 하는 회원가입 전
    단계. 로그인 전 흐름이라 AllowAny — 진짜 방어선은 여기가 아니라
    UserCreateSerializer.validate()가 세션 플래그를 다시 확인하는 것이고,
    여기는 그 플래그를 세팅하는 역할만 한다.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="카카오 성인인증 상태 조회",
        tags=["Auth"],
        responses={200: {"type": "object", "properties": {"verified": {"type": "boolean"}}}},
    )
    def get(self, request):
        """회원가입 폼을 열지 말지 프론트가 판단하는 용도(서버 세션이
        기준이라 새로고침·재방문에도 정확함)."""
        return Response({"verified": bool(request.session.get("kakao_age_verified"))})

    @extend_schema(
        summary="카카오 성인인증 수행",
        tags=["Auth"],
        responses={200: {"type": "object", "properties": {"verified": {"type": "boolean"}}}},
    )
    def post(self, request):
        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri")
        if not code or not redirect_uri:
            return Response(
                {"detail": "code와 redirect_uri가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = verify_kakao_adult(code, redirect_uri)
        except KakaoVerificationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not result["is_adult"]:
            return Response(
                {"detail": "만 19세 이상만 가입할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.session["kakao_age_verified"] = True
        request.session["kakao_verified_id"] = result["kakao_id"]
        logger.info("카카오 성인인증 완료: kakao_id=%s", result["kakao_id"])

        return Response({"verified": True})


class KakaoLoginView(APIView):
    """카카오 소셜 로그인/가입 1단계. 이미 연결된 계정이면 바로
    로그인시키고, 처음 보는 kakao_id면 계정을 만들지 않고 부족한 정보
    (KakaoSignupCompletionView에서 마저 받을 것들)만 세션에 잠깐
    담아둔다. age_range 성인인증(KakaoAgeVerificationView)과는 완전히
    별개 흐름이라 세션 키도 겹치지 않게 kakao_pending_* 접두사를 쓴다.
    """

    permission_classes = [AllowAny]

    @extend_schema(summary="카카오 소셜 로그인/가입 1단계", tags=["Auth"])
    def post(self, request):
        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri")
        if not code or not redirect_uri:
            return Response(
                {"detail": "code와 redirect_uri가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            profile = fetch_kakao_profile(code, redirect_uri)
        except KakaoVerificationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(kakao_id=profile["kakao_id"]).first()
        if user is not None:
            # django_login()은 authenticate()를 안 거치므로, 계정 정지
            # 여부를 여기서 직접 확인해야 한다 — 안 그러면 정지된 계정도
            # 카카오로는 로그인이 되는 구멍이 생긴다.
            if not user.is_active:
                return Response(
                    {"detail": "정지된 계정입니다."}, status=status.HTTP_400_BAD_REQUEST
                )
            _login_without_password(request._request, user)
            logger.info("카카오 소셜 로그인 성공: user_id=%s", user.id)
            return Response({"status": "logged_in", "user": UserSerializer(user).data})

        request.session["kakao_pending_id"] = profile["kakao_id"]
        request.session["kakao_pending_nickname"] = profile["nickname"]
        request.session["kakao_pending_email"] = profile["email"]
        logger.info("카카오 소셜 가입 필요: kakao_id=%s", profile["kakao_id"])

        return Response(
            {
                "status": "signup_required",
                "suggested_username": profile["nickname"],
                "suggested_email": profile["email"],
            }
        )


class KakaoSignupCompletionView(APIView):
    """카카오 소셜 가입 2단계. KakaoLoginView가 signup_required를 준
    직후에만 호출 의미가 있다 — session의 kakao_pending_id가 그
    관문이다. 비밀번호 없는 계정을 만든다(User.objects.create_user에
    password=None을 넘기면 장고가 자동으로 사용 불가능한 비밀번호로
    설정 — 이후 이메일/비밀번호 로그인은 자연히 실패하고 카카오로만
    로그인 가능해진다).
    """

    permission_classes = [AllowAny]

    @extend_schema(summary="카카오 소셜 가입 완료", tags=["Auth"])
    def post(self, request):
        kakao_id = request.session.get("kakao_pending_id")
        if not kakao_id:
            return Response(
                {"detail": "카카오 인증을 다시 진행해주세요."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = KakaoSignupCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.create_user(
            username=serializer.validated_data["username"],
            email=serializer.validated_data["email"],
            date_of_birth=serializer.validated_data["date_of_birth"],
            password=None,
            kakao_id=kakao_id,
            is_adult_verified=True,
        )

        for key in ("kakao_pending_id", "kakao_pending_nickname", "kakao_pending_email"):
            request.session.pop(key, None)

        _login_without_password(request._request, user)
        logger.info("카카오 소셜 가입 완료: user_id=%s", user.id)

        return Response({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
