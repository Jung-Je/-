---
target: frontend/src/features/settings, frontend/src/features/staff, frontend/src/features/support (설정/스태프/지원 화면군)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-21T00-03-24Z
slug: d-src-features-staff-frontend-src-features-support
---
**Method: dual-agent (Assessment A: design review · Assessment B: detector + browser evidence, isolated sub-agents)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 정지 액션이 뱃지 변화 외 별도 알림 없음 |
| 2 | Match Between System & Real World | 3 | 도메인 용어 명확 |
| 3 | User Control and Freedom | 3 | ConfirmButton 취소 항상 가능, 페이지네이션엔 점프 기능 없음 |
| 4 | Consistency and Standards | 3 | 공유 컴포넌트 6곳 일관 적용 — 22px/패딩 드리프트로 감점 |
| 5 | Error Prevention | 2 | 본인 정지 방지는 잘 됨, 연쇄 삭제는 일반 토글과 같은 확인 강도 |
| 6 | Recognition Rather Than Recall | 3 | 필터·라벨 항상 노출 |
| 7 | Flexibility and Efficiency | 2 | 벌크 액션 없음 |
| 8 | Aesthetic and Minimalist Design | 3 | 스태프 화면 절제 의도대로, 관심사 칩월만 예외 |
| 9 | Error Recovery | 3 | ConfirmButton 인라인 에러 처리 일관 |
| 10 | Help and Documentation | 1 | 스태프 액션 설명 전무 |
| **Total** | | **26/40** | **Acceptable (65%)** |

## Design Specificity Verdict

유틸리티 화면 기준을 정확히 충족. 설정/지원은 카드 문법만 물려받고, 스태프는 완전히 평평한 테이블 UI — 의도된 선택으로 결함 아님. 부족한 지점은 정보 밀도 처리: 9열 유저 테이블이 데스크톱 폭을 넘어 가로 스크롤 필요.

결정론적 스캔: CLI 0건, 브라우저 실측은 모든 스태프 화면에서 `.staff-table-wrap` cramped-padding, 여러 페이지에서 flat-type-hierarchy(22px 포함) 발견. text-occlusion 2건은 Claude-in-Chrome 확장 배너로 오탐 확인. 좋은 소식: 흰 텍스트 대비 실패 버그(이전 2개 화면군에서 발견/수정)는 이 화면군 8페이지 전체에서 0건.

## Overall Impression

스태프 공유 인프라(usePaginatedList+ConfirmButton+StaffListStatus+StaffPagination)는 이번 세션 최고 수준의 재사용 패턴. 22px 브랜드 타이틀 드리프트가 여기서도 3곳 추가 발견돼 앱 전체 6곳 이상 반복 확인. 가장 실질적 문제는 유저 테이블 오버플로우와 인라인 확장 행의 키보드 접근성.

## What's Working

1. usePaginatedList/ConfirmButton/StaffListStatus/StaffPagination이 6개 화면에서 시각적으로도 동작적으로도 일관.
2. 본인 계정 정지 방지(disabled={isSelf}) — 구체적으로 스코프된 안전장치.
3. 연쇄 삭제 시 확인 버튼 라벨에 영향 범위 명시("관심사 5개도 함께 삭제됨").

## Priority Issues

**[P1] 인라인 확장 행이 키보드/스크린리더로 접근 불가**
- Why it matters: <tr onClick>으로 구현된 확장(유저 상세/문의 답변/관심사 하위목록/게시글 댓글)에 tabIndex/role/키보드 핸들러 없음 — 키보드 사용자는 /staff/inquiries 답변 워크플로우 자체를 못 씀.
- Fix: role="button"+aria-expanded+Enter/Space, 또는 명시적 버튼으로 분리.
- Files: StaffUsersScreen.tsx, StaffInquiriesScreen.tsx, StaffInterestsScreen.tsx, StaffBoardScreen.tsx

**[P1] 유저 테이블이 레이아웃 폭을 넘어 주요 액션이 가려짐**
- Why it matters: 9열+액션2개가 콘텐츠 폭 초과, 가로 스크롤 필요, 확인 상태 전환 시 더 밀림.
- Fix: 저우선 열 병합/숨김 또는 액션 열 줄바꿈 허용.
- Files: StaffUsersScreen.tsx, StaffLayout.css:127

**[P2] .staff-table-wrap에 여백 없음 (6개 화면 전부 실측 확인)**
- Fix: 컨테이너 내부 패딩 추가.

**[P3] 22px 브랜드/섹션 타이틀 드리프트 3곳 추가**
- .settings-brand h1, .staff-header__top h1, .settings-card__heading h2 (다른 화면의 동일 역할 요소는 이미 26px로 통일됨).

**[P3] 입력창/버튼 패딩 드리프트**
- .settings-field input(10px 12px), .staff-filters input(8px 12px), .staff-reply-form textarea(10px 12px) — 스펙(12px 14px) 불일치, 서로도 다름. .settings-submit도 11px 20px(스펙 13px 20px).

## Persona Red Flags

**Alex**: 벌크 액션 없음, 테이블 가로 스크롤, 페이지네이션 위치 표시 없음.
**Sam**: 행 확장 패턴이 마우스 없인 불가, /staff/inquiries 답변 워크플로우 차단.

## Minor Observations

- /settings의 first-viewport-column-overflow 세부 내용 캡처 중 잘림 — 재확인 필요.
- 연쇄 삭제(2클릭)와 본인 탈퇴(타이핑 확인)의 확인 강도 비대칭.
- 모바일 480px 브레이크포인트는 샌드박스 제약으로 라이브 확인 못함.

## Questions to Consider

1. 카테고리 삭제는 2클릭, 본인 탈퇴는 타이핑 확인 — 이 비대칭이 뭘 말해줄까요?
2. 벌크 액션·키보드 접근 없는 채로 시드 데이터 규모를 넘어서도 이 도구가 버틸까요?
