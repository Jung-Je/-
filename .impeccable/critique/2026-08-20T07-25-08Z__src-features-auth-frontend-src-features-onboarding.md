---
target: frontend/src/features/auth, frontend/src/features/onboarding (로그인/온보딩/회원가입 화면군)
total_score: 29
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 2
timestamp: 2026-08-20T07-25-08Z
slug: src-features-auth-frontend-src-features-onboarding
---
**Method: dual-agent (Assessment A: design review · Assessment B: detector + browser evidence, isolated sub-agents)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | `/onboarding` → `/` 리다이렉트가 무설명·무통보로 조용히 일어남 |
| 2 | Match Between System & Real World | 4 | 자연스러운 한국어 카피, 친숙한 폼 패턴 |
| 3 | User Control and Freedom | 2 | 마법사 단계가 URL이 아닌 컴포넌트 state — 새로고침하면 서버엔 저장된 이전 단계 답변이 있어도 UI는 1단계로 조용히 리셋 |
| 4 | Consistency and Standards | 3 | 토큰 사용은 대체로 일관되나, 회원가입 폼의 이중 에러 스타일과 스테퍼 색상 매핑 깨짐이 감점 |
| 5 | Error Prevention | 4 | 클라이언트 검증(비밀번호 길이·확인, 생년월일 미래/미성년 차단), 재전송 쿨다운 |
| 6 | Recognition Rather Than Recall | 3 | 비밀번호 힌트는 잘 유지되나 이메일 잠금 해제("다른 이메일 쓰기") 발견성이 낮음 |
| 7 | Flexibility and Efficiency | 3 | autoComplete 커버리지 우수, "로그인 유지" 등 재방문자용 경량 경로는 없음 |
| 8 | Aesthetic and Minimalist Design | 3 | 로그인/회원가입에 코랄 CTA + 카카오 노랑 CTA가 동시에 풀폭으로 떠 "코랄 CTA 하나만 강조" 규칙과 충돌 |
| 9 | Error Recovery | 4 | 실제 네트워크 장애로 라이브 검증 — 스펙대로 배너+아이콘+role="alert"+aria-invalid 동시 작동 확인 |
| 10 | Help and Documentation | n/a | 흐름이 짧고 선형적이라 해당 없음 |
| **Total** | | **29/36** | **Good (81%)** |

## Design Specificity Verdict

**LLM 평가**: 생각보다 "AI가 대충 만든" 쪽에 가깝지 않다. `tokens.css`는 DESIGN.md의 색·spacing·radius·shadow 값을 거의 그대로 반영하고, `.auth-submit`은 `button-primary` 스펙(13px 20px 패딩, 12px radius, 45% 불투명 disabled, hover brightness 0.96, active 1px 눌림)을 숫자 단위로 재현한다. "포토카드 바인더" 은유도 카피에 명시적으로 녹아 있다("바인더로 돌아가려면", "첫 카드가 완성됐어요"). 다만 DESIGN.md가 이 세계관을 시각적으로 대표하라고 지정한 유일한 요소 — `CardStackMark` 워드마크 — 가 실제 렌더 크기(40px)에서는 바이올렛/틸 겹침이 거의 안 보여, 그냥 코랄 사각형+텍스트로 읽힌다. DESIGN.md를 모르는 방문자 입장에선 이 화면군에서 "포토카드 바인더"를 시각적으로 알아채기 어렵다 — 정체성이 코드가 아니라 카피 마이크로텍스트에만 실려 있다.

**결정론적 스캔**: CLI 디텍터(`detect.mjs`)는 이 파일들에서 0건을 반환. 규칙셋 자체가 마케팅/랜딩페이지형 AI 슬롭(그라디언트 텍스트, 다크 글로우, bounce easing 등)을 겨냥하고 있어 평범한 인증 폼과는 태생적으로 잘 안 걸린다(0건 = 결함 없음이 아니라 이 패턴들은 없음이라는 뜻). 브라우저 내 디텍터(더 넓은 규칙셋, computed style 기반)는 6개 페이지/상태 전부에서 `.auth-card`에 `border-accent-on-rounded`(2px 상단 보더 + 20px radius 조합)를 반복 검출했는데, 이는 DESIGN.md가 명시적으로 지시한 의도된 패턴이라 오탐(false positive)으로 판단. `/reset-password`에서 잡힌 `flat-type-hierarchy`(14/15/16/**22**/26px 5종)는 유의미하다 — DESIGN.md 타이포 스펙엔 14/15/16/26px 4종만 정의돼 있는데 22px는 어디서도 문서화되지 않은 값. `/`의 빈 폼 제출(검증 에러) 상태에서만 `#d97757`(토큰에 없는 색)의 zero-offset glow가 잡혔는데, 리터럴 값이 아니라 렌더링된 합성색일 가능성이 있어 확정된 결함은 아니다.

