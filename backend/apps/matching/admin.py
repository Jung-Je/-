from django.contrib import admin

from .models import (
    Connection,
    Interest,
    InterestCategory,
    MatchingRequest,
    MatchingResult,
    Message,
    UserInterest,
)


class InterestInline(admin.TabularInline):
    model = Interest
    extra = 1


@admin.register(InterestCategory)
class InterestCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "interest_count", "created_at")
    search_fields = ("name", "description")
    inlines = [InterestInline]

    @admin.display(description="관심사 수")
    def interest_count(self, obj):
        return obj.interests.count()


@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "created_at")
    list_filter = ("category",)
    search_fields = ("name", "description", "category__name")
    autocomplete_fields = ("category",)
    ordering = ("category", "name")


@admin.register(UserInterest)
class UserInterestAdmin(admin.ModelAdmin):
    list_display = ("user", "interest", "level", "created_at")
    list_filter = ("level", "interest__category")
    search_fields = ("user__username", "user__email", "interest__name")
    autocomplete_fields = ("user", "interest")
    ordering = ("-level", "interest__category")


class MatchingResultInline(admin.TabularInline):
    model = MatchingResult
    extra = 0
    fields = (
        "matched_user",
        "total_score",
        "interest_score",
        "personality_score",
        "location_score",
        "is_viewed",
        "is_contacted",
    )
    readonly_fields = fields
    can_delete = False
    show_change_link = True


@admin.register(MatchingRequest)
class MatchingRequestAdmin(admin.ModelAdmin):
    list_display = (
        "requester",
        "status",
        "preferred_location",
        "min_age",
        "max_age",
        "max_results",
        "created_at",
        "completed_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("requester__username", "requester__email", "preferred_location")
    autocomplete_fields = ("requester",)
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [MatchingResultInline]

    actions = ["mark_as_cancelled"]

    @admin.action(description="선택한 매칭 요청을 취소 처리")
    def mark_as_cancelled(self, request, queryset):
        updated = MatchingRequest.cancellable_queryset(queryset).update(
            status=MatchingRequest.StatusChoices.CANCELLED
        )
        self.message_user(request, f"{updated}건의 매칭 요청이 취소되었습니다.")


@admin.register(MatchingResult)
class MatchingResultAdmin(admin.ModelAdmin):
    list_display = (
        "request",
        "matched_user",
        "total_score",
        "interest_score",
        "personality_score",
        "location_score",
        "common_interests_count",
        "is_viewed",
        "is_contacted",
        "created_at",
    )
    list_filter = ("is_viewed", "is_contacted", "created_at")
    search_fields = (
        "request__requester__username",
        "matched_user__username",
        "matched_user__email",
    )
    autocomplete_fields = ("request", "matched_user")
    ordering = ("-total_score", "-created_at")
    readonly_fields = ("created_at", "viewed_at", "contacted_at")


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("sender", "body", "created_at", "read_at")
    readonly_fields = fields
    can_delete = False
    ordering = ("created_at",)


@admin.register(Connection)
class ConnectionAdmin(admin.ModelAdmin):
    list_display = (
        "from_user",
        "to_user",
        "status",
        "matching_result",
        "created_at",
        "responded_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("from_user__username", "to_user__username", "message")
    autocomplete_fields = ("from_user", "to_user", "matching_result")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "responded_at")
    inlines = [MessageInline]

    actions = ["accept_connections", "reject_connections"]

    @admin.action(description="선택한 연결 요청을 수락")
    def accept_connections(self, request, queryset):
        from django.utils import timezone

        updated = queryset.exclude(status=Connection.StatusChoices.ACCEPTED).update(
            status=Connection.StatusChoices.ACCEPTED, responded_at=timezone.now()
        )
        self.message_user(request, f"{updated}건의 연결 요청이 수락되었습니다.")

    @admin.action(description="선택한 연결 요청을 거절")
    def reject_connections(self, request, queryset):
        from django.utils import timezone

        updated = queryset.exclude(status=Connection.StatusChoices.REJECTED).update(
            status=Connection.StatusChoices.REJECTED, responded_at=timezone.now()
        )
        self.message_user(request, f"{updated}건의 연결 요청이 거절되었습니다.")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("connection", "sender", "body_preview", "created_at", "read_at")
    list_filter = ("created_at",)
    search_fields = ("sender__username", "body")
    autocomplete_fields = ("connection", "sender")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)

    @admin.display(description="내용")
    def body_preview(self, obj):
        return obj.body[:50]
