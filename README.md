# Matching API

> Headless 매칭 API 서버 및 자동화된 문서화 시스템

친구/네트워킹 매칭을 위한 RESTful API 서버입니다. Django REST Framework를 기반으로 하며, OpenAPI 3.0 스펙의 자동 문서화를 제공합니다.

## 주요 기능

- 🔐 사용자 인증 및 프로필 관리
- 🎯 세밀한 취향 기반 매칭 알고리즘
- 💬 사용자 간 연결 요청 및 관리
- 📚 자동 생성되는 API 문서 (Swagger UI / ReDoc)
- 🎨 일관된 코드 스타일 (black, isort, flake8)

## 기술 스택

- **Backend:** Django 5.0, Django REST Framework 3.14
- **Database:** PostgreSQL 15
- **Documentation:** drf-spectacular (OpenAPI 3.0)
- **Code Quality:** black, isort, flake8
- **Dependency Management:** Poetry

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

## 프로젝트 구조

```
matching-api/
├── backend/
│   ├── apps/
│   │   ├── users/       # 사용자 관리
│   │   └── matching/    # 매칭 시스템
│   └── config/          # Django 설정
├── scripts/             # 자동화 스크립트
├── docs/               # 프로젝트 문서
│   └── progress.md     # 진행 상황
└── pyproject.toml      # Poetry 설정
```

## API 엔드포인트

### 사용자 (Users)
- `POST /api/v1/users/users/` - 회원가입
- `GET /api/v1/users/users/me/` - 내 정보 조회
- `PATCH /api/v1/users/users/{id}/` - 프로필 수정
- `POST /api/v1/users/users/change_password/` - 비밀번호 변경

### 매칭 (Matching)
- `GET /api/v1/matching/interests/` - 관심사 목록
- `POST /api/v1/matching/user-interests/` - 관심사 추가
- `POST /api/v1/matching/requests/` - 매칭 요청
- `GET /api/v1/matching/results/` - 매칭 결과 조회
- `POST /api/v1/matching/connections/` - 연결 요청

## 개발 가이드

상세한 개발 진행 상황과 다음 할 일은 [`docs/progress.md`](docs/progress.md)를 참고하세요.

## 라이선스

이 프로젝트는 졸업 전시용 프로젝트입니다.