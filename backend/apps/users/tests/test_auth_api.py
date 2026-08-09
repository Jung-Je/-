import pytest

from apps.users.tests.factories import DEFAULT_PASSWORD, UserFactory

CSRF_URL = "/api/v1/auth/csrf/"
LOGIN_URL = "/api/v1/auth/login/"
LOGOUT_URL = "/api/v1/auth/logout/"
ME_URL = "/api/v1/users/users/me/"


@pytest.mark.django_db
class TestSessionLogin:
    def test_csrf_endpoint_sets_cookie(self, client):
        response = client.get(CSRF_URL)
        assert response.status_code == 204
        assert "csrftoken" in response.cookies

    def test_anonymous_cannot_access_protected_endpoint(self, client):
        response = client.get(ME_URL)
        assert response.status_code == 403

    def test_wrong_password_does_not_authenticate(self, client):
        user = UserFactory(username="loginuser")
        response = client.post(
            LOGIN_URL,
            {"email": user.email, "password": "wrong-password"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert response.data["detail"]

        response = client.get(ME_URL)
        assert response.status_code == 403

    def test_unregistered_email_gets_same_generic_error(self, client):
        response = client.post(
            LOGIN_URL,
            {"email": "nobody@example.com", "password": "whatever"},
            content_type="application/json",
        )
        # 계정 존재 여부가 새지 않도록 자격 오류와 동일한 응답이어야 한다.
        assert response.status_code == 400
        assert response.data["detail"]

    def test_correct_password_authenticates(self, client):
        user = UserFactory(username="loginuser")
        response = client.post(
            LOGIN_URL,
            {"email": user.email, "password": DEFAULT_PASSWORD},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.data["user"]["username"] == "loginuser"

        response = client.get(ME_URL)
        assert response.status_code == 200
        assert response.data["username"] == "loginuser"

    def test_email_lookup_is_case_insensitive(self, client):
        UserFactory(username="loginuser", email="Mixed.Case@Example.com")
        response = client.post(
            LOGIN_URL,
            {"email": "mixed.case@example.com", "password": DEFAULT_PASSWORD},
            content_type="application/json",
        )
        assert response.status_code == 200

    def test_logout_clears_session(self, client):
        user = UserFactory(username="loginuser")
        client.post(
            LOGIN_URL,
            {"email": user.email, "password": DEFAULT_PASSWORD},
            content_type="application/json",
        )
        response = client.post(LOGOUT_URL)
        assert response.status_code == 204

        response = client.get(ME_URL)
        assert response.status_code == 403

    def test_logout_without_session_is_idempotent(self, client):
        response = client.post(LOGOUT_URL)
        assert response.status_code == 204


@pytest.mark.django_db
class TestBruteForceLockout:
    """Regression test for the django-axes lockout behavior manually
    verified in the AXES_LOCKOUT_PARAMETERS bug (locked on username+ip
    combination, not on username or ip alone)."""

    def _fail_login(self, client, email, remote_addr="127.0.0.1"):
        return client.post(
            LOGIN_URL,
            {"email": email, "password": "wrong-password"},
            content_type="application/json",
            REMOTE_ADDR=remote_addr,
        )

    def test_locks_out_after_failure_limit(self, client):
        user = UserFactory(username="lockme")

        for _ in range(4):
            response = self._fail_login(client, user.email)
            assert response.status_code == 400  # 아직 잠기지 않음

        response = self._fail_login(client, user.email)
        assert response.status_code == 403  # 5번째 실패로 잠김 (AXES_HTTP_RESPONSE_CODE)

    def test_correct_password_still_rejected_while_locked(self, client):
        user = UserFactory(username="lockme2")
        for _ in range(5):
            self._fail_login(client, user.email)

        response = client.post(
            LOGIN_URL,
            {"email": user.email, "password": DEFAULT_PASSWORD},
            content_type="application/json",
        )
        assert response.status_code == 403

        response = client.get(ME_URL)
        assert response.status_code == 403

    def test_lockout_does_not_affect_other_email_on_same_ip(self, client):
        locked_user = UserFactory(username="lockme3")
        other_user = UserFactory(username="unaffected")

        for _ in range(5):
            self._fail_login(client, locked_user.email, remote_addr="10.0.0.1")

        response = client.post(
            LOGIN_URL,
            {"email": other_user.email, "password": DEFAULT_PASSWORD},
            content_type="application/json",
            REMOTE_ADDR="10.0.0.1",
        )
        assert response.status_code == 200  # 다른 사용자의 잠금에 함께 걸리지 않음

    def test_reset_clears_lockout(self, client):
        from axes.utils import reset

        user = UserFactory(username="lockme4")
        for _ in range(5):
            self._fail_login(client, user.email)

        reset(username=user.username)

        response = client.post(
            LOGIN_URL,
            {"email": user.email, "password": DEFAULT_PASSWORD},
            content_type="application/json",
        )
        assert response.status_code != 403
