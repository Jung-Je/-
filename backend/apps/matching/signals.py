from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .caching import bump_cache_version
from .models import Interest, InterestCategory

# InterestSerializer는 category.name을(category_name) 포함하고,
# InterestCategorySerializer는 interests_count(카테고리 소속 Interest 개수)를
# 포함하므로, 둘 중 하나만 바뀌어도 양쪽 캐시 모두 무효화해야 정확하다.


@receiver([post_save, post_delete], sender=InterestCategory)
def invalidate_interest_category_cache(sender, **kwargs):
    bump_cache_version("interest_categories")
    bump_cache_version("interests")


@receiver([post_save, post_delete], sender=Interest)
def invalidate_interest_cache(sender, **kwargs):
    bump_cache_version("interests")
    bump_cache_version("interest_categories")
