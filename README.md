# Matching API

> 친구/네트워킹 매칭 서비스 — Django REST Framework 백엔드 + React 프론트엔드

친구/네트워킹 매칭을 위한 풀스택 프로젝트입니다. Django REST Framework 기반 API 서버(OpenAPI 3.0 자동 문서화)와, 그 API를 소비하는 React 프론트엔드로 구성되어 있습니다. 스태프 전용 관리자 REST API(`apps/staff`)도 별도로 제공하며, 도메인 API와 분리되어 있습니다.

## 주요 기능

- 🔐 사용자 인증 및 프로필 관리 (온보딩 3단계: 프로필·성격·관심사)
- 💛 카카오 소셜 로그인/가입 — 비밀번호 없는 계정, 카카오 계정으로 로그인/가입. 닉네임은 항상 직접 입력, 이메일은 카카오가 주면 잠근 채로 프리필(실계정으로 종단 검증 완료, [`docs/progress.md`](docs/progress.md) 참고)
- 🪪 회원가입 성인인증 — 자기신고 생년월일 기반 최소연령(만 19세) 검증. 카카오 로그인 `age_range` 연동을 시도했으나 사업자등록번호를 요구해 막힘(연동 코드는 남겨둠, [`docs/progress.md`](docs/progress.md) 참고)
- 🎯 세밀한 취향 기반 매칭 알고리즘
- 💬 사용자 간 연결 요청/수락/거절/차단 및 인앱 메시징
- 🛡️ 스태프 전용 관리자 패널 — 유저 모더레이션, 연결·메시지 관리, 관심사 큐레이션, 매칭 현황 조회/취소 (`apps/staff`, 프론트 `/staff/*`)
- 📚 자동 생성되는 API 문서 (Swagger UI / ReDoc)
- 🎨 일관된 코드 스타일 (백엔드: black/isort/flake8, 프론트엔드: oxlint)

## 기술 스택

- **Backend:** Django 5.0, Django REST Framework 3.14
- **Frontend:** React 19, Vite, TypeScript
- **Database:** PostgreSQL 15
- **Cache:** Redis (django-redis)
- **Documentation:** drf-spectacular (OpenAPI 3.0)
- **Code Quality:** black, isort, flake8 (백엔드) / oxlint (프론트엔드)
- **Dependency Management:** Poetry (백엔드), npm (프론트엔드)

## 빠른 시작

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd matching-api
poetry install
```

### 2. 환경 변수 설정

```bash
# .envs/.env.dev 파일이 이미 설정되어 있습니다
# 필요시 SECRET_KEY 등 수정
```

### 3. 데이터베이스 마이그레이션

```bash
cd backend
poetry run python manage.py migrate
```

### 4. 슈퍼유저 생성

```bash
poetry run python manage.py createsuperuser
```

### 5. 개발 서버 실행

```bash
poetry run python manage.py runserver
```

프론트엔드(`frontend/`)까지 같이 띄우려면 저장소 루트에서 `scripts/dev.sh`로 백엔드+프론트엔드를 한 번에 실행할 수 있습니다(Ctrl+C 한 번으로 둘 다 종료). Postgres/Redis가 안 떠 있으면 brew services로 같이 띄워줍니다(이미 떠 있으면 손 안 댐).

## API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI:** http://localhost:8000/api/docs/
- **ReDoc:** http://localhost:8000/api/redoc/
- **OpenAPI Schema:** http://localhost:8000/api/schema/

## 코드 품질 관리

커밋 전 코드 품질 체크:

```bash
# 전체 체크 (포맷팅 + 린트 + Django 체크)
scripts/check-all.sh

