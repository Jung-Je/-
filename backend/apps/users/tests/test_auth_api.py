import pytest

from apps.users.tests.factories import DEFAULT_PASSWORD, UserFactory

LOGIN_URL = "/api/v1/auth/login/"
LOGOUT_URL = "/api/v1/auth/logout/"
ME_URL = "/api/v1/users/users/me/"


@pytest.mark.django_db
class TestSessionLogin:
    def test_anonymous_cannot_access_protected_endpoint(self, client):
        response = client.get(ME_URL)
        assert response.status_code == 403

    def test_wrong_password_does_not_authenticate(self, client):
        user = UserFactory(username="loginuser")
        client.post(LOGIN_URL, {"username": user.username, "password": "wrong-password"})

        response = client.get(ME_URL)
        assert response.status_code == 403

    def test_correct_password_authenticates(self, client):
        user = UserFactory(username="loginuser")
        response = client.post(LOGIN_URL, {"username": user.username, "password": DEFAULT_PASSWORD})
        assert response.status_code == 302  # login succeeded, redirected away from the form

        response = client.get(ME_URL)
        assert response.status_code == 200
        assert response.data["username"] == "loginuser"

    def test_logout_clears_session(self, client):
        user = UserFactory(username="loginuser")
        client.post(LOGIN_URL, {"username": user.username, "password": DEFAULT_PASSWORD})
        client.post(LOGOUT_URL)

        response = client.get(ME_URL)
        assert response.status_code == 403


@pytest.mark.django_db
class TestBruteForceLockout:
    """Regression test for the django-axes lockout behavior manually
    verified in the AXES_LOCKOUT_PARAMETERS bug (locked on username+ip
    combination, not on username or ip alone)."""

    def _fail_login(self, client, username, remote_addr="127.0.0.1"):
        return client.post(
            LOGIN_URL,
            {"username": username, "password": "wrong-password"},
            REMOTE_ADDR=remote_addr,
        )

    def test_locks_out_after_failure_limit(self, client):
        user = UserFactory(username="lockme")

        for _ in range(4):
            response = self._fail_login(client, user.username)
            assert response.status_code == 200  # form re-rendered, not locked yet

        response = self._fail_login(client, user.username)
        assert response.status_code == 429  # 5th failure locks the account

    def test_correct_password_still_rejected_while_locked(self, client):
        user = UserFactory(username="lockme2")
        for _ in range(5):
            self._fail_login(client, user.username)

        response = client.post(LOGIN_URL, {"username": user.username, "password": DEFAULT_PASSWORD})
        assert response.status_code == 429

        response = client.get(ME_URL)
        assert response.status_code == 403

    def test_lockout_does_not_affect_other_username_on_same_ip(self, client):
        locked_user = UserFactory(username="lockme3")
        other_user = UserFactory(username="unaffected")

        for _ in range(5):
            self._fail_login(client, locked_user.username, remote_addr="10.0.0.1")

        response = client.post(
            LOGIN_URL,
            {"username": other_user.username, "password": DEFAULT_PASSWORD},
            REMOTE_ADDR="10.0.0.1",
        )
        assert response.status_code == 302  # login succeeded, not swept into the other lockout

    def test_reset_clears_lockout(self, client):
        from axes.utils import reset

        user = UserFactory(username="lockme4")
        for _ in range(5):
            self._fail_login(client, user.username)

        reset(username=user.username)

        response = client.post(LOGIN_URL, {"username": user.username, "password": DEFAULT_PASSWORD})
        assert response.status_code != 429
