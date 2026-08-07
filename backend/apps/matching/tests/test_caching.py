from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.caching import bump_cache_version
from apps.matching.tests.factories import InterestCategoryFactory, InterestFactory

CATEGORIES_URL = "/api/v1/matching/categories/"
INTERESTS_URL = "/api/v1/matching/interests/"


@pytest.fixture(autouse=True)
def _reset_cache_versions():
    """캐시 버전을 매 테스트마다 새로 시작해 테스트 간 캐시 오염을 막는다."""
    bump_cache_version("interest_categories")
    bump_cache_version("interests")
    yield
    bump_cache_version("interest_categories")
    bump_cache_version("interests")


@pytest.mark.django_db
class TestInterestCategoryCaching:
    def test_second_request_hits_cache_not_db(self, auth_client, django_assert_num_queries):
        client, _user = auth_client
        InterestCategoryFactory()

        first = client.get(CATEGORIES_URL)
        assert first.status_code == status.HTTP_200_OK

        # 2 queries = SAVEPOINT/RELEASE only (ATOMIC_REQUESTS=True wraps every
        # request in a transaction regardless); zero real SELECTs against the
        # DB means the response came entirely from cache.
        with django_assert_num_queries(2):
            second = client.get(CATEGORIES_URL)
        assert second.data == first.data

    def test_creating_a_category_invalidates_the_cache(self, auth_client):
        client, _user = auth_client
        client.get(CATEGORIES_URL)  # populate cache with empty/initial list

        InterestCategoryFactory(name="새 카테고리")

        response = client.get(CATEGORIES_URL)
        names = [c["name"] for c in response.data["results"]]
        assert "새 카테고리" in names

    def test_new_interest_invalidates_category_cache_too(self, auth_client):
        # InterestCategorySerializer.interests_count depends on Interest rows,
        # so creating an Interest must also bust the category list cache.
        client, _user = auth_client
        category = InterestCategoryFactory()
        client.get(CATEGORIES_URL)  # cache interests_count == 0

        InterestFactory(category=category)

        response = client.get(CATEGORIES_URL)
        entry = next(c for c in response.data["results"] if c["id"] == category.id)
        assert entry["interests_count"] == 1

    def test_unauthenticated_request_is_not_served_cached_data(self, auth_client):
        client, _user = auth_client
        client.get(CATEGORIES_URL)  # populate cache as an authenticated user

        anonymous_client = APIClient()
        response = anonymous_client.get(CATEGORIES_URL)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestInterestCaching:
    def test_second_request_hits_cache_not_db(self, auth_client, django_assert_num_queries):
        client, _user = auth_client
        InterestFactory()

        first = client.get(INTERESTS_URL)
        assert first.status_code == status.HTTP_200_OK

        # 2 queries = SAVEPOINT/RELEASE only (ATOMIC_REQUESTS=True wraps every
        # request in a transaction regardless); zero real SELECTs against the
        # DB means the response came entirely from cache.
        with django_assert_num_queries(2):
            second = client.get(INTERESTS_URL)
        assert second.data == first.data

    def test_renaming_category_invalidates_interest_cache(self, auth_client):
        # InterestSerializer includes category_name, so a category rename
        # must bust the interest list cache too.
        client, _user = auth_client
        category = InterestCategoryFactory(name="원래 이름")
        InterestFactory(category=category)
        client.get(INTERESTS_URL)  # cache category_name == "원래 이름"

        category.name = "바뀐 이름"
        category.save()

        response = client.get(INTERESTS_URL)
        assert response.data["results"][0]["category_name"] == "바뀐 이름"

    def test_different_query_params_are_cached_separately(self, auth_client):
        client, _user = auth_client
        category_a = InterestCategoryFactory()
        category_b = InterestCategoryFactory()
        InterestFactory(category=category_a)
        InterestFactory(category=category_b)

        response_a = client.get(INTERESTS_URL, {"category": category_a.id})
        response_b = client.get(INTERESTS_URL, {"category": category_b.id})

        assert len(response_a.data["results"]) == 1
        assert response_a.data["results"][0]["category"] == category_a.id
        assert len(response_b.data["results"]) == 1
        assert response_b.data["results"][0]["category"] == category_b.id
