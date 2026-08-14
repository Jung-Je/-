# 매칭 API 프로젝트 진행 상황

## 🚦 현재 상태 (마지막 업데이트: 2026-08-14)
"실제 서비스로 내놓기엔 UI가 너무 대충이다"라는 사용자 피드백으로 시작해서 여러 갈래로 이어짐: (1) impeccable 정식 크리틱으로 UI 전반 품질 문제 17개를 찾아 전부 처리, (2) "Django 기본 관리자 페이지는 실제 서비스에 못 쓴다"는 지적으로 스태프 전용 관리자 패널을 새로 구축(Phase 1 → Phase 2로 이어서 완료), (3) 관리자 REST API가 유지보수 관점에서 도메인 앱에 흩어져 있으면 안 된다는 지적으로 전용 `apps/staff` 앱으로 통합, (4) "회원가입이 성인부터인데 실제로 나이를 검증 안 한다"는 지적으로 카카오 로그인 연동 성인인증 추가.

**회원가입 성인인증 — 카카오 로그인 `age_range` 연동 (신규)** — `date_of_birth`는 "미래 날짜 아님"만 검증하고 최소 연령 자체는 전혀 확인 안 하던 걸 발견. PASS는 개발자가 셀프서비스로 못 붙이고(PG 대행사 사업자 계약 필요) 사업자등록도 없는 상태라, 대안으로 카카오 로그인의 `age_range`(연령대) 동의항목을 채택(사용자 확정 — 카카오 디벨로퍼스는 사업자등록 없이 무료 가입 가능):
- 회원가입 화면이 계정 정보 폼 대신 "카카오로 성인인증하기" 게이트로 먼저 막힘 → 카카오 동의 화면(전체 페이지 리다이렉트) → 콜백 라우트(`/auth/kakao/callback`)가 인가코드를 백엔드로 전달 → 토큰 교환 + `age_range` 조회 → 세션에 인증 플래그 저장 → 회원가입 폼 오픈
- `age_range`가 "15~19"처럼 19세를 포함하되 미만 나이도 섞인 구간이면 안전하게 거부 — 카카오가 문서화한 고정 성인 구간 집합("20~29" 이상)에 정확히 속할 때만 통과. PASS만큼 정밀하진 않지만 지금(검증 전혀 없음)보다는 실질적 방어
- **서버가 최종 관문** — `UserCreateSerializer.validate()`가 세션 플래그를 다시 확인해서, 프론트 게이트를 우회해 가입 API를 직접 호출해도 막힘. 가입 성공과 동시에 `User.kakao_id`/`is_adult_verified` 저장 + 세션 플래그 1회성 소모(같은 세션으로 계정 두 개 못 만듦)
- 새 서비스 모듈(`apps/users/services/kakao.py`), 새 뷰(`KakaoAgeVerificationView`, `/api/v1/auth/kakao/verify/`), `User` 모델 필드 2개(`kakao_id`/`is_adult_verified`, 마이그레이션), `requests` 의존성 신규 추가. 회귀 테스트 17개 추가(카카오 서비스 함수 목 테스트 + 세션 게이트 테스트, 총 212개 통과)
- **한계**: 카카오 REST API 키가 아직 없어서(사용자가 Kakao Developers에서 직접 발급 필요 — 계정 생성은 대신할 수 없는 영역) 실제 카카오 동의 화면까지 가는 라이브 E2E는 이번 세션 범위 밖. 백엔드는 카카오 HTTP 응답을 목 처리해서 검증했고, 프론트는 "키 미설정 시 안내" 게이트 상태와 콜백 에러 처리(코드 없음/설정 안 됨 응답이 실제로 화면까지 전파되는지)까지 라이브 브라우저로 확인 완료. 실제 카카오 계정으로 도는 전체 흐름은 사용자가 `KAKAO_CLIENT_ID`/`VITE_KAKAO_CLIENT_ID` 등을 채운 뒤 재검증 필요(`docs/progress.md` 아래 "다음 작업" 참고)

