import pytest

from apps.users.tests.factories import DEFAULT_PASSWORD, UserFactory

ADMIN_LOGIN_URL = "/admin/login/"


@pytest.mark.django_db
class TestAdminLoginWithEmail:
    """실사용 버그 재현: /admin/ 로그인 폼은 USERNAME_FIELD가 여전히
    username이라 이메일을 넣으면 항상 실패했다. EmailOrUsernameAdmin
    AuthenticationForm(apps/users/admin.py)이 이메일도 실제 username으로
    바꿔서 인증하는지 확인한다.
    """

    def _post_login(self, client, username, password):
        get_response = client.get(ADMIN_LOGIN_URL)
        csrf_token = get_response.cookies["csrftoken"].value
        return client.post(
            ADMIN_LOGIN_URL,
            {
                "username": username,
                "password": password,
                "csrfmiddlewaretoken": csrf_token,
                "next": "/admin/",
            },
        )

    def test_staff_user_can_log_in_with_email(self, client):
        UserFactory(username="staffuser", email="staffuser@example.com", is_staff=True)

        response = self._post_login(client, "staffuser@example.com", DEFAULT_PASSWORD)

        # 로그인 성공 시 /admin/으로 리다이렉트(302) — 실패하면 폼을 다시
        # 200으로 렌더링하며 에러 메시지를 보여준다.
        assert response.status_code == 302
        assert response.url == "/admin/"

    def test_staff_user_can_still_log_in_with_username(self, client):
        UserFactory(username="staffuser2", email="staffuser2@example.com", is_staff=True)

        response = self._post_login(client, "staffuser2", DEFAULT_PASSWORD)

        assert response.status_code == 302
        assert response.url == "/admin/"

    def test_email_lookup_is_case_insensitive(self, client):
        UserFactory(username="staffuser3", email="Mixed.Case@Example.com", is_staff=True)

        response = self._post_login(client, "mixed.case@example.com", DEFAULT_PASSWORD)

        assert response.status_code == 302

    def test_wrong_password_still_rejected(self, client):
        UserFactory(username="staffuser4", email="staffuser4@example.com", is_staff=True)

        response = self._post_login(client, "staffuser4@example.com", "wrong-password")

        assert response.status_code == 200  # 폼 다시 렌더링(로그인 실패)

    def test_unknown_email_does_not_crash(self, client):
        response = self._post_login(client, "nobody@example.com", "whatever")

        assert response.status_code == 200  # 폼 다시 렌더링(로그인 실패), 에러 없이

    def test_non_staff_user_still_rejected_despite_correct_credentials(self, client):
        UserFactory(username="notstaff", email="notstaff@example.com", is_staff=False)

        response = self._post_login(client, "notstaff@example.com", DEFAULT_PASSWORD)

        assert response.status_code == 200  # is_staff가 아니면 관리자 로그인 거부
