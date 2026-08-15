# 매칭 API 프로젝트 진행 상황

## 🚦 현재 상태 (마지막 업데이트: 2026-08-15)
"실제 서비스로 내놓기엔 UI가 너무 대충이다"라는 사용자 피드백으로 시작해서 여러 갈래로 이어짐: (1) impeccable 정식 크리틱으로 UI 전반 품질 문제 17개를 찾아 전부 처리, (2) "Django 기본 관리자 페이지는 실제 서비스에 못 쓴다"는 지적으로 스태프 전용 관리자 패널을 새로 구축(Phase 1 → Phase 2로 이어서 완료), (3) 관리자 REST API가 유지보수 관점에서 도메인 앱에 흩어져 있으면 안 된다는 지적으로 전용 `apps/staff` 앱으로 통합, (4) "회원가입이 성인부터인데 실제로 나이를 검증 안 한다"는 지적으로 성인인증 추가 — 카카오 로그인을 먼저 시도했으나 사업자등록 요구에 막혀 자기신고 생년월일 검증으로 전환, (5) "카카오 REST API 키가 아깝다"는 지적으로 같은 앱을 성인인증과 무관한 카카오 소셜 로그인/가입 편의 기능으로 재활용 — 콘솔 설정(Redirect URI·Client Secret·동의항목)까지 실제로 끝내서 실 계정으로 가입 완료까지 라이브 검증됨, (6) "관리자에게 남기는 문의 창이 있으면 좋겠다"는 요청으로 유저→관리자 문의/신고/건의 기능 신규 구축, 이어서 "관리자가 댓글도 달 수 있어야 하는거 아니냐"는 지적으로 답변 기능까지 바로 추가, (7) "유저들끼리 게시글을 올려 소통할 수 있게 해달라"는 요청으로 카테고리별 자유게시판(글+댓글) 신규 구축.

**유저 자유게시판 (신규) — 카테고리별 글/댓글, 좋아요 없이 간단하게** — 지금까지 유저 간 소통은 매칭으로 연결된 사람과의 1:1 메시징뿐이었다. 사용자 확정 범위: 댓글 포함(대댓글 없는 1단 나열)·카테고리 구분·스태프 모더레이션 포함·좋아요 없음. 새 Django 앱 `apps/board`(모델 3개: `BoardCategory`/`Post`/`Comment`)를 신설:
- Inquiry(`apps/support`)와의 핵심 차이 — Inquiry는 "본인 것만 보이는 1:1 창구"라 수정·삭제 자체를 막았지만, 게시판은 **전체 공개**(모든 유저가 서로의 글을 봄) + **작성자 본인은 수정·삭제 가능**. 이걸 위해 이 코드베이스에 처음 필요했던 `IsAuthorOrReadOnly` 권한 클래스를 새로 만듦(조회는 항상 허용, 쓰기만 `author_id` 비교로 제한) — `PostViewSet`/`CommentViewSet`은 큐어리셋을 필터링하지 않고 이 권한 클래스로만 쓰기를 막는, 기존 `UserInterestViewSet`(자기 것만 필터링)과는 다른 새 조합
- 유저: `AppNav`에 "게시판" 탭 → `/board`에서 카테고리 필터 + 인라인 새 글 작성 + 글 목록(제목/작성자/댓글 수/작성일) → `/board/:postId` 상세에서 본문 + 댓글 목록 + 댓글 작성, 본인 글/댓글에만 수정·삭제(2클릭 인라인 확인 — `window.confirm`은 이 코드베이스에 선례가 없어 새로 안 씀)
- 스태프: 새 탭 "게시판 관리"(`/staff/board`) — 카테고리 생성/삭제(`AdminInterestCategoryViewSet`과 동일 패턴, 소비자용 시리얼라이저 재사용, 삭제 시 CASCADE로 소속 글도 같이 삭제됨을 사전 고지), 전체 글 조회·강제삭제, 행 펼쳐 댓글까지 강제삭제(`AdminInquiryViewSet`과 같은 mixin 조합으로 조회+삭제만 지원)
- 백엔드 회귀 테스트 36개 신규(소비자 22개: 전체 공개 조회·본인만 수정삭제 가능·타인 403 등, 스태프 14개: 카테고리 CRUD·CASCADE·전체 조회·강제삭제), 총 285개 통과
- 라이브 브라우저 검증 중 실제 버그 하나 발견/수정: `PostForm`의 카테고리 select가 부모의 비동기 카테고리 조회보다 먼저 마운트돼서, `useState` 초기값이 빈 값으로 고정되고 이후 categories가 도착해도 안 갱신되던 것 — 화면엔 카테고리가 선택된 것처럼 보이지만 실제 상태는 계속 비어 있어 "작성하기" 버튼이 영구적으로 눌러지지 않는 문제였음(카테고리 도착 시 한 번 기본값을 채우는 `useEffect`로 수정). 글 작성 → 상세 조회 → 댓글 작성 → 본인 글 수정 → 스태프 패널 카테고리/글/댓글 관리까지 전부 종단 확인 완료

