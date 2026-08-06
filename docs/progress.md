# 매칭 API 프로젝트 진행 상황

## 🚦 현재 상태 (마지막 업데이트: 2026-08-06)
- 우선순위 1~4 (Admin 커스터마이징 / 매칭 알고리즘 / 서버 실행·E2E 테스트 / CI·CD) 완료
- 추가로 로그인 브루트포스 방어(django-axes), 모델-마이그레이션 드리프트 해소, 단위/통합 테스트 작성(61개, 커버리지 89%) 완료
- **다음 시작 지점: 선택 사항 (캐싱, 로깅 고도화 등)** — 아래 "남은 작업" 참고
- ⚠️ **커밋 필요:** 아래 변경사항이 아직 git에 커밋되지 않은 상태 (`git status`로 확인)
  - `backend/apps/users/tests/`, `backend/apps/matching/tests/` (신규 — pytest 테스트 스위트, 기존 빈 `tests.py` 스텁 대체)
  - `backend/conftest.py` (신규 — 공용 `auth_client` fixture)
  - `pyproject.toml` (pytest가 `config`/`apps`를 못 찾던 `pythonpath` 누락 수정, 커버리지 대상 명시)
  - `backend/config/settings/dev.py` (테스트 중 debug_toolbar가 `NoReverseMatch`로 죽던 버그 수정 — `SHOW_TOOLBAR_CALLBACK`이 고정된 모듈 상수 대신 실시간 `settings.DEBUG`를 보도록 변경)
  - `.github/workflows/ci.yml` (테스트 실행을 `manage.py test` → `pytest`로 교체 — 새 테스트가 pytest 스타일이라 `manage.py test`는 인식하지 못함)
  - `docs/progress.md` (본 문서)

## 프로젝트 개요
Headless 매칭 API 서버 및 자동화된 문서화 시스템
- 친구/네트워킹 매칭 시스템
- Django + DRF 기반
- OpenAPI 3.0 자동 문서화
- PostgreSQL 데이터베이스

---

## ✅ 완료된 작업

### 1단계: 스키마 설계 및 초기 설정

#### 프로젝트 구조
- Django 프로젝트 초기 설정 완료
- apps/users, apps/matching 앱 생성
- Poetry를 통한 의존성 관리

#### Settings 파일 구성
- `config/settings/base.py` - 공통 설정
- `config/settings/dev.py` - 개발 환경
- `config/settings/prod.py` - 프로덕션 환경
- 환경별 설정 분리 완료

#### 환경 변수 설정
- `.envs/.env.dev` - 개발 환경 변수
- `.envs/.env.prod` - 프로덕션 환경 변수 (템플릿)
- `.envs/` 폴더 전체 Git에서 제외

#### 데이터베이스 설정
- PostgreSQL 15 설치 확인
- `matching_db` (개발용) 생성
- `matching_db_prod` (프로덕션용) 생성
- 데이터베이스 비밀번호 설정
- 마이그레이션 완료

#### 모델 설계 (총 8개)
**users 앱:**
1. **User** - 커스텀 사용자 모델
   - 기본 정보: email, gender, date_of_birth, location, bio, profile_image
   - 계정 상태: is_profile_complete, is_active_for_matching
   - 인덱스: email, location, is_active_for_matching

2. **UserPersonality** - 사용자 성격/가치관
   - MBTI
   - 성향 척도: introvert_extrovert, planning_spontaneous, active_relaxed
   - 가치관 설명

**matching 앱:**
3. **InterestCategory** - 관심사 카테고리
4. **Interest** - 구체적인 관심사
5. **UserInterest** - 사용자-관심사 연결 (레벨 포함)
6. **MatchingRequest** - 매칭 요청
7. **MatchingResult** - 매칭 결과 및 점수
8. **Connection** - 사용자 간 연결/친구 관계

---

### 2단계: DRF 표준에 맞춘 API 구현

#### Serializers 작성
**users 앱:**
- UserSerializer
- UserCreateSerializer (회원가입)
- UserUpdateSerializer
- UserDetailSerializer (매칭 결과용)
- UserPersonalitySerializer
- PasswordChangeSerializer

**matching 앱:**
- InterestCategorySerializer
- InterestSerializer
- UserInterestSerializer
- MatchingRequestSerializer
- MatchingResultSerializer
- ConnectionSerializer
- ConnectionResponseSerializer

