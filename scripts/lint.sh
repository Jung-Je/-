#!/bin/bash
# 린트 체크 스크립트

set -e

echo "🔍 린트 체크 시작..."

cd "$(dirname "$0")/.."

echo "📋 flake8 실행 중..."
poetry run flake8 backend/apps/ backend/config/ \
    --max-line-length=100 \
    --extend-ignore=E203,W503 \
    --exclude=migrations,__pycache__,.venv,build,dist

echo "✅ 린트 체크 완료!"