**문의/신고하기 (신규) — 유저가 관리자에게 남기는 창, 관리자 답변까지 포함** — 지금까지 스태프 관리자 패널은 유저·연결·관심사·매칭만 다뤘지, 유저가 문제(신고·문의·건의)를 관리자에게 직접 전달할 창구가 없었다. 새 Django 앱 `apps/support`(모델 1개, `Inquiry`)를 만들어 이 기능만 전담시킴 — `apps/staff`는 모델을 안 가지는 기존 컨벤션을 지키면서 이 모델은 가져다 쓰기만 함:
- 유저: 설정 화면(`/settings`)에 "문의하기" 카드 → `/support` 화면에서 유형(신고/문의/건의) + 제목 + 내용 작성 → 제출 즉시 "내 문의 내역"에 반영(카테고리/상태 배지, 작성일). 관리자가 답변을 남기면 같은 목록에 틸 톤 카드로 표시. 수정·삭제는 지원 안 함(정정하고 싶으면 새로 작성 — 관리자 처리 이력이 바뀌는 걸 막기 위함)
- 스태프: 새 탭 "문의/신고"(`/staff/inquiries`) — 작성자 무관 전체 조회, 유형·상태 필터, 검색(제목/내용/작성자), 행 펼치면 본문 전체 + 답변 작성 폼(기존 답변이 있으면 프리필). `ConfirmButton` 2클릭으로 미처리↔처리완료 수동 토글도 유지, 답변을 저장하면 자동으로 처리완료 전환(빈 문자열로 지워도 상태는 그대로 둠 — "처리완료인데 답변만 고치기"가 흔해서 억지로 안 되돌림)
- 백엔드: `InquiryViewSet`(본인 것만 필터링, `ConnectionViewSet`과 동일 패턴)과 `apps/staff/views/inquiry.py`의 `AdminInquiryViewSet`(전체 조회+상태 PATCH+`reply` 커스텀 액션, `AdminMatchingRequestViewSet`처럼 필요한 mixin만 조합해 create/destroy 자체가 라우팅 안 되게 함). 마이그레이션 2개(`inquiries` 테이블 + `admin_reply`/`replied_at` 필드), `LOCAL_APPS`/`config/urls.py`에 앱 등록
- 백엔드 회귀 테스트 23개 신규(문의 CRUD 8개, 스태프 상태 변경 4개, 답변 4개, 답변 가시성 1개 등), 총 249개 통과. 라이브 브라우저로 유저 문의 작성 → 스태프가 답변 저장(자동 처리완료 전환 확인) → 유저 쪽 내 문의 내역에 답변 반영까지 종단 검증 완료. 검증 중 `.support-inquiry-list`에 `list-style`/여백 리셋이 빠져서 `<ul>` 기본 불릿이 그대로 노출되던 기존 버그도 같이 발견/수정