## Overall Impression

토큰 레이어(색·spacing·radius·shadow)는 실제로 잘 지켜지고 있고, 에러 처리도 실제 네트워크 장애로 라이브 검증했을 때 스펙대로 작동했다. "AI가 대충 만든 것 같다"는 인상의 실제 원인은 시스템 미준수가 아니라 ① 이 세계관의 유일한 시각적 서명(워드마크)이 실제 크기에서 안 읽히는 것, ② 화면당 그림자 카드 하나·CTA 하나 원칙이 카카오 로그인 버튼과의 대결에서 깨지는 것, ③ 온보딩 스테퍼가 자기가 속한 화면의 색 규칙을 어기는 것이다. "시스템을 안 따라간다"가 아니라 "시스템의 가장 특징적인 시그널들이 화면마다 조금씩 새고 있다"는 게 더 정확한 진단이다.

## What's Working

1. **토큰 충실도가 실제로 견고하다.** `.auth-submit`이 `button-primary` 스펙을 픽셀 단위로 재현하고, disabled/hover/active 상태까지 정확히 구현되어 있다.
2. **회원가입의 2단계 이메일 인증 게이트**는 잘 설계된 UX다 — 인증 전까지 이메일 필드+버튼만 노출해 "한 번에 하나씩" 원칙을 실제로 구현.
3. **에러 처리가 라이브로 검증됐고 실제로 통과했다.** 실제 네트워크 장애를 유발해 배너(danger-bg + 아이콘 + role="alert") + 필드 aria-invalid가 동시에 정확히 작동하는 걸 확인.

## Priority Issues

**[P1] 온보딩 진행 점(스테퍼) 색이 Weighted Color Rule을 위반**
- Why it matters: DESIGN.md의 핵심 규칙은 코랄=관심사/바이올렛=성격/틸=위치가 절대 뒤바뀌지 않는다는 것인데, `OnboardingWizard.css:63-76`는 "완료" 점을 무조건 틸, "활성" 점을 무조건 코랄로 하드코딩. 관심사(코랄) 단계를 완료하면 그 점이 틸로 바뀌는, 제품 고유 규칙과 정면 충돌하는 상태가 화면에 그대로 노출됨.
- Fix: 카드 상단 엣지에 이미 쓰고 있는 단계별 role-color 토큰을 스테퍼 점에도 그대로 재사용.
- Suggested command: /impeccable harden
- Files: frontend/src/features/onboarding/components/OnboardingWizard.css:63-76, OnboardingWizard.tsx

**[P1] 온보딩 단계 순서가 50/30/20 가중치 순서를 역행**
- Why it matters: 프로필(위치·20%) → 성격(30%) → 관심사(50%) 순으로 진행되어, 가중치가 가장 큰 신호를 마지막에 배치. 색 순서로 가중치를 가르치겠다는 규칙의 취지를 단계 순서가 무너뜨림.
- Fix: 관심사→성격→프로필로 재배열하거나, 순서 규칙은 색 범례 전용이라고 DESIGN.md에 명시.
- Suggested command: /impeccable shape
- Files: frontend/src/features/onboarding/components/OnboardingWizard.tsx:12-16

**[P2] 로그인/회원가입에 풀폭 CTA 2개(코랄+카카오 노랑)가 동시에 강조되어 "코랄 CTA 하나만 강조" 규칙과 충돌**
- Why it matters: DESIGN.md는 "절제된 화이트 카드 위에 코랄 CTA 하나만 강하게 튀는" 것을 핵심 특징으로 명시하는데, 실제로는 채도 높은 CTA가 두 개 나란히 서서 시선을 분산시킴 — "화면이 대충 느껴진다"는 인상의 실제 원인 중 하나.
- Fix: 카카오 버튼을 시각적으로 낮은 강조(아웃라인/보조 톤)로 내리거나, 구분선으로 두 CTA의 위계를 명확히 분리.
- Suggested command: /impeccable layout
- Files: frontend/src/features/auth/components/AuthScreen.tsx, AuthScreen.css