**관리자 REST API를 `apps/staff` 앱으로 통합 (리팩터링)** — Phase 1·2에서 만든 `Admin*ViewSet`/`Admin*Serializer`가 다루는 모델에 따라 `apps/users`(유저)·`apps/matching`(연결·관심사·매칭 요청)에 흩어져 있던 걸, 관리자 기능이 어디 있는지 한 곳에서 보이도록 전용 `apps/staff` 앱으로 옮김. 장고 내장 관리자 사이트(`/admin/`, 각 앱 `admin.py`의 `ModelAdmin`)는 대상 아님 — 모델을 소유한 앱에 그대로 두는 게 컨벤션이라 그건 안 건드림. 클래스 이름(`AdminUserViewSet` 등)은 그대로, import 경로만 절대경로로 바뀌었고 반대 방향 참조가 없어 순환 참조 없음. API 경로도 도메인 앱에서 분리되며 한 프리픽스로 통합됨: `/api/v1/{users,matching}/admin/...` → `/api/v1/staff/...`. 새 모델 없음(DB 스키마 변경 없음), 테스트는 위치만 옮겨서 195개 그대로 통과. 프론트 `staffApi.ts`는 URL 문자열만 새 경로로 갱신(화면·타입 무변경), 라이브 브라우저로 `/staff/*` 화면 4개 전부 재검증 완료.

**스태프 관리자 패널 Phase 2 (신규)** — Phase 1(유저 관리 + 연결·메시지 모더레이션)에 이어, Django admin이 지원하던 나머지 모델 중 운영 가치가 높은 4개(InterestCategory·Interest·MatchingRequest·MatchingResult)를 마저 옮김. UserInterest는 단순 유저↔관심사 태그라 별도 모더레이션 액션이 없어 스킵(유저 상세 화면에서 이미 노출 중):
- **관심사 관리** (`/staff/interests`): 카테고리·관심사 생성/삭제. Phase 1과 달리 민감 필드가 없는 콘텐츠 큐레이션이라 소비자용 시리얼라이저(`InterestCategorySerializer`/`InterestSerializer`)를 그대로 재사용, 새 Admin 시리얼라이저 없이 뷰만 추가. 카테고리 삭제 시 CASCADE로 관심사도 같이 지워지는데, 확인 버튼에 영향받는 관심사 수를 미리 보여줌. 카테고리 행을 펼치면 그 안 관심사 목록 + 추가 폼(인라인)
- **매칭 현황** (`/staff/matching-requests`): 참여자 제한 없이 전체 매칭 요청 조회(소비자용 API는 자기 요청만 봄 — 핵심 차이), status 필터·요청자명 검색, `PENDING`/`PROCESSING` 요청 취소(완료된 요청은 취소 불가, 서버가 400으로 막음). 상세 화면에서 해당 요청의 매칭 결과(점수 4종·공통 관심사 수·조회/연결시도 여부)를 표로 확인
- 새 DRF 뷰셋 3개(`AdminInterestCategoryViewSet`/`AdminInterestViewSet` ModelViewSet, `AdminMatchingRequestViewSet` ReadOnlyModelViewSet + `cancel`/`results` 커스텀 액션), 새 화면 3개(Phase 1의 `StaffLayout`/`ConfirmButton` 패턴 그대로 재사용), `StaffLayout` 탭 4개로 확장. DB 스키마 변경 없음. 백엔드 회귀 테스트 24개 추가(총 195개 통과), 라이브 브라우저로 카테고리·관심사 생성/삭제(CASCADE 확인 포함)·온보딩 화면에서 캐시 무효화 즉시 반영·매칭 요청 상태 필터·취소 2클릭→DB 반영·상세 화면 결과 표까지 전부 검증 완료. 이걸로 Django admin이 지원하던 9개 모델 전부(User·Connection·Message·InterestCategory·Interest·MatchingRequest·MatchingResult, UserPersonality/UserInterest는 상위 화면에 인라인으로 흡수) 자체 관리자 화면으로 이전 완료.

