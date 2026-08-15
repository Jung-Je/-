from django.contrib import admin

from .models import BoardCategory, Comment, Post


@admin.register(BoardCategory)
class BoardCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "created_at")
    search_fields = ("name", "description")


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "author", "created_at")
    list_filter = ("category",)
    search_fields = ("title", "content", "author__username", "author__email")
    autocomplete_fields = ("author", "category")
    ordering = ("-created_at",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("post", "author", "content", "created_at")
    search_fields = ("content", "author__username", "author__email", "post__title")
    autocomplete_fields = ("author", "post")
    ordering = ("-created_at",)
