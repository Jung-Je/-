from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, UserPersonality


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