**UI 크리틱 (P0~P3, 17개 발견 → 15개 조치 + 2개는 검증 결과 실제 결함 아님으로 스킵)**
- P0(4): 404 라우트 부재로 안 맞는 URL이 빈 화면으로 떨어지던 문제, 온보딩 관심사 레벨(1~5) UI 부재(매칭 알고리즘이 실제로 쓰는 값인데 늘 3 고정 전송됐음), 코랄 텍스트 WCAG AA 대비 실패 다발, 이미 연결된 사람이 매칭 결과에 재노출돼도 "연결하기"가 그대로 뜨던 문제
- P1(3): 매칭 CTA가 토큰 주석과 다르게 틸이었던 것→코랄로, 점수 배지가 관심사/성격/위치 3색을 등급이라는 별개 의미로 재사용하던 것→독립 골드/실버/브론즈 팔레트로, 메시지 네비 뱃지 항상 0 고정→실제 안읽음 수 반영
- P2(4, CTA 폭 불일치는 컨텍스트상 정상 패턴이라 스킵): 온보딩 관심사 아이콘 이모지→authored SVG 6종, 온보딩 완료 화면이 첫방문/재방문 동일→첫 완료만 코랄 축하 상태, 아바타 색이 화면마다 다르던 것→중립 잉크로 통일, 메시지 스레드 헤더에 아바타 없음→추가
- P3(2, 메시지 빈 화면과 회원탈퇴 확인은 검증해보니 이미 정상/기존 구현이라 스킵): 미래 생년월일로 인한 "-1세" 노출→서버 검증+프론트 max 속성+표시 가드 3중 방어, DESIGN.md에 앱 셸(480px) 브레이크포인트 문서 누락 보완

**스태프 관리자 패널 Phase 1 (신규)** — Django `/admin/`은 DB를 거의 그대로 노출해 실제 운영(계정 정지, 부적절한 콘텐츠 검토)엔 부적합. 9개 모델 중 운영상 가장 급한 두 축부터 기존 React 앱 안에 새로 구축(별도 앱 안 띄움, 세션 인증 그대로 재사용):
- **유저 관리** (`/staff/users`): 검색/필터, 프로필·성격 인라인 확장, 계정 정지/해제·매칭풀 포함/제외 토글. `is_staff`/`is_superuser` 편집은 의도적으로 미제공(권한 상승은 Django `/admin/`이나 shell에서만) + 자기 자신 계정 정지 방지(서버 검증 + UI 비활성화 이중 방어)
- **연결·메시지 모더레이션** (`/staff/connections`): 참여자 아닌 연결도 전부 조회(소비자용 API와의 핵심 차이), 메시지 이력 조회(스태프가 봐도 상대방 안읽음 배지 안 줄어듦), 부적절한 메시지 삭제, 연결 상태 강제 변경(차단 등)
- 새 DRF 뷰셋 2개(`IsAdminUser` 권한), 새 화면 3개(`StaffLayout`+`ConfirmButton` 2클릭 확인 재사용 패턴), `AppNav`에 스태프 전용 "관리자" 탭. DB 스키마 변경 없음(기존 필드만 노출). 회귀 테스트 22개 추가, 라이브 브라우저로 전체 플로우(정지→DB 반영, 참여자 아닌 연결 조회, 메시지 삭제, 상태 강제 변경→DB 반영까지) 검증 완료. 관심사/매칭결과 등 나머지 7개 모델은 Phase 2로 보류.

전체 백엔드 테스트 스위트 212개(이번 세션 카카오 성인인증 신규 17개 포함) 통과.

이전엔 보안 점검(SECRET_KEY `#` 문자로 인한 무력화, 죽어있던 `ADMIN_URL` 설정, pillow/gunicorn 취약점 패치), 그 전엔 저장소 정리 + 사용자 제보 매칭 버그 2건, 그 전엔 matching/users 앱 내부 구조를 도메인별 패키지로 분리 — 자세한 내용은 `완료된 기능` 섹션과 `git log` 참고.

- 커밋 상태: 커밋 예정(이 문서 갱신 직후) — 이전 작업(스태프 관리자 패널 Phase 1·2, apps/staff 통합)은 PR #6으로 `origin/main`에 이미 머지 완료
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
- [x] 취향·성격·위치 기반 가중치 매칭 알고리즘 (`apps/matching/services/matching.py`)
- [x] 코드 품질 도구 (black/isort/flake8, `scripts/*.sh`)