#### ViewSets 작성
**users 앱:**
- UserViewSet (회원가입, 프로필 관리, 비밀번호 변경)
- UserPersonalityViewSet (성격 정보 관리)

**matching 앱:**
- InterestCategoryViewSet (읽기 전용)
- InterestViewSet (읽기 전용)
- UserInterestViewSet (내 관심사 CRUD)
- MatchingRequestViewSet (매칭 요청 생성/조회/취소)
- MatchingResultViewSet (매칭 결과 조회)
- ConnectionViewSet (연결 요청/응답)

#### URL 설정
- `apps/users/urls.py` - 사용자 API 라우팅
- `apps/matching/urls.py` - 매칭 API 라우팅
- `config/urls.py` - 메인 URL 설정
  - `/api/v1/users/` - 사용자 관리
  - `/api/v1/matching/` - 매칭 시스템
  - `/api/docs/` - Swagger UI
  - `/api/redoc/` - ReDoc
  - `/api/schema/` - OpenAPI 스키마

#### OpenAPI 문서화
- drf-spectacular 연동 완료
- 모든 엔드포인트에 한글 설명 추가
- Swagger UI 및 ReDoc 자동 생성

---

### 코드 품질 관리

#### 설치된 도구
- black - 코드 포매터
- isort - Import 정렬
- flake8 - 린터
- pre-commit - Git 훅

#### 설정 파일
- `pyproject.toml` - black, isort 설정
- `.gitignore` - Git 제외 파일

#### Scripts 폴더
- `scripts/format.sh` - 코드 포맷팅 (isort + black)
- `scripts/lint.sh` - 린트 체크 (flake8)
- `scripts/check-all.sh` - 커밋 전 전체 체크

**사용법:**
```bash
# 커밋 전 모든 체크 실행
scripts/check-all.sh
```

---

## 📋 남은 작업

### 우선순위 1: Admin 패널 커스터마이징 ⭐ ✅ 완료
**목적:** Django Admin을 통해 데이터를 쉽게 관리

**작업 내용:**
- [x] User, UserPersonality Admin 등록
- [x] Interest, InterestCategory Admin 등록
- [x] MatchingRequest, MatchingResult Admin 등록
- [x] Connection Admin 등록
- [x] 검색, 필터, 정렬 기능 추가
- [x] Inline 편집 기능 (User 편집 시 Personality, InterestCategory 편집 시 Interest, MatchingRequest 편집 시 MatchingResult)
- [x] 커스텀 액션 추가 (매칭 활성/비활성, 매칭 요청 취소, 연결 수락/거절)
- [x] 읽기 쉬운 표시 형식 설정 (list_display, autocomplete_fields)

**완료 내용:** `backend/apps/users/admin.py`, `backend/apps/matching/admin.py` 작성 완료. `python manage.py check`로 admin.E039(autocomplete 대상 search_fields 누락) 등 검증 통과. `scripts/format.sh`, `scripts/lint.sh` 통과.

---

### 우선순위 2: 매칭 알고리즘 구현 ⭐⭐⭐ ✅ 완료
**목적:** 세밀한 취향 기반 가중치 매칭 로직

**작업 내용:**
- [x] 매칭 알고리즘 서비스 클래스 생성
  - `apps/matching/services.py`

- [x] 점수 계산 로직 구현
  - [x] 관심사 일치도 계산 (공통 관심사 커버리지 60% + 레벨 유사도 40%)
  - [x] 성격 호환성 점수 (MBTI 일치도 40% + 성향 척도 유사도 60%, 정보 없으면 중립 50점)
  - [x] 위치 기반 점수 (같은 지역이면 100점, 아니면 0점)
  - [x] 최종 가중치 매칭 점수 산출 (관심사 50% + 성격 30% + 위치 20%)

- [x] 매칭 요청 처리 로직 (`process_matching_request`)
  - [x] MatchingRequest 상태를 PROCESSING으로 변경
  - [x] 조건에 맞는 후보 사용자 필터링 (본인/차단 관계 제외, 나이 범위, `is_active_for_matching`)
  - [x] 각 후보에 대한 점수 계산
  - [x] MatchingResult 생성 (상위 N명, `bulk_create`)
  - [x] MatchingRequest 상태를 COMPLETED로 변경

