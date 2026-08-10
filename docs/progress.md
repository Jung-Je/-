# 매칭 API 프로젝트 진행 상황

## 🚦 현재 상태 (마지막 업데이트: 2026-08-10)
인앱 메시징 완성 — 별도 "대화방" 모델 없이 수락된(ACCEPTED) `Connection`을 그대로 대화방으로 재사용. 대화 목록(`/messages`, 안 읽음 배지·마지막 메시지 미리보기)과 1:1 스레드(`/messages/:connectionId`, 말풍선, Enter로 전송)를 새로 만들었고, 매칭 결과의 "연결하기"·연결 목록의 "메시지" 버튼에서 자연스럽게 이어지도록 배선함.

이 작업 중 진짜 버그를 하나 발견해 고침: `received`(받은 요청) API는 대기중(PENDING)인 요청만 반환하도록 설계돼 있어서, 요청을 받은 쪽이 수락한 뒤엔 그 연결이 자기 목록에서 아예 사라졌음 — 대화 목록을 두 사용자 모두에게 보여주려면 상태·방향 무관하게 전체를 가져오는 `listAllConnections`(기본 list 액션)가 필요했음. 브라우저로 두 사용자 간 메시지 전송/수신/읽음 처리/배지 갱신까지 전부 검증 완료. 실시간 갱신은 아직 없음(전송 시점/화면 진입 시점에만 동기화, 폴링·웹소켓 없음) — 다음 개선 후보.

프론트엔드 Docker화도 완료 — `docker/Dockerfile.frontend`(dev: 라이브 리로드, prod: `npm run build` 결과를 nginx로 서빙 + SPA 라우팅용 `try_files` fallback), `docker-compose.yml`/`docker-compose.prod.yml`에 `frontend` 서비스 추가. 검증 중 `.envs/.env.prod`의 실제 버그도 발견해 고침 — `SECRET_KEY` 안의 `$` 문자가 `docker compose --env-file`의 변수 치환 과정에서 조용히 사라지고 있었음(`docker compose config`로 실제 주입값이 깨지는 걸 확인). `$` 없는 새 키로 교체하고 파일에 경고 메모 남김. `FRONTEND_URL`이 `.env.prod`에 아예 없어서 프로덕션에서도 비밀번호 재설정 이메일이 `localhost:3000`을 가리킬 뻔한 것도 같이 채움. `docker compose up`으로 DB+Redis+백엔드+프론트 전체 스택을 실제로 띄워 로그인까지 curl로 검증(로컬 5432/6379 포트 충돌 피하려 임시 포트로 검증 후 정리).

- 커밋 상태: 인앱 메시징 + 프론트 Docker화가 아직 커밋 전
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
- [x] Docker 컨테이너화 — 백엔드(dev/prod 멀티스테이지, 프로덕션 보안 체크 게이트) + 프론트엔드(`docker/Dockerfile.frontend`, dev: 라이브 리로드 / prod: nginx 정적 서빙 + SPA `try_files` fallback), `docker-compose.yml`/`docker-compose.prod.yml`에 둘 다 통합. `docker compose up`으로 스택 전체(DB+Redis+백엔드+프론트) 기동 검증 완료
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
- [x] 메시지 모델 (`apps/matching/models.py Message`) — 별도 대화방 모델 없이 ACCEPTED `Connection`을 그대로 대화방으로 재사용. `ConnectionViewSet.messages`(GET/POST 겸용 커스텀 액션)로 목록 조회·전송, 조회 시 상대방이 보낸 안 읽은 메시지를 자동으로 읽음 처리. `ConnectionSerializer`에 `unread_message_count`/`last_message`(SerializerMethodField) 추가해 대화 목록에서 스레드를 안 열어도 미리보기 가능
- [x] `.envs/.env.prod` 보완 — `FRONTEND_URL`이 아예 없어서 프로덕션에서도 비밀번호 재설정 이메일이 `localhost:3000`을 가리킬 뻔했던 것 채움. `SECRET_KEY`에 든 `$` 문자가 `docker compose --env-file` 변수 치환 과정에서 조용히 사라지던 것도 발견해 `$` 없는 새 키로 교체 + 파일에 경고 메모 추가
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
- [x] 설정 화면 (`features/settings/`) — 프로필 편집(매칭 노출 토글 포함)·비밀번호 변경(세션 유지)·회원 탈퇴(타이핑 확인 후 실행). 공용 `AppNav`(`components/`)를 매칭·연결·설정 세 화면에 붙여 처음으로 화면 간 이동 수단이 생김
- [x] 인앱 메시징 (`features/messaging/`) — 대화 목록(안 읽음 배지·마지막 메시지 미리보기, `/messages`)과 1:1 스레드(말풍선 UI·Enter 전송, `/messages/:connectionId`). `AppNav`에 "메시지" 추가, 매칭 결과 카드의 "연결하기"·연결 카드의 "메시지" 버튼과 연동. `listReceivedConnections`가 PENDING만 반환해 수락 후 상대방 목록에서 대화가 사라지던 버그 발견/수정(`listAllConnections`로 교체)

---

