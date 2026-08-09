# 매칭 API 프로젝트 진행 상황

## 🚦 현재 상태 (마지막 업데이트: 2026-08-09)
로그인 화면 ↔ 백엔드 API 실동작 확인 완료 — 실제 백엔드/프론트 dev 서버를 띄우고 브라우저로 틀린 비밀번호(에러 메시지 노출)/정상 로그인(성공 화면) 흐름을 눈으로 검증했음. 다음 세션은 "📋 다음 작업"에서 이어서 시작.

- 커밋 상태: `CSRF_TRUSTED_ORIGINS` 버그 수정 + 회귀 테스트가 아직 커밋 전
- 각 기능의 상세 구현 배경/발견한 버그/검증 방법은 `git log`의 커밋 메시지 참고 (커밋 메시지에 자세히 적어둠)
- 프론트엔드 화면 설계 방향은 `PRODUCT.md`/`DESIGN.md` 참고 (impeccable shape 브리프로 확정한 "포토카드 바인더" 세계관)

## 프로젝트 개요
매칭 API 서버 + 프론트엔드
- 친구/네트워킹 매칭 시스템
- 백엔드: Django + DRF, PostgreSQL, Redis, OpenAPI 3.0 자동 문서화 (drf-spectacular)
- 프론트엔드: React + Vite + TypeScript (`frontend/`, 착수 단계)

---

## ✅ 완료된 기능

**핵심 백엔드**
- [x] Django 프로젝트 구조, Poetry 의존성 관리, 환경별 settings (base/dev/prod)
- [x] 모델 8개: User, UserPersonality, InterestCategory, Interest, UserInterest, MatchingRequest, MatchingResult, Connection
- [x] DRF Serializer/ViewSet/URL 전체, Swagger UI / ReDoc 자동 문서화
- [x] Django Admin 커스터마이징 (검색/필터/인라인/커스텀 액션)
- [x] 취향·성격·위치 기반 가중치 매칭 알고리즘 (`apps/matching/services.py`)
- [x] 코드 품질 도구 (black/isort/flake8, `scripts/*.sh`)

**CI/CD & 인프라**
- [x] GitHub Actions CI (`.github/workflows/ci.yml`) — format/lint/check/pytest, postgres+redis 서비스
- [x] Docker 컨테이너화 — dev/prod 멀티스테이지, `docker-compose.yml`/`docker-compose.prod.yml`, 프로덕션 보안 체크 게이트
- [x] pytest 테스트 스위트 97개, 커버리지 90%
- [x] 테스트/빌드 산출물(staticfiles, 로그, 커버리지, pytest 캐시)을 `var/` 한 곳으로 통합

**보안 & 기능 확장**
- [x] 로그인 브루트포스 방어 (django-axes)
- [x] 모델-마이그레이션 드리프트 해소
- [x] 비밀번호 재설정 (이메일, `password_reset` / `password_reset_confirm`)
- [x] 연결 요청/수락 이메일 알림 (`apps/matching/notifications.py`)
- [x] 로깅 강화 (gunicorn 액세스 로그, 주요 비즈니스 이벤트 로그)
- [x] API 응답 캐싱 (Redis, 관심사 카테고리/관심사 목록·상세만)
- [x] 프로필 이미지 최적화 (리사이즈/EXIF 보정/JPEG 재인코딩)
- [x] JSON 로그인/로그아웃 API (`apps/users/auth_views.py`) — axes 브루트포스 잠금 응답을 프론트 계약(403)에 맞춤, DRF Request 래퍼로 인해 axes 잠금 플래그가 미들웨어에 전달되지 않던 버그 수정
- [x] 로그인 화면 ↔ 백엔드 실동작 검증 — `CSRF_TRUSTED_ORIGINS` 미설정으로 프론트(:3000)/백엔드(:8000) 간 인증된 요청(로그아웃 등)이 전부 CSRF Origin 검증에 막히던 버그 발견/수정 (pytest 기본 클라이언트는 Origin 헤더를 안 보내 못 잡던 문제)

