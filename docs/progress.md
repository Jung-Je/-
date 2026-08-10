# 매칭 API 프로젝트 진행 상황

## 🚦 현재 상태 (마지막 업데이트: 2026-08-10)
연결(요청/수락/거절/차단) 화면 완성 — "받은 요청"(수락/거절/차단 액션)과 "보낸 요청"(상태 표시) 두 섹션. 매칭 결과 카드의 "연결하기" 버튼도 이번에 실제로 연결했다. 그 과정에서 `MatchingResult.is_contacted`/`contacted_at` 필드가 모델에만 있고 어디서도 세팅된 적이 없던 걸 발견해 연결 생성 시 반영하도록 백엔드를 고침. 2명으로 요청→연결하기→수락→상태 갱신 전체 루프를 브라우저로 검증 완료. 이걸로 로그인부터 연결까지 핵심 사용자 흐름이 전부 이어짐. 다음 세션은 "📋 다음 작업"에서 이어서 시작.

- 커밋 상태: 연결 화면 + 백엔드 is_contacted 수정이 아직 커밋 전
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
- [x] 관심사 카테고리·관심사 시드 명령어 (`python manage.py seed_interests`, 멱등) — 카테고리 6개·관심사 30개, 온보딩 관심사 단계를 실제로 테스트하려면 필요
- [x] `MatchingResult.is_contacted`/`contacted_at` 실제 반영 — 모델·시리얼라이저·어드민에 다 있었지만 세팅하는 코드가 없던 죽은 필드였음. 연결 요청 생성 시(`ConnectionViewSet.perform_create`) matching_result가 있으면 갱신하도록 수정
- [x] JSON 로그인/로그아웃 API (`apps/users/auth_views.py`) — axes 브루트포스 잠금 응답을 프론트 계약(403)에 맞춤, DRF Request 래퍼로 인해 axes 잠금 플래그가 미들웨어에 전달되지 않던 버그 수정
- [x] 로그인 화면 ↔ 백엔드 실동작 검증 — `CSRF_TRUSTED_ORIGINS` 미설정으로 프론트(:3000)/백엔드(:8000) 간 인증된 요청(로그아웃 등)이 전부 CSRF Origin 검증에 막히던 버그 발견/수정 (pytest 기본 클라이언트는 Origin 헤더를 안 보내 못 잡던 문제)

**프론트엔드**
- [x] React + Vite + TypeScript 스캐폴드 (`frontend/`), dev 서버 포트 3000
- [x] 로그인 화면 — 폼/에러/로딩/성공 상태, WCAG AA 대비, 키보드 포커스
- [x] 회원가입 화면 — 닉네임/이메일/비밀번호만 받고 가입 즉시 자동 로그인 (이름·관심사 등 프로필은 온보딩 단계로 미룸)
- [x] API 클라이언트 (`frontend/src/lib/apiClient.ts`) — 로그인 API 계약을 먼저 확정해 백엔드 구현 전에 맞춰 짜둠. DRF 필드별 검증 오류(`{field: [msg]}`)에서 첫 메시지를 뽑아 보여주는 공통 로직 포함
- [x] 디자인 시스템 기록 (`DESIGN.md`, `.impeccable/design.json`) — "포토카드 바인더" 세계관
- [x] 프론트엔드 구조를 도메인(`features/`) 기반으로 재편 — `app/`(라우팅 진입점)·`features/<도메인>/`(api·components·types)·`lib/`(외부 통신)·`components/`(도메인 무관 공용 UI). 새 도메인(매칭·연결 등) 추가 시 `features/`에 폴더만 늘리면 되는 구조
- [x] 비밀번호 재설정 화면 — 이메일 요청/새 비밀번호 확인 두 단계를 `ResetPasswordForm` 하나가 URL 쿼리(`uid`/`token`)로 분기해서 처리, `AuthScreen` 재사용
- [x] 로그인 상태 전역 확인 — `useCurrentUser` 훅(`features/auth/hooks/`)이 마운트 시 `GET /users/me/`로 실제 세션을 확인. `/onboarding`은 이 훅으로 비로그인 접근을 로그인 화면으로 돌려보냄
- [x] 온보딩("내 카드 만들기") 3단계 마법사 (`features/onboarding/`) — 프로필(성별/생년월일/지역/자기소개) → 성격(MBTI/성향 3개/가치관, 전부 선택) → 관심사(카테고리별 선택, 1개 이상 필수) → `check_profile_completion` 호출. 매칭 가중치 3색 체계(관심사=코랄 50%·성격=바이올렛 30%·위치=틸 20%, DESIGN.md)를 각 단계 카드 윗선 색에 반영. 이미 카드가 완성된 사용자는 재방문 시 마법사를 건너뛰고 바로 완료 화면
- [x] 매칭 요청·결과 화면 (`features/matching/`) — 요청 폼(나이/지역/최대 결과 수, 전부 선택) 제출 시 백엔드가 동기 처리로 즉시 채점까지 끝내므로 바로 결과를 보여줌. 결과 카드는 점수 등급별 그라디언트 배지(DESIGN.md가 허용한 스킨모피즘), 공통 관심사 칩, 펼치면 점수 상세(관심사/성격/지역별)와 MBTI를 보여주고 첫 펼침에서 `is_viewed`를 서버에 반영. 로그인 가드는 `RequireAuth` 컴포넌트로 추출해 온보딩과 공유
- [x] 연결(요청/수락/거절/차단) 화면 (`features/connections/`) — "받은 요청"(수락/거절/차단)·"보낸 요청"(상태 표시) 두 섹션, 응답하면 로컬에서 바로 목록에서 걷어냄. 매칭 결과 카드의 "연결하기" 버튼이 이 기능으로 실제 연결됨

---

## 📋 다음 작업
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
│       ├── app/                # 라우팅 진입점 (Django urls.py에 해당) — page.tsx는 얇게, 로직은 features/로
│       │   ├── login/page.tsx
│       │   ├── signup/page.tsx
│       │   └── reset-password/page.tsx
│       ├── features/           # 도메인별 기능 묶음 (Django apps에 해당)
│       │   └── auth/             # api/ · components/ · types.ts
│       ├── components/        # 도메인 무관 공용 UI (아이콘, 워드마크, 플레이스홀더)
│       ├── lib/                # 외부 통신 계층 (apiClient.ts — fetch 래퍼 + CSRF + 에러 처리)
│       └── styles/            # 전역 디자인 토큰 (tokens.css)
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
