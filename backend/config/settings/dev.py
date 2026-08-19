"""
Development settings for Matching API project.
This module contains all settings specific to development environment.
"""

from pathlib import Path

from django.conf import settings as django_settings

import environ

# Load development environment variables
env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent
env_file = ROOT_DIR / ".envs" / ".env.dev"
if env_file.exists():
    environ.Env.read_env(str(env_file))

from .base import *  # noqa: F403, F401, E402

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

# Additional apps for development
INSTALLED_APPS += [  # noqa: F405
    "django_extensions",
    "debug_toolbar",
]

# Debug Toolbar middleware
MIDDLEWARE += [  # noqa: F405
    "debug_toolbar.middleware.DebugToolbarMiddleware",
]

# Internal IPs for debug toolbar
INTERNAL_IPS = [
    "127.0.0.1",
    "localhost",
]

# Django Debug Toolbar settings
DEBUG_TOOLBAR_CONFIG = {
    # Read the live setting (django.conf.settings.DEBUG), not this module's
    # DEBUG constant: Django's test runner flips settings.DEBUG to False at
    # runtime, and the toolbar keeps trying to render/reverse its own URLs
    # (which are only registered when DEBUG was True at urlconf import time)
    # if this stays pinned to the frozen module-level value.
    "SHOW_TOOLBAR_CALLBACK": lambda request: django_settings.DEBUG,
    "SHOW_TEMPLATE_CONTEXT": True,
    # manage.py test forces DEBUG=False, which the toolbar treats as a
    # misconfiguration unless told this is expected during test runs.
    "IS_RUNNING_TESTS": False,
}

# Django REST Framework - Development overrides
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",  # Enable browsable API in dev
    ],
}

# Email backend for development — 기본은 console(터미널에 그대로 출력)이라
# 회원가입 이메일 인증 코드 같은 걸 실제 메일함으로 받아볼 수 없다.
# .envs/.env.dev에 EMAIL_HOST_USER/EMAIL_HOST_PASSWORD를 채워두면(prod.py와
# 같은 방식) 실제 SMTP로 발송하도록 자동 전환된다 — 채워져 있지 않으면
# 그대로 console로 남는다(로컬 개발 기본값).
if env("EMAIL_HOST_USER", default=""):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")  # noqa: F405
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)  # noqa: F405
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)  # noqa: F405
    EMAIL_HOST_USER = env("EMAIL_HOST_USER")  # noqa: F405
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")  # noqa: F405
    DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default=EMAIL_HOST_USER)  # noqa: F405
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Logging configuration for development
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "filters": {
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "filters": ["require_debug_true"],
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# Disable throttling in development for easier testing
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "1000/hour",
    "user": "10000/hour",
}