**카카오 소셜 로그인/가입 (성인인증과 별개, 콘솔 등록까지 끝내고 실계정으로 종단 검증 완료)** — `age_range` 동의항목만 사업자 인증이 필요한 거고, 이메일 같은 기본 프로필은 지금 등록된 앱으로도 요청 가능하다는 걸 확인해서, 회원가입 성인인증용으로 발급받은 REST API 키를 "카카오로 3초 로그인/가입" 편의 기능으로 재활용:
- 로그인·회원가입 화면에 "카카오로 계속하기" 버튼(`isKakaoConfigured()`일 때만 노출) → 카카오 동의 화면(scope: `account_email`만 요청) → 콜백(`/auth/kakao/login`, 기존 성인인증 콜백과 별개 라우트) → 이미 연결된 계정이면 바로 로그인, 처음이면 부족한 정보만 받는 완료 폼
- **닉네임은 카카오에서 절대 가져오지 않고 항상 사이트에서 직접 입력받음**(사용자 확정) — 카카오톡 닉네임과 매칭 서비스에서 쓸 닉네임은 성격이 달라서, `fetch_kakao_profile()`이 애초에 닉네임을 조회/반환하지 않도록 정리(`properties.nickname` 조회 자체를 제거)
- **이메일은 카카오가 주면 그대로 신뢰하고 완료 폼에서 수정 못하게 잠금**(`disabled`) — 로그인에 쓰인 카카오 계정 이메일과 가입 후 실제 이메일이 달라지는 걸 막기 위함. 처음엔 "다른 이메일 사용하기" 탈출구(중복 이메일 등 예외 상황 대비)를 같이 넣었으나, 사용자가 "카카오 소셜 가입인데 왜 필요하냐"고 지적해 제거 — 잠금은 예외 없이 항상 적용. 카카오가 이메일을 안 줬을 때만(동의 거부 등, `None`) 직접 입력 가능
- **비밀번호 없는 계정**(`User.objects.create_user(..., password=None)`, 장고가 자동으로 `set_unusable_password()`) — 이후 이메일/비밀번호 로그인은 자연히 실패, 카카오로만 로그인 가능. `django_login()`이 `authenticate()`를 안 거쳐서 `user.backend`를 직접 세팅해줘야 하는 함정 발견(안 그러면 `AUTHENTICATION_BACKENDS`가 2개라 `AttributeError`) + 비활성 계정 로그인 방지를 직접 체크(`authenticate()`가 해주던 것을 우회하므로)
- **카카오 콘솔 설정 완료** — "카카오 로그인 리다이렉트 URI"는 카카오 로그인 제품 탭이 아니라 **플랫폼 키 > REST API 키 "더보기" > REST API 키 수정 상세 페이지**에 있다는 걸 여러 번의 시행착오 끝에 확인(제품 탭의 "고급 > 리다이렉트 URI"는 실제로는 로그아웃 리다이렉트 URI라 다른 필드였음). 같은 페이지에서 이미 "활성화"돼 있던 Client Secret도 발견해 `.envs/.env.dev`의 `KAKAO_CLIENT_SECRET`에 반영(안 보내면 토큰 교환이 실패함). 동의항목에서 `account_email`을 "사용 안 함 → 설정"으로 켬(`age_range`/`profile_nickname`과 달리 비즈니스 인증 없이 토글 가능)
- 프론트 날짜 계산에서 실제 버그 하나 발견/수정: `new Date("YYYY-MM-DD")`가 UTC 자정으로 파싱돼서 로컬 타임존이 UTC보다 뒤처지면 자정 근처에서 하루가 밀리는 문제 — `lib/age.ts`를 만들어 연/월/일 정수만 직접 비교하는 방식으로 다시 짬(회원가입 생년월일 검증에도 같이 적용)
- 회귀 테스트 총 226개 통과(닉네임 제거로 테스트도 같이 정리), 라이브 브라우저로 **실제 카카오 계정 전체 플로우 종단 검증 완료**: "카카오로 계속하기" → 동의 화면(요청 항목이 이메일 하나뿐인 것까지 확인) → 완료 폼(닉네임 빈칸, 이메일 잠금+프리필) → 닉네임/생년월일 입력 → 제출 → `/onboarding`으로 이동, DB에서 계정 필드(`kakao_id`/`email`/`is_adult_verified`/`has_usable_password()=False`/`date_of_birth`) 전부 기대값과 일치하는 것까지 shell로 직접 확인

