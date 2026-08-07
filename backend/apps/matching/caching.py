import hashlib

from django.core.cache import cache
from rest_framework.response import Response

CACHE_TIMEOUT = 60 * 60  # 1시간 (버전 증가로 명시적으로 무효화되므로 여유롭게 설정)


def _version(prefix):
    """prefix에 대한 현재 캐시 버전. 없으면 1로 초기화."""
    key = f"{prefix}:version"
    version = cache.get(key)
    if version is None:
        version = 1
        cache.set(key, version, timeout=None)
    return version


def bump_cache_version(prefix):
    """prefix에 대한 캐시를 무효화 (기존에 그 버전으로 저장된 항목들은 더 이상 조회되지 않음)."""
    key = f"{prefix}:version"
    try:
        cache.incr(key)
    except ValueError:
        # 키가 없으면(캐시가 한 번도 안 쓰인 경우) incr가 실패하므로 초기화만 해둔다.
        cache.set(key, 1, timeout=None)


def cache_response(prefix):
    """DRF list/retrieve 액션의 직렬화된 응답 본문을 캐싱하는 데코레이터.

    권한 체크(permission_classes)는 DRF dispatch 단계에서 이 데코레이터보다
    먼저 실행되므로, 캐시 히트 시에도 인증되지 않은 요청은 정상적으로
    403을 받는다 (HTTP 레벨 cache_page와 달리 권한 체크를 우회하지 않음).

    캐시 키는 요청 전체 경로(쿼리스트링 포함)를 기준으로 하므로 페이지네이션/
    검색/필터 파라미터별로 별도 캐시된다. prefix에 해당하는 데이터가 바뀌면
    bump_cache_version(prefix)으로 한 번에 무효화한다.
    """

    def decorator(view_method):
        def wrapped(self, request, *args, **kwargs):
            version = _version(prefix)
            path_hash = hashlib.sha256(request.get_full_path().encode()).hexdigest()
            cache_key = f"{prefix}:v{version}:{path_hash}"

            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

            response = view_method(self, request, *args, **kwargs)
            if response.status_code == 200:
                cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)
            return response

        return wrapped

    return decorator
