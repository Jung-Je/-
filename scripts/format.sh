#!/bin/bash
# 코드 포맷팅 스크립트

set -e

echo "🔧 코드 포맷팅 시작..."

cd "$(dirname "$0")/.."

echo "📦 isort 실행 중..."
poetry run isort backend/apps/ backend/config/

echo "🎨 black 실행 중..."
poetry run black backend/apps/ backend/config/

echo "✅ 포맷팅 완료!"