**회원가입 성인인증 — 자기신고 생년월일 + 최소연령 검증 (카카오 시도 후 전환)** — `date_of_birth`는 "미래 날짜 아님"만 검증하고 최소 연령 자체는 전혀 확인 안 하던 걸 발견. PASS는 PG 대행사 사업자 계약이 필요해 셀프서비스로 못 붙여서, 처음엔 대안으로 카카오 로그인 `age_range`(연령대) 동의항목을 붙였다(REST API 키 발급까지 받아 실제 연동 코드 완성). 그런데 실제로 테스트해보니 **`age_range` 동의항목 자체가 카카오 "비즈니스 앱" 전환을 요구하고, 그 전환이 사업자등록번호를 요구**(`KOE205` 에러로 확인) — PASS를 피하려던 이유와 똑같은 벽에 부딪힘. 네이버 로그인도 사실상 같은 제약일 가능성이 높아, 최종적으로 **자기신고 생년월일 + 서버 측 최소연령(만 19세) 검증**으로 전환:
- 회원가입 폼에 생년월일 필드 추가(닉네임/이메일/비밀번호와 함께 한 화면에서 받음). 네이티브 날짜 선택기의 `max`를 "19년 전"으로 걸어 애초에 미달 연령을 고를 수 없게 하고, 제출 시 클라이언트에서도 한 번 더 계산해서 빠른 피드백을 줌
- **서버가 최종 관문** — `UserCreateSerializer.validate_date_of_birth()`가 미래 날짜·만 19세 미만을 둘 다 막음(진짜 신원 확인은 아니라 마음만 먹으면 속일 수 있지만, 검증이 전혀 없던 것보다는 실질적 방어). 가입 후 프로필 수정으로 더 어린 생년월일로 바꿔서 우회하는 것도 `UserUpdateSerializer.validate_date_of_birth()`에서 같이 막음
- **카카오 연동 코드는 삭제하지 않고 그대로 남겨둠**(`apps/users/services/kakao.py`, `KakaoAgeVerificationView`, 프론트 `lib/kakaoAuth.ts`·`KakaoCallbackScreen.tsx`) — 나중에 사업자등록을 하게 되면 `UserCreateSerializer`에 다시 연결하면 됨. 지금은 회원가입 폼에서 안 쓰여서 도달 불가능한 상태
- 백엔드 회귀 테스트: 카카오 관련 17개(서비스 함수 목 테스트 + 세션 게이트, 여전히 유효 — 엔드포인트 자체는 살아있음) + 자기신고 최소연령 게이트 관련 신규 케이스(최소연령 미만 거부·생년월일 누락 거부·미래 날짜 거부·경계값(만 19세 정각) 통과·프로필 수정 우회 방지), 총 215개 통과
- 라이브 브라우저로 실제 회원가입(생년월일 2000년생) → 계정 생성·로그인·온보딩 이동까지, 그리고 미성년자 생년월일 입력 시 클라이언트에서 즉시 거부되고 계정이 실제로 안 만들어지는 것까지 전부 확인 완료

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

전체 백엔드 테스트 스위트 285개(유저 자유게시판 36개, 문의/신고하기 23개, 카카오 소셜 로그인/가입 11개 포함) 통과.

이전엔 보안 점검(SECRET_KEY `#` 문자로 인한 무력화, 죽어있던 `ADMIN_URL` 설정, pillow/gunicorn 취약점 패치), 그 전엔 저장소 정리 + 사용자 제보 매칭 버그 2건, 그 전엔 matching/users 앱 내부 구조를 도메인별 패키지로 분리 — 자세한 내용은 `완료된 기능` 섹션과 `git log` 참고.

