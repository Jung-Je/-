from rest_framework import serializers

from .models import Inquiry


class InquirySerializer(serializers.ModelSerializer):
    """유저용 문의 시리얼라이저 — 작성(title/category/content)과 본인 문의
    조회 둘 다 이걸로 처리한다. user/status/타임스탬프는 읽기 전용:
    user는 뷰의 perform_create가 request.user로 세팅하고, status는 스태프
    (apps.staff.serializers.AdminInquiryStatusSerializer)만 바꿀 수 있다.
    """

    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "category",
            "category_display",
            "title",
            "content",
            "status",
            "status_display",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "category_display",
            "status",
            "status_display",
            "created_at",
            "resolved_at",
        ]
