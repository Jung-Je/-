from django.contrib import admin
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, UserPersonality


class EmailOrUsernameAdminAuthenticationForm(AdminAuthenticationForm):
    """관리자 로그인 폼에 아이디 대신 이메일을 넣어도 로그인되게 한다.

    USERNAME_FIELD는 여전히 username이라(프론트 로그인 화면이 "이메일로
    조회 후 username으로 변환" 방식에 기대고 있어서 그대로 둠), 관리자
    로그인 폼에 이메일을 입력하면 항상 실패했다 — 실제로 겪은 버그.
    폼 검증 단계에서 입력값이 등록된 이메일과 일치하면 실제 username으로
    바꿔치기해서 넘긴다. AUTHENTICATION_BACKENDS 등 전역 인증 체인은
    안 건드리고 관리자 로그인 폼에만 영향을 준다.
    """

    def clean_username(self):
        username = self.cleaned_data.get("username")
        if username:
            try:
                user = User.objects.get(email__iexact=username)
            except User.DoesNotExist:
                pass
            else:
                username = user.get_username()
        return username


admin.site.login_form = EmailOrUsernameAdminAuthenticationForm


class UserPersonalityInline(admin.StackedInline):
    model = UserPersonality
    can_delete = False
    verbose_name_plural = "성격 정보"
    fk_name = "user"


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    inlines = [UserPersonalityInline]

    list_display = (
        "username",
        "email",
        "gender",
        "location",
        "is_profile_complete",
        "is_active_for_matching",
        "is_staff",
        "created_at",
    )
    list_filter = (
        "gender",
        "is_profile_complete",
        "is_active_for_matching",
        "is_staff",
        "is_superuser",
        "is_active",
    )
    search_fields = ("username", "email", "location")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "last_login", "date_joined")

    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "프로필 정보",
            {
                "fields": (
                    "gender",
                    "date_of_birth",
                    "location",
                    "bio",
                    "profile_image",
                )
            },
        ),
        (
            "매칭 상태",
            {"fields": ("is_profile_complete", "is_active_for_matching")},
        ),
        ("타임스탬프", {"fields": ("created_at", "updated_at")}),
    )

    actions = ["activate_for_matching", "deactivate_for_matching"]

    @admin.action(description="선택한 사용자를 매칭 대상으로 활성화")
    def activate_for_matching(self, request, queryset):
        updated = queryset.update(is_active_for_matching=True)
        self.message_user(request, f"{updated}명의 사용자가 매칭 대상으로 활성화되었습니다.")

    @admin.action(description="선택한 사용자를 매칭 대상에서 제외")
    def deactivate_for_matching(self, request, queryset):
        updated = queryset.update(is_active_for_matching=False)
        self.message_user(request, f"{updated}명의 사용자가 매칭 대상에서 제외되었습니다.")


@admin.register(UserPersonality)
class UserPersonalityAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "mbti",
        "introvert_extrovert",
        "planning_spontaneous",
        "active_relaxed",
        "updated_at",
    )
    list_filter = ("mbti",)
    search_fields = ("user__username", "user__email", "mbti")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