- 커밋 상태: 유저 자유게시판(`apps/board` 신규) + 문의/신고하기(`apps/support` 신규, 관리자 답변 기능 포함) + 카카오 소셜 로그인/가입 후속 조치 + README를 프로젝트 소개 위주로 정리(구현 이력 서술은 이 문서에만 남기고 README에서 제거)까지 로컬 `feature` 브랜치에 커밋 완료, `origin/main`에는 아직 미푸시. 이전 작업(스태프 관리자 패널 Phase 1·2, apps/staff 통합)은 PR #6으로 이미 머지 완료
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
- [x] 회원가입 성인인증(자기신고 생년월일 + 최소연령 검증) — 회원가입 폼에 생년월일 필드를 추가해 만 19세 미만 가입을 서버(`UserCreateSerializer.validate_date_of_birth`)에서 막음. 카카오 로그인 `age_range` 연동을 먼저 시도했으나 그 동의항목이 사업자등록번호를 요구해 막혀서 전환 — 카카오 연동 코드(`apps/users/services/kakao.py`, `KakaoAgeVerificationView`)는 삭제하지 않고 남겨둠(나중에 사업자등록 하면 재연결 가능). `User.is_adult_verified` 필드로 가입 시점 통과 여부 기록, 프로필 수정으로 더 어린 생년월일로 우회하는 것도 `UserUpdateSerializer`에서 같이 막음 (자세한 내용은 위 `현재 상태` 참고)
- [x] 카카오 소셜 로그인/가입 (`KakaoLoginView`/`KakaoSignupCompletionView`, `/auth/kakao/login`) — 성인인증과 완전히 별개, 비밀번호 없는 계정으로 카카오 계정 자체를 로그인 수단으로 씀. 로그인/회원가입 화면에 "카카오로 계속하기" 버튼, 닉네임/생년월일은 항상 직접 입력받고 이메일은 카카오가 주면 잠근 채로 프리필하는 완료 폼. `django_login()`이 `authenticate()`를 안 거쳐서 `user.backend`를 직접 세팅해야 하는 함정 발견/수정, `lib/age.ts`에서 날짜 파싱 타임존 버그(UTC 자정 파싱으로 인한 하루 밀림) 발견/수정, 카카오 콘솔 Redirect URI/Client Secret/동의항목 등록까지 끝내고 실계정으로 종단 검증 완료 (자세한 내용은 위 `현재 상태` 참고)
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
- [x] 문의/신고하기 (`apps/support` 신규, `features/support/`) — 유저가 관리자에게 남기는 신고/문의/건의. 설정 화면에 진입점, 유형·제목·내용 작성 + 본인 문의 내역 조회(수정·삭제는 없음). 스태프는 `/staff/inquiries`에서 전체 조회·필터·검색·처리 상태(미처리/처리완료) 토글에 더해 답변 작성(문의당 1개, 저장 시 자동 처리완료 전환)까지 지원 — 유저는 본인 문의 내역에서 답변을 바로 확인. `apps/staff`가 모델을 안 갖는 기존 컨벤션을 지키기 위해 `Inquiry` 모델은 새 도메인 앱(`apps/support`)에 두고 스태프는 가져다 쓰기만 함 (자세한 내용은 위 `현재 상태` 참고)
- [x] 유저 자유게시판 (`apps/board` 신규, `features/board/`) — 유저들끼리 카테고리별로 글/댓글을 남기는 공개 게시판(좋아요 없음). `AppNav`에 "게시판" 탭, `/board`(카테고리 필터+새 글 작성+목록)·`/board/:postId`(본문+댓글) 화면. Inquiry와 달리 전체 공개 조회 + 본인 글/댓글만 수정·삭제(새 `IsAuthorOrReadOnly` 권한 클래스). 스태프는 `/staff/board`에서 카테고리 관리(CASCADE 경고)·전체 글/댓글 조회·강제삭제 (자세한 내용은 위 `현재 상태` 참고)

---

## 📋 다음 작업
최초 로드맵(인증 3종 + 온보딩 + 매칭 + 연결 + 설정)에 이어 인앱 메시징 + 실시간화(폴링) + 알림 뱃지, UI 크리틱 후속조치 17건, 스태프 관리자 패널(Phase 1·2 + `apps/staff` 통합), 회원가입 최소연령 검증, 카카오 소셜 로그인/가입(콘솔 등록 + 실계정 종단 검증), 문의/신고하기(관리자 답변 포함), 유저 자유게시판까지 완료. 다음 세션 시작 시 사용자와 함께 방향을 다시 정할 것 — 후보:
- [ ] E2E 테스트 자동화 (지금까지는 매 기능마다 수동으로 브라우저 검증)
- [ ] 배포 준비 (prod 빌드 점검, 환경변수 정리)

