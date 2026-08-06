import logging

import pytest
from rest_framework.test import APIClient

from apps.users.tests.factories import UserFactory


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.fixture
def apps_caplog(caplog):
    """caplog for loggers under "apps.*".

    The "apps" logger is configured with propagate=False (to avoid
    duplicate stderr output via the root logger's lastResort handler), so
    plain caplog.at_level(..., logger="apps.x.y") never sees these records
    — pytest's capture handler only sits on the root logger. Attaching the
    handler directly to "apps" sidesteps that, since propagate only affects
    forwarding *past* this logger, not its own handlers.
    """
    logger = logging.getLogger("apps")
    previous_level = logger.level
    logger.addHandler(caplog.handler)
    logger.setLevel(logging.INFO)
    try:
        yield caplog
    finally:
        logger.removeHandler(caplog.handler)
        logger.setLevel(previous_level)