**CI/CD & 인프라**
- [x] GitHub Actions CI (`.github/workflows/ci.yml`) — format/lint/check/pytest, postgres+redis 서비스
- [x] Docker 컨테이너화 — 백엔드(dev/prod 멀티스테이지, 프로덕션 보안 체크 게이트) + 프론트엔드(`docker/Dockerfile.frontend`, dev: 라이브 리로드 / prod: nginx 정적 서빙 + SPA `try_files` fallback), `docker-compose.yml`/`docker-compose.prod.yml`에 둘 다 통합. `docker compose up`으로 스택 전체(DB+Redis+백엔드+프론트) 기동 검증 완료
- [x] pytest 테스트 스위트 171개, 커버리지 96%
- [x] 테스트/빌드 산출물(staticfiles, 로그, 커버리지, pytest 캐시)을 `var/` 한 곳으로 통합

**보안 & 기능 확장**
- [x] 로그인 브루트포스 방어 (django-axes)
- [x] 모델-마이그레이션 드리프트 해소
- [x] 비밀번호 재설정 (이메일, `password_reset` / `password_reset_confirm`)
- [x] 연결 요청/수락 이메일 알림 (`apps/matching/services/notifications.py`)
- [x] 로깅 강화 (gunicorn 액세스 로그, 주요 비즈니스 이벤트 로그)
- [x] API 응답 캐싱 (Redis, 관심사 카테고리/관심사 목록·상세만)
- [x] 프로필 이미지 최적화 (리사이즈/EXIF 보정/JPEG 재인코딩)
- [x] 관심사 카테고리·관심사 시드 명령어 (`python manage.py seed_interests`, 멱등) — 카테고리 6개·관심사 30개, 온보딩 관심사 단계를 실제로 테스트하려면 필요
- [x] `MatchingResult.is_contacted`/`contacted_at` 실제 반영 — 모델·시리얼라이저·어드민에 다 있었지만 세팅하는 코드가 없던 죽은 필드였음. 연결 요청 생성 시(`ConnectionViewSet.perform_create`) matching_result가 있으면 갱신하도록 수정
- [x] 메시지 모델 (`apps/matching/models/connection.py Message`) — 별도 대화방 모델 없이 ACCEPTED `Connection`을 그대로 대화방으로 재사용. `ConnectionViewSet.messages`(GET/POST 겸용 커스텀 액션)로 목록 조회·전송, 조회 시 상대방이 보낸 안 읽은 메시지를 자동으로 읽음 처리. `ConnectionSerializer`에 `unread_message_count`/`last_message`(SerializerMethodField) 추가해 대화 목록에서 스레드를 안 열어도 미리보기 가능
- [x] `.envs/.env.prod` 보완 — `FRONTEND_URL`이 아예 없어서 프로덕션에서도 비밀번호 재설정 이메일이 `localhost:3000`을 가리킬 뻔했던 것 채움. `SECRET_KEY`에 든 `$` 문자가 `docker compose --env-file` 변수 치환 과정에서 조용히 사라지던 것도 발견해 `$` 없는 새 키로 교체 + 파일에 경고 메모 추가
- [x] JSON 로그인/로그아웃 API (`apps/users/views/auth.py`) — axes 브루트포스 잠금 응답을 프론트 계약(403)에 맞춤, DRF Request 래퍼로 인해 axes 잠금 플래그가 미들웨어에 전달되지 않던 버그 수정
- [x] 로그인 화면 ↔ 백엔드 실동작 검증 — `CSRF_TRUSTED_ORIGINS` 미설정으로 프론트(:3000)/백엔드(:8000) 간 인증된 요청(로그아웃 등)이 전부 CSRF Origin 검증에 막히던 버그 발견/수정 (pytest 기본 클라이언트는 Origin 헤더를 안 보내 못 잡던 문제)
- [x] Django 관리자(`/admin/`) 이메일 로그인 지원 — `apps/users/admin.py`의 `EmailOrUsernameAdminAuthenticationForm`(`admin.site.login_form`으로 등록)이 관리자 로그인 폼에 입력된 이메일을 실제 username으로 바꿔서 인증. 전역 `AUTHENTICATION_BACKENDS`/`USERNAME_FIELD`는 안 건드리고 관리자 로그인 폼에만 영향을 주도록 범위를 좁힘
- [x] 매칭 후보에 관리자 계정 노출 + "매칭 시작" 재클릭 시 결과 중복 누적 버그 수정 — 관리자(`is_staff`/`is_superuser`)를 후보 조회에서 명시적으로 제외하고, 매칭 결과 목록을 가장 최근 완료된 요청 것만 보여주도록 좁힘 (자세한 원인은 위 `현재 상태` 참고)
- [x] 보안 점검 — `.env.prod`의 `SECRET_KEY`가 `#` 때문에 런타임엔 14자로 잘려 로드되던 것 발견/교체, 죽어있던 `ADMIN_URL` 설정을 `urls.py`에 실제로 연결, `pillow`/`gunicorn` 알려진 취약점 패치 버전으로 업그레이드 (자세한 내용은 위 `현재 상태` 참고)