**[P2] 카드 하단 패딩이 스펙(48px 32px 24px)보다 8px 큰 48px 32px 32px로 데스크톱에서 체계적으로 드리프트**
- Why it matters: AuthScreen.css:34와 OnboardingWizard.css:91 둘 다에서 동일하게 드리프트 — 반복 패턴. 모바일 변형은 정확히 스펙대로라 데스크톱만 샘. 사용자가 지적한 "여백 리듬"의 구체적 증거.
- Fix: 하단 패딩을 var(--space-5)로 수정, 두 파일 모두.
- Suggested command: /impeccable polish
- Files: frontend/src/features/auth/components/AuthScreen.css:34, frontend/src/features/onboarding/components/OnboardingWizard.css:91

**[P2] 시그니처 워드마크(CardStackMark)가 실제 렌더 크기(40px)에서 판독 불가**
- Why it matters: DESIGN.md가 "포토카드 바인더" 세계관을 첫 진입에서 알리는 유일한 장식 요소로 지정한 컴포넌트인데, 바이올렛/틸 겹침이 거의 안 보여 그냥 코랄 사각형으로 읽힘.
- Fix: 인증/온보딩 브랜드 행에서 크기를 키우거나 카드 회전 오프셋을 넓혀 작은 크기에서도 겹침이 읽히게 조정.
- Suggested command: /impeccable typeset
- Files: frontend/src/components/CardStackMark.tsx, AuthScreen.tsx:18, OnboardingWizard.tsx:54

**[P2] SignupForm 안에서 같은 종류의 API 에러가 두 가지 다른 시각 언어로 표현됨**
- Why it matters: 이메일 인증 실패는 배경 없는 평범한 빨간 텍스트로, 계정 생성 실패는 DESIGN.md 스펙대로의 danger-bg 배너로 — 같은 화면, 같은 실패 유형인데 강도가 다르게 느껴져 가벼운 쪽은 놓치기 쉬움.
- Fix: 이메일 인증 에러도 .auth-error 배너 스타일로 통일.
- Suggested command: /impeccable polish
- Files: frontend/src/features/auth/components/SignupForm.tsx:266-269, AuthScreen.css:122-129 vs 227-242

## Persona Red Flags

**Jordan (첫 방문자)**
- 로그아웃 상태로 `/onboarding` 북마크/공유링크에 진입하면 아무 설명 없이 `/`로 튕겨나감(RequireAuth.tsx) — 의도적으로 로그인하러 온 것과 구분이 안 됨.
- 생년월일을 수집·연령 검증하면서도 SignupForm.tsx에는 약관/동의 링크가 어디에도 없음.
- 마법사 도중 새로고침하면(서버엔 이전 답변이 이미 저장돼 있는데도) UI는 조용히 1단계로 초기화됨.

**Casey (모바일)**
- 비밀번호 토글 버튼은 32×32px 히트 영역 — 일반적인 44px 모바일 터치 가이드라인보다 작아 오탭 가능성.
- InterestsStep은 6개 카테고리 × 5칩 = 30개 옵션이 검색/아코디언 없이 한 번에 노출되어 390px 화면에서 앵커 없는 긴 스크롤이 됨.

## Minor Observations

- `/reset-password`에서 검출된 22px 폰트 사이즈는 DESIGN.md 타이포 스펙(14/15/16/26px)에 없는 값 — 출처 확인 필요.
- KakaoCallbackScreen.tsx는 코드 주석상 "현재 미사용"인데 여전히 배포되는 죽은 코드.
- 비밀번호 확인 필드 불일치는 클라이언트에서 잡히지만 필드 자체에 aria-invalid가 안 붙고 전체 에러 배너만 뜸.
- 카카오 버튼의 브랜드 노랑(#FEE500)은 의도된 예외로 코드 주석에 설명돼 있어 팔레트 이탈로 감점하지 않음.
- InterestsStep 인지 부하: 6그룹×5칩=30개 옵션이 검색/접기 없이 동시 노출(chunking·minimal-choices 위반), 모바일에서 특히 부담.

## Questions to Consider

1. 스테퍼 "활성/완료" 색이 항상 코랄/틸이어야 한다는 요구가 따로 있었나요, 아니면 놓친 디테일인가요?
2. 워드마크가 "조용한" 화면에서 정체성을 알리는 유일한 장치라면, 지금 크기로 그 역할을 할 수 있다고 보시나요?
3. 온보딩 단계가 URL에 없는 건 의도된 단순화였나요, 아니면 아직 안 붙인 건가요?
