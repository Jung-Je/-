from datetime import date, timedelta

from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.matching.tests.factories import InterestFactory, UserInterestFactory
from apps.users.tests.factories import DEFAULT_PASSWORD, UserPersonalityFactory

ME_URL = "/api/v1/users/users/me/"
CHANGE_PASSWORD_URL = "/api/v1/users/users/change_password/"
CHECK_PROFILE_URL = "/api/v1/users/users/check_profile_completion/"


@pytest.mark.django_db
def test_me_requires_authentication():
    client = APIClient()
    response = client.get(ME_URL)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_me_returns_current_user(auth_client):
    client, user = auth_client
    response = client.get(ME_URL)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["username"] == user.username


@pytest.mark.django_db
class TestChangePassword:
    def test_change_password_succeeds_with_correct_old_password(self, auth_client):
        client, user = auth_client
        response = client.post(
            CHANGE_PASSWORD_URL,
            {
                "old_password": DEFAULT_PASSWORD,
                "new_password": "N3w-Even-Stronger-Pass!",
                "new_password_confirm": "N3w-Even-Stronger-Pass!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.check_password("N3w-Even-Stronger-Pass!")

    def test_change_password_rejects_wrong_old_password(self, auth_client):
        client, user = auth_client
        response = client.post(
            CHANGE_PASSWORD_URL,
            {
                "old_password": "totally-wrong-password",
                "new_password": "N3w-Even-Stronger-Pass!",
                "new_password_confirm": "N3w-Even-Stronger-Pass!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        user.refresh_from_db()
        assert user.check_password(DEFAULT_PASSWORD)

    def test_change_password_rejects_mismatched_confirmation(self, auth_client):
        client, _user = auth_client
        response = client.post(
            CHANGE_PASSWORD_URL,
            {
                "old_password": DEFAULT_PASSWORD,
                "new_password": "N3w-Even-Stronger-Pass!",
                "new_password_confirm": "does-not-match",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestProfileCompletion:
    def test_incomplete_profile_reports_missing_pieces(self, auth_client):
        client, _user = auth_client
        response = client.post(CHECK_PROFILE_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_complete"] is False
        assert response.data["missing_fields"]["personality"] is True
        assert response.data["missing_fields"]["interests"] is True

    def test_complete_profile_marks_user_as_complete(self, auth_client):
        client, user = auth_client
        user.gender = user.GenderChoices.OTHER
        user.date_of_birth = "1995-01-01"
        user.location = "Seoul"
        user.bio = "안녕하세요"
        user.save()
        UserPersonalityFactory(user=user)
        UserInterestFactory(user=user, interest=InterestFactory())

        response = client.post(CHECK_PROFILE_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_complete"] is True
        user.refresh_from_db()
        assert user.is_profile_complete is True

    def test_first_completion_sets_has_completed_onboarding(self, auth_client):
        client, user = auth_client
        assert user.has_completed_onboarding is False
        user.gender = user.GenderChoices.OTHER
        user.date_of_birth = "1995-01-01"
        user.location = "Seoul"
        user.bio = "안녕하세요"
        user.save()
        UserPersonalityFactory(user=user)
        UserInterestFactory(user=user, interest=InterestFactory())

        client.post(CHECK_PROFILE_URL)

        user.refresh_from_db()
        assert user.has_completed_onboarding is True

    def test_has_completed_onboarding_survives_becoming_incomplete_again(self, auth_client):
        """온보딩을 한 번 끝낸 뒤 나중에(예: 관심사를 전부 지워서)
        is_profile_complete가 다시 False가 되더라도,
        has_completed_onboarding은 되돌아가지 않아야 한다 —
        OnboardingWizard가 이 값으로 마법사 재노출 여부를 판단한다."""
        client, user = auth_client
        user.gender = user.GenderChoices.OTHER
        user.date_of_birth = "1995-01-01"
        user.location = "Seoul"
        user.bio = "안녕하세요"
        user.save()
        UserPersonalityFactory(user=user)
        user_interest = UserInterestFactory(user=user, interest=InterestFactory())
        client.post(CHECK_PROFILE_URL)
        user.refresh_from_db()
        assert user.has_completed_onboarding is True

        user_interest.delete()
        response = client.post(CHECK_PROFILE_URL)

        assert response.data["is_complete"] is False
        user.refresh_from_db()
        assert user.is_profile_complete is False
        assert user.has_completed_onboarding is True


@pytest.mark.django_db
class TestDateOfBirthLocked:
    """생년월일은 가입 시(UserCreateSerializer/KakaoSignupCompletionSerializer)
    딱 한 번만 받고 검증한다 — 온보딩 프로필 단계나 설정 화면에서 다시
    입력받으면, 가입 때 검증한 값과 다른 값으로 조용히 덮어써서 최소연령
    검증 자체를 무력화할 수 있었다(사용자 리포트로 발견). UserUpdateSerializer
    에서 date_of_birth를 read_only로 만들어 PATCH 바디에 뭘 보내든 조용히
    무시되고 기존 값이 그대로 유지되는지 확인한다 — 굳이 400으로 막지 않는
    이유는, 프론트가 더는 이 필드를 보내지 않더라도(화면엔 읽기 전용으로만
    표시) 혹시 남아있는 다른 필드 값과 함께 보내는 정상 요청까지 에러로
    만들 필요는 없기 때문."""

    def test_patch_silently_ignores_date_of_birth_changes(self, auth_client):
        client, user = auth_client
        user.date_of_birth = "2000-06-15"
        user.save(update_fields=["date_of_birth"])
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        response = client.patch(f"/api/v1/users/users/{user.id}/", {"date_of_birth": tomorrow})

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.date_of_birth.isoformat() == "2000-06-15"

    def test_patch_ignores_date_of_birth_even_alongside_other_valid_fields(self, auth_client):
        client, user = auth_client
        user.date_of_birth = "2000-06-15"
        user.save(update_fields=["date_of_birth"])

        response = client.patch(
            f"/api/v1/users/users/{user.id}/",
            {"date_of_birth": "1995-01-01", "bio": "새 자기소개"},
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.date_of_birth.isoformat() == "2000-06-15"
        assert user.bio == "새 자기소개"
        assert user.bio == "새 자기소개"