# 개별 실행
scripts/format.sh  # 포맷팅만
scripts/lint.sh    # 린트만
```

같은 체크(포맷팅/린트/Django check/테스트+커버리지)는 `.github/workflows/ci.yml`을 통해 push/PR마다 자동으로도 실행됩니다.

프론트엔드는 `frontend/`에서 별도로 체크합니다:

```bash
npm run lint   # oxlint
npm run test   # vitest
```

## Docker로 실행하기

### 개발 환경

```bash
docker compose up -d --build
```

`web`(runserver, 코드 변경 즉시 반영), `db`(PostgreSQL 15), `redis`(캐시), `frontend`(Vite dev 서버, 라이브 리로드) 컨테이너가 뜨고, http://localhost:8000 (백엔드) / http://localhost:3000 (프론트엔드)에서 접속할 수 있습니다.

### 프로덕션 환경

```bash
docker compose --env-file .envs/.env.prod -f docker-compose.prod.yml up -d --build
```

`.envs/.env.prod`에 정의된 값으로 gunicorn + PostgreSQL + Redis + (nginx로 정적 서빙되는) 프론트엔드 빌드가 실행됩니다. 백엔드 컨테이너 시작 시 `docker/entrypoint.sh`가 다음을 순서대로 수행합니다:
1. DB 연결 대기
2. `manage.py check --deploy --tag security` (보안 설정 검증, 문제 있으면 기동 중단)
3. `manage.py migrate`
4. `manage.py collectstatic`

프론트엔드는 `VITE_API_BASE_URL`을 빌드 타임에 JS 번들에 굳혀 넣으므로(Vite 환경변수라 런타임에 안 바뀜), 값을 바꾸면 재빌드가 필요합니다.

Apple Silicon에서 amd64 서버용 이미지를 빌드해야 한다면 `--platform linux/amd64`를 build 단계에 추가하세요.

## 프로젝트 구조

```
matching-api/
├── .github/workflows/   # CI (GitHub Actions, 백엔드+프론트엔드)
├── backend/
│   ├── apps/
│   │   ├── users/       # 사용자 관리 (인증, 프로필, 성격)
│   │   ├── matching/    # 매칭 시스템 (관심사, 매칭 요청/결과, 연결, 메시지)
│   │   └── staff/       # 스태프 전용 관리자 REST API (users/matching 모델을 다루지만 앱은 분리)
│   └── config/          # Django 설정
├── docker/              # Dockerfile(백엔드), Dockerfile.frontend, entrypoint.sh
├── docker-compose.yml       # 개발 환경 (db/redis/web/frontend)
├── docker-compose.prod.yml  # 프로덕션 환경
├── frontend/            # React + Vite + TypeScript (소비자 화면 + 스태프 관리자 화면)
│   └── src/
│       ├── app/           # 라우팅 진입점 (app/staff/* 포함)
│       ├── features/      # 도메인별 기능 묶음 (features/staff/ 포함)
│       ├── components/    # 공용 UI
│       └── lib/           # apiClient.ts 등 외부 통신 계층
├── scripts/             # 자동화 스크립트
├── docs/               # 프로젝트 문서
│   └── progress.md     # 진행 상황
└── pyproject.toml      # Poetry 설정
```

## API 엔드포인트

### 사용자 (Users)
- `POST /api/v1/users/users/` - 회원가입 (닉네임/이메일/생년월일/비밀번호, 만 19세 미만이면 400)
- `POST /api/v1/auth/kakao/login/` - 카카오 소셜 로그인/가입 1단계 (연결된 계정이면 로그인, 처음이면 signup_required)
- `POST /api/v1/auth/kakao/complete-signup/` - 카카오 소셜 가입 완료 (닉네임/이메일/생년월일, 비밀번호 없는 계정 생성)
- `GET/POST /api/v1/auth/kakao/verify/` - 카카오 성인인증(현재 미사용 — 사업자등록번호 필요해 연동 코드만 남겨둠)
- `GET /api/v1/users/users/me/` - 내 정보 조회
- `PATCH /api/v1/users/users/{id}/` - 프로필 수정
- `POST /api/v1/users/users/change_password/` - 비밀번호 변경
- `POST /api/v1/users/users/password_reset/` - 비밀번호 재설정 이메일 요청
- `POST /api/v1/users/users/password_reset_confirm/` - 비밀번호 재설정 확인

### 매칭 (Matching)
- `GET /api/v1/matching/interests/` - 관심사 목록
- `POST /api/v1/matching/user-interests/` - 관심사 추가
- `POST /api/v1/matching/requests/` - 매칭 요청
- `GET /api/v1/matching/results/` - 매칭 결과 조회
- `POST /api/v1/matching/connections/` - 연결 요청
- `GET/POST /api/v1/matching/connections/{id}/messages/` - 연결 내 메시지 조회/전송
- `GET /api/v1/matching/notifications/summary/` - 안 본 매칭 결과·응답 대기 연결 요청 수 요약

### 관리자 (Staff, 전부 `is_staff` 권한 필요)
- `GET/PATCH /api/v1/staff/users/` - 사용자 목록/계정 상태 변경(정지·매칭풀 포함 여부)
- `GET /api/v1/staff/connections/`, `PATCH .../status/`, `GET/DELETE .../messages/` - 연결·메시지 모더레이션
- `GET/POST/DELETE /api/v1/staff/interest-categories/`, `/api/v1/staff/interests/` - 관심사 카테고리·관심사 관리
- `GET /api/v1/staff/matching-requests/`, `POST .../cancel/`, `GET .../results/` - 전체 매칭 요청 조회·취소·결과 확인

## 개발 가이드

상세한 개발 진행 상황과 다음 할 일은 [`docs/progress.md`](docs/progress.md)를 참고하세요.

## 라이선스

이 프로젝트는 졸업 전시용 프로젝트입니다.