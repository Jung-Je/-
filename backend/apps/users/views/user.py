import logging

from django.conf import settings
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from ..models import User, UserPersonality
from ..serializers import (
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserCreateSerializer,
    UserPersonalitySerializer,
    UserSerializer,
    UserUpdateSerializer,
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(summary="사용자 목록 조회", tags=["Users"]),
    retrieve=extend_schema(summary="사용자 상세 조회", tags=["Users"]),
    create=extend_schema(summary="사용자 생성 (회원가입)", tags=["Users"]),
    update=extend_schema(summary="사용자 정보 수정", tags=["Users"]),
    partial_update=extend_schema(summary="사용자 정보 부분 수정", tags=["Users"]),
    destroy=extend_schema(summary="사용자 삭제 (회원탈퇴)", tags=["Users"]),
)
class UserViewSet(viewsets.ModelViewSet):
    """사용자 관리 ViewSet"""

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        """액션별 권한 설정"""
        if self.action in ["create", "password_reset", "password_reset_confirm"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        """액션별 시리얼라이저 설정"""
        if self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        """현재 사용자만 조회 가능"""
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    def perform_create(self, serializer):
        """회원가입 완료 로깅"""
        user = serializer.save()
        logger.info("회원가입 완료: user_id=%s", user.id)

    @extend_schema(
        summary="현재 로그인한 사용자 정보 조회",
        tags=["Users"],
    )
    @action(detail=False, methods=["get"])
    def me(self, request):
        """현재 로그인한 사용자 정보"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary="비밀번호 변경",
        tags=["Users"],
        request=PasswordChangeSerializer,
    )
    @action(detail=False, methods=["post"])
    def change_password(self, request):
        """비밀번호 변경"""
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # 비밀번호 변경
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        # 세션 유지
        update_session_auth_hash(request, user)

        logger.info("비밀번호 변경 완료: user_id=%s", user.id)

        return Response(
            {"detail": "비밀번호가 성공적으로 변경되었습니다."},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="프로필 완성도 확인 및 업데이트",
        tags=["Users"],
    )
    @action(detail=False, methods=["post"])
    def check_profile_completion(self, request):
        """프로필 완성도 확인"""
        user = request.user

        # 프로필 완성 조건 체크
        required_fields = [
            user.email,
            user.gender,
            user.date_of_birth,
            user.location,
            user.bio,
        ]

        has_personality = hasattr(user, "personality") and user.personality is not None
        has_interests = user.user_interests.exists()

        is_complete = all(required_fields) and has_personality and has_interests

        # 상태 업데이트
        if user.is_profile_complete != is_complete:
            user.is_profile_complete = is_complete
            user.save(update_fields=["is_profile_complete"])

        return Response(
            {
                "is_complete": is_complete,
                "missing_fields": {
                    "basic_info": not all(required_fields),
                    "personality": not has_personality,
                    "interests": not has_interests,
                },
            }
        )

    @extend_schema(
        summary="비밀번호 재설정 이메일 요청",
        tags=["Users"],
        request=PasswordResetRequestSerializer,
    )
    @action(detail=False, methods=["post"])
    def password_reset(self, request):
        """비밀번호 재설정 이메일 발송 요청"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject="[매칭 API] 비밀번호 재설정 안내",
                message=(
                    "비밀번호를 재설정하려면 아래 링크를 방문하세요.\n\n"
                    f"{reset_url}\n\n"
                    "본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다."
                ),
                from_email=None,
                recipient_list=[user.email],
            )
            logger.info("비밀번호 재설정 이메일 발송: user_id=%s", user.id)
        else:
            logger.info("비밀번호 재설정 요청: 미등록 이메일")

        # 등록 여부와 무관하게 동일한 응답을 반환해 이메일 존재 여부가 노출되지 않도록 함
        return Response(
            {"detail": "등록된 이메일이라면 비밀번호 재설정 안내 메일이 발송되었습니다."}
        )

    @extend_schema(
        summary="비밀번호 재설정 확인",
        tags=["Users"],
        request=PasswordResetConfirmSerializer,
    )
    @action(detail=False, methods=["post"])
    def password_reset_confirm(self, request):
        """이메일로 받은 uid/token으로 새 비밀번호 설정"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        logger.info("비밀번호 재설정 완료: user_id=%s", user.id)

        return Response({"detail": "비밀번호가 성공적으로 재설정되었습니다."})


@extend_schema_view(
    list=extend_schema(summary="사용자 성격 목록 조회", tags=["User Personality"]),
    retrieve=extend_schema(summary="사용자 성격 상세 조회", tags=["User Personality"]),
    create=extend_schema(summary="사용자 성격 생성", tags=["User Personality"]),
    update=extend_schema(summary="사용자 성격 수정", tags=["User Personality"]),
    partial_update=extend_schema(summary="사용자 성격 부분 수정", tags=["User Personality"]),
    destroy=extend_schema(summary="사용자 성격 삭제", tags=["User Personality"]),
)
class UserPersonalityViewSet(viewsets.ModelViewSet):
    """사용자 성격 정보 ViewSet"""

    queryset = UserPersonality.objects.all()
    serializer_class = UserPersonalitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """현재 사용자의 성격 정보만 조회"""
        return UserPersonality.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """UserPersonality는 유저당 최대 1개(OneToOne) — 온보딩
        PersonalityStep은 항상 POST만 호출하고 이미 있는지 따로
        확인하지 않는다(건너뛰었다가 다시 방문하거나, 뒤로가기 후 다시
        제출해도 자연스럽게 동작해야 하므로). 이미 레코드가 있으면 새로
        만들려다 유니크 제약 위반(500)으로 죽는 대신, 있는 레코드를
        그대로 갱신한다 — 이 엔드포인트를 사실상 upsert로 만든다."""
        existing = self.get_queryset().first()
        if existing is not None:
            serializer = self.get_serializer(existing, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """사용자 성격 정보 생성 시 현재 사용자 자동 설정"""
        serializer.save(user=self.request.user)
