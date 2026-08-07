# syntax=docker/dockerfile:1

# ---- Builder: resolve production dependencies into a venv ----
FROM python:3.12-slim AS builder

ENV POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    PIP_NO_CACHE_DIR=1

RUN pip install "poetry==2.0.1"

WORKDIR /app
COPY pyproject.toml poetry.lock ./

# Production image only needs runtime dependencies, not the dev group
RUN poetry install --only main --no-root --no-directory

# ---- Builder-dev: adds the dev dependency group (debug_toolbar, black, ...) ----
FROM builder AS builder-dev
RUN poetry install --no-root --no-directory

# ---- Base runtime: shared by dev and prod images ----
FROM python:3.12-slim AS base

RUN groupadd --system app && useradd --system --gid app --create-home app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY backend/ /app/backend/
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh \
    && mkdir -p /app/var/staticfiles /app/var/logs /app/backend/media \
    && chown -R app:app /app

WORKDIR /app/backend
EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]

# ---- Dev: includes dev dependency group, runs manage.py runserver ----
FROM base AS dev
COPY --from=builder-dev --chown=app:app /app/.venv /app/.venv
USER app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ---- Runtime: production image, main dependencies only (default target) ----
FROM base AS runtime
COPY --from=builder --chown=app:app /app/.venv /app/.venv
USER app
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", "--error-logfile", "-"]