- [x] 쿼리 최적화
  - [x] select_related("personality"), prefetch_related("user_interests") 적용
  - [x] N+1 쿼리 문제 해결 (요청자 관심사는 dict로 1회 조회, 후보별 재조회 없음)

- [x] `MatchingRequestViewSet.perform_create`에서 생성 즉시 알고리즘 실행하도록 연결

**완료 내용:** `backend/apps/matching/services.py` 작성. `python manage.py check` 통과, `scripts/format.sh`/`scripts/lint.sh` 통과. Django shell에서 트랜잭션 롤백 방식으로 실제 DB 스키마 대상 동작 검증 완료 (비활성 사용자 제외, 나이 필터 적용, 유사도 높은 후보가 더 높은 점수를 받는 것 확인).

**참고:** 현재는 요청/응답 사이클 내에서 동기 처리됨. 후보 수가 많아지면 Celery 등 비동기 처리로 전환 고려 필요 (선택 사항).

---

### 우선순위 3: 서버 실행 및 테스트 ✅ 완료
**작업 내용:**
- [x] 슈퍼유저 생성 (`admin` / `jjlee030415@gmail.com`, 비밀번호는 로컬에만 전달됨 — 필요시 `changepassword`로 변경)

- [x] 개발 서버 실행 및 확인
  - `/admin/`, `/api/docs/`, `/api/redoc/`, `/api/schema/` 모두 200 OK 확인

- [x] 매칭 기능 E2E 테스트 (Django test client + 트랜잭션 롤백으로 DB 오염 없이 검증)
  - 회원가입 (`POST /api/v1/users/users/`) → 로그인 → 익명 접근 차단(403) 확인
  - 프로필 완성 (`PATCH /api/v1/users/users/{id}/`, 성격/관심사 등록) → `check_profile_completion`으로 완성 여부 확인
  - 매칭 요청 생성 (`POST /api/v1/matching/requests/`) → 즉시 `COMPLETED` 상태로 전환, 알고리즘 정상 채점 확인
  - 매칭 결과 조회 (`GET /api/v1/matching/results/`) → 동일 관심사/성격/지역 후보가 100점(관심 100/성격 100/위치 100)으로 매칭됨을 확인
  - 연결 요청 생성 → 상대방 `received` 목록 노출 → `respond`(accept) 처리 후 상태 `ACCEPTED` 확인

**진행 중 발견 및 수정한 버그:**
- `config/urls.py`에 `debug_toolbar` 미들웨어는 등록돼 있었지만 `djdt` 네임스페이스 URL(`__debug__/`)이 urlconf에 없어 `DEBUG=True`인 모든 요청이 500 에러를 반환하던 문제 발견 → `DEBUG`이고 `debug_toolbar`가 설치된 경우에만 `path("__debug__/", include(debug_toolbar.urls))`를 조건부로 추가해 해결.

**예상 소요 시간:** 1-2시간

---

### 우선순위 4: CI/CD 구축 ⭐⭐ ✅ 완료
**작업 내용:**
- [x] GitHub Actions 워크플로우 설정
  - `.github/workflows/ci.yml` 생성 (push to main/feature, PR to main에서 트리거)
  - postgres:15 서비스 컨테이너 위에서 black/isort/flake8 → `manage.py check` → `pytest`(커버리지 포함) 순으로 실행
  - 커버리지 리포트를 아티팩트로 업로드

- [x] Docker 컨테이너화
  - `docker/Dockerfile` — poetry 기반 멀티스테이지 빌드 (`builder`/`builder-dev` → `base` → `dev`/`runtime` 타깃), non-root 유저로 실행
  - `docker/entrypoint.sh` — DB 연결 대기 → (prod만) 보안 체크 → migrate → collectstatic → 커맨드 실행
  - `docker-compose.yml`(개발용, `target: dev`, runserver + 코드 볼륨 마운트) / `docker-compose.prod.yml`(운영용, `target: runtime`, gunicorn, `.envs/.env.prod` 사용)
  - `.dockerignore` 추가
  - 로컬(Apple Silicon)에서 `docker build`/`docker compose up`으로 dev·prod 이미지 모두 직접 빌드·기동해 `/admin/`, `/api/docs/`, `/api/schema/` 200 OK 확인 완료