### 보류 중
- [ ] 프로필 이미지 업로드 UI — **S3 연결 후 진행**. 백엔드 이미지 최적화(리사이즈/EXIF 보정/JPEG 재인코딩) 로직 자체는 이미 구현돼 있고, `config/settings/prod.py`에 `USE_S3`/`AWS_*` 설정 자리도 있지만 아직 실제 버킷·자격 증명이 연결되지 않음. S3 연결이 먼저 끝나야 온보딩/설정 화면에 업로드 UI를 붙이는 게 의미가 있음
- [ ] **카카오 로그인 성인인증 재활성화** — **사업자등록 후 진행**. `age_range` 동의항목이 카카오 "비즈니스 앱" 전환(사업자등록번호 필요)을 요구해서 지금은 자기신고 생년월일 검증으로 대체된 상태. 연동 코드(`apps/users/services/kakao.py`, `KakaoAgeVerificationView`, 프론트 `lib/kakaoAuth.ts`·`KakaoCallbackScreen.tsx`)는 이미 구현·테스트돼 있어 삭제하지 않았음 — 사업자등록번호가 생기면 카카오 콘솔에서 비즈니스 앱 전환 + `age_range` 동의항목 재신청 후 `UserCreateSerializer`에 다시 연결하면 됨

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
│   │   │   └── services/       # image_processing.py(프로필 이미지 최적화), validators.py(비밀번호 검증기+최소연령), kakao.py(성인인증+소셜 로그인 공용)
│   │   ├── matching/          # 매칭 앱 (관심사, 매칭 요청/결과, 연결, 메시지)
│   │   │   ├── models/         # interest.py, matching_request.py, connection.py
│   │   │   ├── serializers/    # interest.py, matching_request.py, connection.py
│   │   │   ├── views/          # interest.py, matching_request.py, connection.py, notification_summary.py
│   │   │   ├── services/       # matching.py(채점 알고리즘), notifications.py(이메일 알림)
│   │   │   └── management/commands/seed_interests.py
│   │   ├── support/            # 유저→관리자 문의/신고/건의 (Inquiry 모델 1개, 플랫 구조)
│   │   │   ├── models.py, serializers.py, views.py, urls.py, admin.py
│   │   ├── board/               # 유저 자유게시판 (BoardCategory/Post/Comment, 플랫 구조)
│   │   │   ├── models.py, serializers.py, views.py, permissions.py, urls.py, admin.py
│   │   └── staff/              # 스태프 전용 관리자 REST API(모델 없음, users/matching/support/board 모델·소비자용 시리얼라이저 재사용)
│   │       ├── views/           # user.py, connection.py, interest.py, matching_request.py, inquiry.py, board.py
│   │       └── serializers/     # user.py, connection.py, inquiry.py, board.py
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
│       │   ├── auth/kakao/callback/page.tsx  # 회원가입 성인인증 콜백(현재 미사용)
│       │   ├── auth/kakao/login/page.tsx     # 카카오 소셜 로그인/가입 콜백
│       │   ├── onboarding/page.tsx, matching/page.tsx
│       │   ├── connections/page.tsx, settings/page.tsx
│       │   ├── messages/page.tsx, messages/thread/page.tsx
│       │   ├── support/page.tsx  # 문의하기
│       │   ├── board/page.tsx, board/post/page.tsx  # 게시판 목록/상세
│       │   └── staff/            # users/page.tsx, connections/{page,detail/page}.tsx, interests/page.tsx, matching-requests/{page,detail/page}.tsx, inquiries/page.tsx, board/page.tsx
│       ├── features/           # 도메인별 기능 묶음 (Django apps에 해당) — 각 api/ · components/ · types.ts
│       │   ├── auth/             # 로그인/가입(카카오 소셜 로그인 버튼 포함)/재설정, useCurrentUser, RequireAuth·RequireStaff
│       │   ├── onboarding/       # 내 카드 만들기 3단계 마법사
│       │   ├── matching/         # 매칭 요청/결과
│       │   ├── connections/      # 연결 요청/수락/거절/차단
│       │   ├── settings/         # 프로필/비밀번호/계정
│       │   ├── messaging/        # 대화 목록/1:1 스레드
│       │   ├── support/          # 문의/신고/건의 작성 + 내 문의 내역
│       │   ├── board/            # 게시판 목록/글쓰기/상세/댓글
│       │   └── staff/            # 스태프 관리자 화면 — StaffLayout·ConfirmButton(2클릭 확인) + 유저/연결·메시지/관심사/매칭현황/문의신고/게시판 6개 화면
│       ├── components/        # 도메인 무관 공용 UI (아이콘, 워드마크, AppNav — 스태프에겐 "관리자" 탭 추가, 플레이스홀더)
│       ├── lib/                # 외부 통신 계층 (apiClient.ts — fetch 래퍼 + CSRF + 에러 처리, kakaoAuth.ts — 카카오 인가 URL 조립, age.ts — 최소연령 순수 함수)
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
