from django.utils import timezone
from rest_framework import serializers

from apps.support.models import Inquiry


class AdminInquirySerializer(serializers.ModelSerializer):
    """스태프 전용 문의 목록/상세 — 읽기 전용. 작성자를 알아볼 수 있게
    username/email을 같이 노출한다(소비자용 InquirySerializer는 본인
    문의만 보니 이 정보가 필요 없어서 없음)."""

    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "user",
            "username",
            "email",
            "category",
            "category_display",
            "title",
            "content",
            "status",
            "status_display",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = fields


class AdminInquiryStatusSerializer(serializers.ModelSerializer):
    """상태 변경 전용(PATCH). RESOLVED로 바뀌면 resolved_at을 지금
    시각으로 세팅하고, PENDING으로 되돌리면 다시 비운다 — "처리완료
    표시했다가 재오픈"도 자연스럽게 지원하기 위함.
    """

    class Meta:
        model = Inquiry
        fields = ["status"]

    def save(self, **kwargs):
        if self.validated_data.get("status") == Inquiry.StatusChoices.RESOLVED:
            kwargs.setdefault("resolved_at", timezone.now())
        else:
            kwargs.setdefault("resolved_at", None)
        return super().save(**kwargs)