- [x] 프로덕션 배포 준비
  - `collectstatic`은 entrypoint에서 컨테이너 기동 시 자동 실행
  - 환경 변수 검증: django-environ이 `SECRET_KEY`/`DB_*` 등 필수값 누락 시 즉시 `ImproperlyConfigured`로 실패 (기존 구조 활용)
  - 보안 체크리스트: entrypoint가 prod 설정일 때 `manage.py check --deploy --tag security --fail-level WARNING`을 실행해 약한 `SECRET_KEY`, `SECURE_SSL_REDIRECT` 미설정 등을 컨테이너 기동 전에 차단하도록 검증 완료

**진행 중 발견 및 수정한 버그:**
- `whitenoise`가 `pyproject.toml`의 dev 그룹에만 있어서, dev 의존성을 제외한 프로덕션 이미지가 `ModuleNotFoundError: No module named 'whitenoise'`로 기동 실패하는 문제 발견 → main 의존성으로 이동, `poetry.lock` 재생성.
- `dev.py`로 `manage.py test`/CI 테스트 실행 시 `debug_toolbar.E001`(DEBUG=False로 강제되는 테스트 환경과 충돌)로 실패하는 문제 발견 → `DEBUG_TOOLBAR_CONFIG["IS_RUNNING_TESTS"] = False` 추가로 해결.
- `wsgi.py`/`asgi.py`가 `DJANGO_SETTINGS_MODULE` 미설정 시 존재하지 않는 `config.settings` 모듈로 폴백하던 문제 발견 → `config.settings.prod`로 수정 (실제 배포 시 이 파일들이 쓰이는 진입점이므로).
- Apple Silicon(Docker Desktop) 환경에서 arm64용 `rpds-py` 휠이 `Illegal instruction`으로 크래시하는 문제 발견 → 이미지 빌드/실행을 `linux/amd64`(에뮬레이션)로 고정해 회피 (docker-compose 파일에 주석으로 근거 명시).

**참고:** `docker-compose.prod.yml`은 `docker compose --env-file .envs/.env.prod -f docker-compose.prod.yml up -d --build`로 실행해야 함 (`--env-file`이 있어야 compose 파일의 `${DB_NAME}` 등 변수 치환이 동작).

---

### 추가 작업: 로그인 브루트포스 방어 (django-axes) ✅ 완료
**목적:** 세션 기반 로그인(`/api/v1/auth/login/`)에 무차별 대입 공격 방어 추가

**작업 내용:**
- [x] `django-axes` 도입 (main 의존성)
- [x] username+IP **조합** 기준 5회 실패 시 1시간 잠금 (`AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]`)
- [x] 성공 로그인 시 실패 카운트 초기화 (`AXES_RESET_ON_SUCCESS`)

**진행 중 발견 및 수정한 버그:**
- `AXES_LOCKOUT_PARAMETERS`를 처음에 `["username", "ip_address"]`(flat list)로 설정했는데, 이는 django-axes에서 "username 단독 OR IP 단독" 잠금을 의미하는 레거시 문법(`AXES_LOCK_OUT_BY_USER_OR_IP`)이었음. 실제로 재현해보니 한 계정이 잠기면 **같은 IP를 쓰는 다른 계정까지 함께 잠기는** 문제가 있어, "조합" 잠금을 뜻하는 중첩 리스트 `[["username", "ip_address"]]`로 수정.

**검증:** 로컬 서버에 대해 회원가입→로그인→인증 요청→로그아웃, 임계치 미만 실패 후 정상 로그인, 5회 실패 시 잠금(429)과 정답 비밀번호도 거부됨, 같은 IP의 다른 계정은 영향 없음, admin 로그인 정상, `axes_reset`/`axes_reset_username` 복구까지 직접 재현해 확인함. 이후 `apps/users/tests/test_auth_api.py`에 회귀 테스트로 고정.

---

### 추가 작업: 모델-마이그레이션 드리프트 해소 ✅ 완료
`manage.py makemigrations --check`로 확인해보니 `matching`/`users` 모델(verbose_name 한글 라벨, choices 표시 텍스트, help_text, validators)이 마이그레이션에 반영되지 않은 채 남아있던 상태 발견. `status` 필드 2곳(`connection`, `matchingrequest`)에 `db_index=True`가 추가되어 인덱스가 새로 생기는 것 외에는 전부 비파괴적 변경. `makemigrations`로 정리 후 `--check --dry-run`으로 드리프트 없음 확인.

---

