"""
개발/로컬 환경에서 관심사 카테고리·관심사 시드 데이터를 넣는 명령어.

지금까지 이 테이블을 채우는 fixture/시드가 하나도 없어서, 새로 만든
DB에서는 온보딩(내 카드 만들기)의 관심사 선택 단계가 빈 화면일 수밖에
없었다 — 그 상태를 해소하기 위해 추가.

멱등하게 동작한다 (get_or_create 기반) — 여러 번 실행해도 중복 생성되지 않음.
"""

from django.core.management.base import BaseCommand

from apps.matching.models import Interest, InterestCategory

SEED_DATA = {
    "스포츠": ("🏀", ["축구", "농구", "러닝", "클라이밍", "요가"]),
    "음악": ("🎵", ["록", "재즈", "K-POP", "클래식", "힙합"]),
    "예술/문화": ("🎨", ["영화", "독서", "사진", "전시 관람", "공연"]),
    "음식": ("🍜", ["맛집 탐방", "요리", "커피", "베이킹", "와인"]),
    "여행": ("✈️", ["국내 여행", "해외 여행", "캠핑", "등산", "드라이브"]),
    "기술": ("💻", ["프로그래밍", "AI", "게임", "스타트업", "디자인"]),
}


class Command(BaseCommand):
    help = "관심사 카테고리·관심사 시드 데이터를 생성한다 (멱등)."

    def handle(self, *args, **options):
        created_categories = 0
        created_interests = 0

        for category_name, (icon, interest_names) in SEED_DATA.items():
            category, was_created = InterestCategory.objects.get_or_create(
                name=category_name,
                defaults={"icon": icon},
            )
            created_categories += int(was_created)

            for interest_name in interest_names:
                _, was_created = Interest.objects.get_or_create(
                    category=category,
                    name=interest_name,
                )
                created_interests += int(was_created)

        self.stdout.write(
            self.style.SUCCESS(
                f"카테고리 {created_categories}개, 관심사 {created_interests}개 생성 완료 "
                f"(총 카테고리 {InterestCategory.objects.count()}개, "
                f"관심사 {Interest.objects.count()}개)"
            )
        )