**프론트엔드**
- [x] React + Vite + TypeScript 스캐폴드 (`frontend/`), dev 서버 포트 3000
- [x] 로그인 화면 — 폼/에러/로딩/성공 상태, WCAG AA 대비, 키보드 포커스
- [x] 회원가입 화면 — 닉네임/이메일/비밀번호만 받고 가입 즉시 자동 로그인 (이름·관심사 등 프로필은 온보딩 단계로 미룸)
- [x] 회원가입 성인인증(카카오 로그인 `age_range` 연동) — 계정 정보 폼 앞에 카카오 인증 게이트를 세워서 만 19세 미만 가입을 막음. 서버 세션이 진짜 관문(`UserCreateSerializer.validate()`), 프론트 게이트는 UX일 뿐. `apps/users/services/kakao.py`(토큰 교환·age_range 판정), `KakaoAgeVerificationView`(`/api/v1/auth/kakao/verify/`), `User.kakao_id`/`is_adult_verified` 필드 추가. 카카오 REST API 키 발급 전까지는 회원가입 화면이 "성인인증 기능이 아직 설정되지 않았습니다" 안내만 보여줌 (자세한 내용은 위 `현재 상태` 참고)
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
- [x] 메시징 실시간화 (폴링) — 재사용 가능한 `usePolling` 훅(`lib/usePolling.ts`, 탭 백그라운드 시 일시정지·중복 호출 방지)으로 스레드는 3초·대화 목록은 5초마다 재조회. 스레드엔 "바닥 근처일 때만 자동 스크롤" 로직 추가. 검증 중 `#root`의 `min-height`/`height` 차이로 `.thread-messages` 내부 스크롤이 실제론 동작하지 않던 버그 발견/수정
- [x] 매칭/연결 알림 뱃지 — `NotificationSummaryView`(`GET /api/v1/matching/notifications/summary/`)가 안 본 매칭 결과 수·응답 안 한 받은 연결 요청 수를 집계. `AppNav`가 마운트 시 조회 + 20초 폴링으로 두 탭에 배지 표시. 새 모델·필드 없이 기존 `is_viewed`/`PENDING` 상태만 재사용해서, 결과를 펼치거나 요청에 응답하면 배지가 자연히 줄어듦
- [x] 테스트 인프라 (`npm run test`) — vitest + Testing Library + jsdom. 순수 함수(`apiClient.ts`)·컴포넌트(`CardStackMark.tsx`) 예시 테스트 각 1종
- [x] UI 크리틱 후속 조치 15건 — 404 페이지, 온보딩 관심사 레벨(1~5) UI, 코랄 텍스트 대비, 매칭 결과 카드 기존 연결 인지, 매칭 CTA 색, 점수 배지 골드/실버/브론즈 독립 팔레트, 메시지 뱃지, authored 관심사 아이콘, 온보딩 첫 완료 축하 상태, 아바타 색 통일, 메시지 스레드 헤더 아바타, 생년월일 미래 날짜 방어(서버+프론트 3중), DESIGN.md 브레이크포인트 문서 (자세한 내용은 위 `현재 상태` 참고)
- [x] 스태프 관리자 패널 Phase 1 (`features/staff/`) — Django `/admin/` 대신 세션 인증 그대로 쓰는 자체 관리자 화면. 유저 관리(`/staff/users`: 검색/필터/인라인 프로필·성격/정지·매칭풀 토글, `is_staff`/`is_superuser` 편집은 미제공, 자기잠금 방지), 연결·메시지 모더레이션(`/staff/connections`: 참여자 아닌 연결도 전체 조회, 메시지 이력·삭제, 상태 강제 변경). `StaffLayout`(소비자용 AppNav와 분리된 조용한 톤)·`ConfirmButton`(2클릭 확인, 4곳 재사용). `AppNav`에 스태프 전용 "관리자" 탭. 백엔드는 새 `IsAdminUser` 뷰셋 2개(`/api/v1/users/admin/users/`, `/api/v1/matching/admin/connections/`), DB 스키마 변경 없음
- [x] 스태프 관리자 패널 Phase 2 (`features/staff/`) — Phase 1에 이어 관심사 관리(`/staff/interests`: 카테고리·관심사 생성/삭제, CASCADE 영향 범위 사전 고지)와 매칭 현황(`/staff/matching-requests`: 전체 매칭 요청 조회·필터·검색·취소, 상세 화면에서 매칭 결과 표). 소비자용 시리얼라이저 재사용(민감 필드 없음)으로 새 Admin 시리얼라이저 불필요, 뷰·라우팅만 추가. `StaffLayout` 탭 4개로 확장(유저 관리·연결·메시지 관리·관심사 관리·매칭 현황). 새 DRF 뷰셋 3개, DB 스키마 변경 없음. 이걸로 Django admin이 지원하던 9개 모델 전부 자체 관리자 화면 이전 완료 (자세한 내용은 위 `현재 상태` 참고)
- [x] 관리자 REST API를 전용 `apps/staff` 장고 앱으로 통합 — Phase 1·2에서 `apps/users`·`apps/matching`에 흩어져 있던 `Admin*ViewSet`/`Admin*Serializer`를 한 곳으로 이동, API 경로도 `/api/v1/staff/...`로 통합(장고 내장 `/admin/`은 대상 아님). 클래스 이름 그대로, import·URL 프리픽스만 변경, DB 스키마 변경 없음, 테스트 195개 위치만 옮겨서 그대로 통과 (자세한 내용은 위 `현재 상태` 참고)

