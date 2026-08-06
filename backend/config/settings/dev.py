"""
Development settings for Matching API project.
This module contains all settings specific to development environment.
"""

from pathlib import Path

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
    "SHOW_TOOLBAR_CALLBACK": lambda request: DEBUG,  # noqa: F405
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

# Email backend for development (console)
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
