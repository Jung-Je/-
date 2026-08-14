from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.models import Interest, InterestCategory
from apps.matching.tests.factories import InterestCategoryFactory, InterestFactory
from apps.users.tests.factories import UserFactory

ADMIN_CATEGORIES_URL = "/api/v1/matching/admin/interest-categories/"
ADMIN_INTERESTS_URL = "/api/v1/matching/admin/interests/"


def staff_client():
    staff = UserFactory(is_staff=True)
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


@pytest.mark.django_db
class TestAdminInterestCategoriesPermission:
    def test_non_staff_gets_403(self, auth_client):
        client, _user = auth_client
        response = client.get(ADMIN_CATEGORIES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_gets_403(self):
        client = APIClient()
        response = client.get(ADMIN_CATEGORIES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminInterestCategoriesCrud:
    def test_staff_can_create_category(self):
        client, _staff = staff_client()

        response = client.post(
            ADMIN_CATEGORIES_URL,
            {"name": "보드게임", "description": "전략/파티 보드게임", "icon": "🎲"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert InterestCategory.objects.filter(name="보드게임").exists()

    def test_staff_can_delete_category(self):
        client, _staff = staff_client()
        category = InterestCategoryFactory()

        response = client.delete(f"{ADMIN_CATEGORIES_URL}{category.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not InterestCategory.objects.filter(pk=category.id).exists()

    def test_deleting_category_cascades_to_interests(self):
        client, _staff = staff_client()
        category = InterestCategoryFactory()
        interest = InterestFactory(category=category)

        client.delete(f"{ADMIN_CATEGORIES_URL}{category.id}/")

        assert not Interest.objects.filter(pk=interest.id).exists()

    def test_search_by_name(self):
        client, _staff = staff_client()
        target = InterestCategoryFactory(name="findme-category")
        InterestCategoryFactory(name="somethingelse")

        response = client.get(ADMIN_CATEGORIES_URL, {"search": "findme"})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [target.id]

    def test_interests_count_reflects_actual_count(self):
        client, _staff = staff_client()
        category = InterestCategoryFactory()
        InterestFactory(category=category)
        InterestFactory(category=category)

        response = client.get(f"{ADMIN_CATEGORIES_URL}{category.id}/")

        assert response.data["interests_count"] == 2

    def test_non_staff_cannot_create_category(self, auth_client):
        client, _user = auth_client

        response = client.post(ADMIN_CATEGORIES_URL, {"name": "몰래"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminInterestsCrud:
    def test_staff_can_create_interest_under_category(self):
        client, _staff = staff_client()
        category = InterestCategoryFactory()

        response = client.post(
            ADMIN_INTERESTS_URL,
            {"category": category.id, "name": "체스", "description": ""},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert Interest.objects.filter(category=category, name="체스").exists()

    def test_duplicate_name_in_same_category_rejected(self):
        client, _staff = staff_client()
        category = InterestCategoryFactory()
        InterestFactory(category=category, name="체스")

        response = client.post(
            ADMIN_INTERESTS_URL,
            {"category": category.id, "name": "체스"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_staff_can_delete_interest(self):
        client, _staff = staff_client()
        interest = InterestFactory()

        response = client.delete(f"{ADMIN_INTERESTS_URL}{interest.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Interest.objects.filter(pk=interest.id).exists()

    def test_filter_by_category(self):
        client, _staff = staff_client()
        category = InterestCategoryFactory()
        target = InterestFactory(category=category)
        InterestFactory()  # 다른 카테고리

        response = client.get(ADMIN_INTERESTS_URL, {"category": category.id})

        ids = [row["id"] for row in response.data["results"]]
        assert ids == [target.id]

    def test_non_staff_cannot_delete_interest(self, auth_client):
        client, _user = auth_client
        interest = InterestFactory()

        response = client.delete(f"{ADMIN_INTERESTS_URL}{interest.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Interest.objects.filter(pk=interest.id).exists()