---

## 📋 다음 작업
최초 로드맵(인증 3종 + 온보딩 + 매칭 + 연결 + 설정)에 이어 인앱 메시징 + 실시간화(폴링) + 알림 뱃지, UI 크리틱 후속조치 17건, 스태프 관리자 패널(Phase 1·2 + `apps/staff` 통합), 회원가입 카카오 성인인증까지 완료. 다음 세션 시작 시 사용자와 함께 방향을 다시 정할 것 — 후보:
- [ ] **카카오 로그인 실제 키 발급 + 라이브 E2E 재검증** — 사용자가 [Kakao Developers](https://developers.kakao.com)에서 앱 생성 → `age_range` 동의항목 요청 → REST API 키를 `KAKAO_CLIENT_ID`(백엔드)·`VITE_KAKAO_CLIENT_ID`(프론트)에 채운 뒤, 실제 카카오 동의 화면까지 가는 전체 흐름(로그인 → 인가 → 콜백 → 가입)을 다시 확인해야 함 — 지금까지는 백엔드 목 테스트 + "미설정" 게이트 상태만 검증됨
- [ ] E2E 테스트 자동화 (지금까지는 매 기능마다 수동으로 브라우저 검증)
- [ ] 배포 준비 (prod 빌드 점검, 환경변수 정리)

### 보류 중
- [ ] 프로필 이미지 업로드 UI — **S3 연결 후 진행**. 백엔드 이미지 최적화(리사이즈/EXIF 보정/JPEG 재인코딩) 로직 자체는 이미 구현돼 있고, `config/settings/prod.py`에 `USE_S3`/`AWS_*` 설정 자리도 있지만 아직 실제 버킷·자격 증명이 연결되지 않음. S3 연결이 먼저 끝나야 온보딩/설정 화면에 업로드 UI를 붙이는 게 의미가 있음

---

## 📝 중요 명령어

### 개발 환경 (백엔드 + 프론트엔드 한 번에)
```bash
scripts/dev.sh   # runserver + vite dev를 같이 띄우고, Ctrl+C 한 번으로 둘 다 종료
```
Postgres/Redis가 (포트 5432/6379 기준으로) 안 떠 있으면 `brew services start`로 같이 띄워줌 — 이미 떠 있으면 그대로 두고 손 안 댐. 이 둘은 다른 터미널·다른 프로젝트도 같이 쓰는 상시 서비스라 스크립트 종료(Ctrl+C) 시에도 같이 안 내림. brew가 없거나 설치된 postgresql formula를 못 찾으면 경고만 띄우고 넘어가므로, 그 경우 직접 띄우거나(`brew services start postgresql@14`) `docker compose up -d db redis`로 대체 가능.

### 개발 환경 (백엔드만)
```bash
cd backend
python manage.py runserver

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py shell
```

### 개발 환경 (프론트엔드만)
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
├── .github/workflows/        # CI (GitHub Actions) — 백엔드(format/lint/check/pytest)·프론트엔드(oxlint/tsc/build) 둘 다 실행. 프론트는 vitest는 아직 CI에서 안 돌림
├── backend/
│   ├── apps/
│   │   ├── users/             # 사용자 앱 (인증, 프로필, 성격)
│   │   │   ├── models/         # user.py, personality.py
│   │   │   ├── serializers/    # user.py, auth.py
│   │   │   ├── views/          # user.py, auth.py(로그인/로그아웃/csrf)
│   │   │   └── services/       # image_processing.py(프로필 이미지 최적화), validators.py(비밀번호 검증기), kakao.py(회원가입 성인인증)
│   │   ├── matching/          # 매칭 앱 (관심사, 매칭 요청/결과, 연결, 메시지)
│   │   │   ├── models/         # interest.py, matching_request.py, connection.py
│   │   │   ├── serializers/    # interest.py, matching_request.py, connection.py
│   │   │   ├── views/          # interest.py, matching_request.py, connection.py, notification_summary.py
│   │   │   ├── services/       # matching.py(채점 알고리즘), notifications.py(이메일 알림)
│   │   │   └── management/commands/seed_interests.py
│   │   └── staff/              # 스태프 전용 관리자 REST API(모델 없음, users/matching 모델·소비자용 시리얼라이저 재사용)
│   │       ├── views/           # user.py, connection.py, interest.py, matching_request.py
│   │       └── serializers/     # user.py, connection.py
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
│       │   ├── auth/kakao/callback/page.tsx  # 회원가입 성인인증 콜백
│       │   ├── onboarding/page.tsx, matching/page.tsx
│       │   ├── connections/page.tsx, settings/page.tsx
│       │   ├── messages/page.tsx, messages/thread/page.tsx
│       │   └── staff/            # users/page.tsx, connections/{page,detail/page}.tsx, interests/page.tsx, matching-requests/{page,detail/page}.tsx
│       ├── features/           # 도메인별 기능 묶음 (Django apps에 해당) — 각 api/ · components/ · types.ts
│       │   ├── auth/             # 로그인/가입(카카오 성인인증 게이트 포함)/재설정, useCurrentUser, RequireAuth·RequireStaff
│       │   ├── onboarding/       # 내 카드 만들기 3단계 마법사
│       │   ├── matching/         # 매칭 요청/결과
│       │   ├── connections/      # 연결 요청/수락/거절/차단
│       │   ├── settings/         # 프로필/비밀번호/계정
│       │   ├── messaging/        # 대화 목록/1:1 스레드
│       │   └── staff/            # 스태프 관리자 화면 — StaffLayout·ConfirmButton(2클릭 확인) + 유저/연결·메시지/관심사/매칭현황 4개 화면
│       ├── components/        # 도메인 무관 공용 UI (아이콘, 워드마크, AppNav — 스태프에겐 "관리자" 탭 추가, 플레이스홀더)
│       ├── lib/                # 외부 통신 계층 (apiClient.ts — fetch 래퍼 + CSRF + 에러 처리, kakaoAuth.ts — 카카오 인가 URL 조립)
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