**프론트엔드**
- [x] React + Vite + TypeScript 스캐폴드 (`frontend/`), dev 서버 포트 3000
- [x] 로그인 화면 — 폼/에러/로딩/성공 상태, WCAG AA 대비, 키보드 포커스
- [x] API 클라이언트 (`frontend/src/api/`) — 로그인 API 계약을 먼저 확정해 백엔드 구현 전에 맞춰 짜둠
- [x] 디자인 시스템 기록 (`DESIGN.md`, `.impeccable/design.json`) — "포토카드 바인더" 세계관

---

## 📋 다음 작업
- [ ] 프론트: 회원가입 화면
- [ ] 프론트: 비밀번호 재설정 화면
- [ ] 프론트: 온보딩 — 내 카드 만들기 (프로필/관심사/성격 입력)
- [ ] 프론트: 매칭 요청·결과 화면
- [ ] 프론트: 연결(요청/수락/거절/차단) 화면
- [ ] 프론트: 설정 화면

---

## 📝 중요 명령어

### 개발 환경 (백엔드)
```bash
cd backend
python manage.py runserver

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py shell
```

### 개발 환경 (프론트엔드)
```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build
```

### 코드 품질
```bash
scripts/check-all.sh   # 커밋 전 전체 체크 (포맷팅 + 린트 + Django check)
scripts/format.sh      # 포맷팅만
scripts/lint.sh        # 린트만
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
# 개발 환경 (runserver + PostgreSQL + Redis)
docker compose up -d --build

# 프로덕션 환경 (gunicorn + PostgreSQL + Redis, .envs/.env.prod 사용)
docker compose --env-file .envs/.env.prod -f docker-compose.prod.yml up -d --build
```

### Redis (Docker 없이 로컬 개발 서버 실행 시)
```bash
brew services start redis   # macOS
redis-cli --scan --pattern 'matching_api*'   # 캐시 키 확인
```

### 데이터베이스
```bash
psql matching_db
psql matching_db -c "\dt"
```

---

## 🗂️ 프로젝트 구조

```
matching-api/
├── .envs/                    # 환경 변수 (Git 제외)
├── .github/workflows/        # CI (GitHub Actions)
├── backend/
│   ├── apps/
│   │   ├── users/            # 사용자 앱
│   │   └── matching/         # 매칭 앱
│   ├── config/
│   │   ├── settings/         # base.py, dev.py, prod.py
│   │   └── urls.py
│   └── manage.py
├── docker/                   # Dockerfile, entrypoint.sh
├── docker-compose.yml            # 개발 환경
├── docker-compose.prod.yml       # 프로덕션 환경
├── frontend/                 # React + Vite + TypeScript (신규, 착수 단계)
│   └── src/
│       ├── api/               # 백엔드 API 클라이언트
│       ├── components/        # 공용 컴포넌트 (아이콘, 워드마크 등)
│       ├── pages/              # 화면 단위 (LoginPage 등)
│       └── styles/            # 디자인 토큰 (tokens.css)
├── scripts/                  # format.sh, lint.sh, check-all.sh
├── docs/progress.md          # 이 파일
├── var/                      # 테스트/빌드 산출물 (Git 제외 — staticfiles, logs, htmlcov, .pytest_cache, .coverage)
├── PRODUCT.md                 # 프로덕트 컨텍스트 (impeccable)
├── DESIGN.md                  # 디자인 시스템 기록 (impeccable)
└── pyproject.toml
```

---

## 📚 참고 자료
- Django: https://docs.djangoproject.com/en/5.0/
- DRF: https://www.django-rest-framework.org/
- drf-spectacular: https://drf-spectacular.readthedocs.io/
- Vite: https://vite.dev/
- React: https://react.dev/
