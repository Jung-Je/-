from django.contrib import admin

from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "user", "created_at", "resolved_at")
    list_filter = ("category", "status")
    search_fields = ("title", "content", "user__username", "user__email")
    autocomplete_fields = ("user",)
    ordering = ("-created_at",)
