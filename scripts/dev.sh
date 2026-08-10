#!/bin/bash
# 백엔드(Django)와 프론트엔드(Vite) 개발 서버를 한 번에 실행
# Ctrl+C 한 번으로 둘 다 종료됨. Postgres/Redis는 별도로 떠 있어야 함
# (brew services start postgresql / redis, 또는 docker compose up db redis).

set -m
# ↑ job control 켜기: 이게 없으면 아래 두 백그라운드 작업이 이 스크립트와
# 같은 프로세스 그룹을 공유해서, runserver의 autoreload 자식 프로세스나
# vite의 node 프로세스처럼 한 단계 더 아래에서 뜨는 손자 프로세스까지는
# 종료 시그널이 안 전달된다 — 포트를 계속 붙잡은 채 좀비로 남는다.
# set -m으로 각 백그라운드 작업을 자기만의 프로세스 그룹으로 분리하면,
# 그 그룹에 음수 PID로 시그널을 보내 자식·손자까지 한 번에 정리할 수 있다.

cd "$(dirname "$0")/.."

cleanup() {
  trap - INT TERM EXIT # 종료 처리 중 다시 트랩이 걸려 cleanup이 중복 실행되는 것 방지
  echo ""
  echo "🛑 개발 서버 종료 중..."
  for pid in $(jobs -p); do
    kill -TERM -- -"$pid" 2>/dev/null
  done
  wait 2>/dev/null
}
trap cleanup INT TERM EXIT

echo "🚀 백엔드(Django) 실행 중... (http://localhost:8000)"
(cd backend && poetry run python manage.py runserver) &

echo "🚀 프론트엔드(Vite) 실행 중... (http://localhost:3000)"
(cd frontend && npm run dev) &

wait