## 📋 다음 작업
최초 로드맵(인증 3종 + 온보딩 + 매칭 + 연결 + 설정)에 이어 인앱 메시징까지 완료. 다음 세션 시작 시 사용자와 함께 방향을 다시 정할 것 — 후보:
- [ ] 메시징 실시간화 — 지금은 전송/화면 진입 시점에만 동기화되고 폴링·웹소켓이 없어 상대가 보낸 메시지가 새로고침 전엔 안 보임
- [ ] 매칭/연결 결과에 알림(뱃지·읽음 표시) 추가
- [ ] E2E 테스트 자동화 (지금까지는 매 기능마다 수동으로 브라우저 검증)
- [ ] 배포 준비 (prod 빌드 점검, 환경변수 정리)

### 보류 중
- [ ] 프로필 이미지 업로드 UI — **S3 연결 후 진행**. 백엔드 이미지 최적화(리사이즈/EXIF 보정/JPEG 재인코딩) 로직 자체는 이미 구현돼 있고, `config/settings/prod.py`에 `USE_S3`/`AWS_*` 설정 자리도 있지만 아직 실제 버킷·자격 증명이 연결되지 않음. S3 연결이 먼저 끝나야 온보딩/설정 화면에 업로드 UI를 붙이는 게 의미가 있음

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
# 개발 환경 (runserver + PostgreSQL + Redis + 프론트 dev 서버, 전부 --host 0.0.0.0으로 노출)
docker compose up -d --build
# → http://localhost:8000 (백엔드), http://localhost:3000 (프론트, 라이브 리로드)

# 프로덕션 환경 (gunicorn + PostgreSQL + Redis + nginx로 서빙되는 프론트 정적 빌드, .envs/.env.prod 사용)
docker compose --env-file .envs/.env.prod -f docker-compose.prod.yml up -d --build
```
로컬에 Postgres(5432)/Redis(6379)가 이미 떠 있으면 `db`/`redis` 컨테이너와 포트가 겹친다 — 그 경우 로컬 서비스를 잠깐 내리거나, `docker-compose.yml`을 오버라이드해서 다른 호스트 포트로 매핑해야 한다(컨테이너 간 통신은 내부 네트워크라 영향 없음).

`frontend`(`docker/Dockerfile.frontend`)는 `VITE_API_BASE_URL`을 빌드 타임에 JS 번들에 굳혀 넣는다 — Vite 환경변수라 백엔드처럼 런타임에 안 바뀜, 값을 바꾸면 재빌드 필요. `.envs/.env.prod`에 값 안의 리터럴 `$`를 이스케이프해야 하는 이유도 적어뒀음(`--env-file` 파싱 시 `$X`가 변수 참조로 해석돼 조용히 사라지는 함정 — 실제로 SECRET_KEY에서 겪고 고침).

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
├── .envs/                    # 환경 변수 (Git 제외) — .env.dev, .env.prod
├── .github/workflows/        # CI (GitHub Actions, 백엔드만 — 프론트는 아직 CI 미연결)
├── backend/
│   ├── apps/
│   │   ├── users/            # 사용자 앱 (인증, 프로필, 성격)
│   │   └── matching/          # 매칭 앱 (관심사, 매칭 요청/결과, 연결, 메시지)
│   │       └── management/commands/seed_interests.py
│   ├── config/
│   │   ├── settings/          # base.py, dev.py, prod.py
│   │   └── urls.py
│   └── manage.py
├── docker/
│   ├── Dockerfile              # 백엔드 (builder/builder-dev/base/dev/runtime 멀티스테이지)
│   ├── Dockerfile.frontend     # 프론트 (deps/dev/builder/runtime — runtime은 nginx)
│   ├── nginx.frontend.conf     # 프론트 prod 정적 서빙 + SPA try_files fallback
│   └── entrypoint.sh           # 백엔드 컨테이너 시작 스크립트 (migrate, collectstatic 등)
├── docker-compose.yml            # 개발 환경 (db/redis/web/frontend)
├── docker-compose.prod.yml       # 프로덕션 환경 (db/redis/web/frontend, .envs/.env.prod 필요)
├── frontend/                 # React + Vite + TypeScript
│   └── src/
│       ├── app/                # 라우팅 진입점 (Django urls.py에 해당) — page.tsx는 얇게, 로직은 features/로
│       │   ├── login/page.tsx, signup/page.tsx, reset-password/page.tsx
│       │   ├── onboarding/page.tsx, matching/page.tsx
│       │   ├── connections/page.tsx, settings/page.tsx
│       │   └── messages/page.tsx, messages/thread/page.tsx
│       ├── features/           # 도메인별 기능 묶음 (Django apps에 해당) — 각 api/ · components/ · types.ts
│       │   ├── auth/             # 로그인/가입/재설정, useCurrentUser, RequireAuth
│       │   ├── onboarding/       # 내 카드 만들기 3단계 마법사
│       │   ├── matching/         # 매칭 요청/결과
│       │   ├── connections/      # 연결 요청/수락/거절/차단
│       │   ├── settings/         # 프로필/비밀번호/계정
│       │   └── messaging/        # 대화 목록/1:1 스레드
│       ├── components/        # 도메인 무관 공용 UI (아이콘, 워드마크, AppNav, 플레이스홀더)
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