### 선택 사항: 추가 기능
- [x] 단위 테스트 작성 (pytest) — `apps/users/tests/`, `apps/matching/tests/`에 61개 테스트, 커버리지 89% (`apps`/`config` 기준). 모델, 회원가입/로그인/로그아웃, 로그인 잠금 회귀, 비밀번호 변경, 프로필 완성도, 매칭 알고리즘 점수 계산 + `process_matching_request` 통합, 매칭 요청 생성/취소/조회, 연결(친구) 요청/응답 API 커버. CI도 `manage.py test`(새 pytest 스타일 테스트를 인식 못 함) 대신 `pytest`를 실행하도록 변경.
- [ ] API 응답 캐싱 (Redis)
- [ ] 로깅 시스템 강화
- [ ] 이메일 알림 기능
- [ ] 프로필 이미지 최적화

---

## 📝 중요 명령어

### 개발 환경
```bash
# 가상환경 활성화 (자동)
# Poetry가 자동으로 관리

# 서버 실행
cd backend
python manage.py runserver

# 마이그레이션
python manage.py makemigrations
python manage.py migrate

# 슈퍼유저 생성
python manage.py createsuperuser

# Django 쉘
python manage.py shell
```

### 코드 품질
```bash
# 커밋 전 전체 체크
scripts/check-all.sh

# 개별 실행
scripts/format.sh  # 포맷팅
scripts/lint.sh    # 린트
```

### 테스트
```bash
# 저장소 루트에서 실행 (pyproject.toml의 pythonpath 설정 기준)
poetry run pytest

# 특정 파일/테스트만
poetry run pytest backend/apps/users/tests/test_auth_api.py -q
```

### Docker
```bash
# 개발 환경 (runserver + PostgreSQL)
docker compose up -d --build

# 프로덕션 환경 (gunicorn + PostgreSQL, .envs/.env.prod 사용)
docker compose --env-file .envs/.env.prod -f docker-compose.prod.yml up -d --build
```

### 데이터베이스
```bash
# PostgreSQL 접속
psql matching_db

# 테이블 목록 확인
psql matching_db -c "\dt"
```

---

## 🗂️ 프로젝트 구조

```
matching-api/
├── .envs/              # 환경 변수 (Git 제외)
│   ├── .env.dev       # 개발 환경
│   └── .env.prod      # 프로덕션 환경
├── backend/
│   ├── apps/
│   │   ├── users/     # 사용자 앱
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   └── matching/  # 매칭 앱
│   │       ├── models.py
│   │       ├── serializers.py
│   │       ├── views.py
│   │       └── urls.py
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   └── prod.py
│   │   └── urls.py
│   └── manage.py
├── scripts/           # 자동화 스크립트
│   ├── format.sh
│   ├── lint.sh
│   └── check-all.sh
├── docs/             # 문서
│   └── progress.md   # 이 파일
├── pyproject.toml    # Poetry 설정
└── .gitignore
```

---

## 📚 참고 자료

### Django 공식 문서
- Models: https://docs.djangoproject.com/en/5.0/topics/db/models/
- Admin: https://docs.djangoproject.com/en/5.0/ref/contrib/admin/
- Queries: https://docs.djangoproject.com/en/5.0/topics/db/queries/

### DRF 공식 문서
- Serializers: https://www.django-rest-framework.org/api-guide/serializers/
- ViewSets: https://www.django-rest-framework.org/api-guide/viewsets/
- Routers: https://www.django-rest-framework.org/api-guide/routers/

### drf-spectacular
- https://drf-spectacular.readthedocs.io/

---

## 💡 다음 세션 시작 시

1. 이 문서(`docs/progress.md`) 읽기
2. 현재 진행 상황 확인
3. 우선순위에 따라 작업 선택
4. 작업 완료 후 체크박스 업데이트

**추천 순서:**
1. ~~Admin 패널 커스터마이징 (빠르게 완성)~~ ✅ 완료
2. ~~매칭 알고리즘 구현 (핵심 기능)~~ ✅ 완료
3. ~~서버 실행 및 테스트~~ ✅ 완료
4. ~~CI/CD 구축~~ ✅ 완료
5. ~~로그인 브루트포스 방어, 마이그레이션 드리프트 해소, 단위 테스트 작성~~ ✅ 완료
6. (선택) API 응답 캐싱, 로깅 고도화, 이메일 알림, 프로필 이미지 최적화 중 우선순위 선택 ← 다음 작업
