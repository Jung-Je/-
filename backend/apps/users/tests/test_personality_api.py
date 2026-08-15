from rest_framework import status

import pytest

from apps.users.models import UserPersonality
from apps.users.tests.factories import UserPersonalityFactory

PERSONALITIES_URL = "/api/v1/users/personalities/"


def _payload(**overrides):
    payload = {
        "mbti": "ENFP",
        "introvert_extrovert": 4,
        "planning_spontaneous": 2,
        "active_relaxed": 5,
        "values_description": "자유와 모험",
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestPersonalityCreate:
    def test_creates_personality_owned_by_current_user(self, auth_client):
        client, user = auth_client

        response = client.post(PERSONALITIES_URL, _payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        personality = UserPersonality.objects.get(user=user)
        assert personality.mbti == "ENFP"

    def test_reposting_when_one_already_exists_updates_instead_of_500(self, auth_client):
        """온보딩 PersonalityStep은 이미 레코드가 있는지 확인하지 않고
        항상 POST만 보낸다(뒤로가기 후 재제출, 재방문 등) — 유니크
        제약(user당 1개) 위반으로 500이 나면 안 되고, 있는 레코드를
        그대로 갱신해야 한다. 실제로 겪은 버그(IntegrityError) 회귀
        테스트."""
        client, user = auth_client
        existing = UserPersonalityFactory(user=user, mbti="INTJ")

        response = client.post(PERSONALITIES_URL, _payload(mbti="ENFP"), format="json")

        assert response.status_code == status.HTTP_200_OK
        assert UserPersonality.objects.filter(user=user).count() == 1
        existing.refresh_from_db()
        assert existing.mbti == "ENFP"

    def test_reposting_does_not_affect_other_users_personality(self, auth_client):
        client, user = auth_client
        other = UserPersonalityFactory(mbti="INTJ")

        client.post(PERSONALITIES_URL, _payload(mbti="ENFP"), format="json")

        other.refresh_from_db()
        assert other.mbti == "INTJ"
        assert UserPersonality.objects.filter(user=user).count() == 1
