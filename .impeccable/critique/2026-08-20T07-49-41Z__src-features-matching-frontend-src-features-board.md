---
target: frontend/src/features/matching, frontend/src/features/board (매칭/보드 화면군)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-20T07-49-41Z
slug: src-features-matching-frontend-src-features-board
---
**Method: dual-agent (Assessment A: design review · Assessment B: detector + browser evidence, isolated sub-agents)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 점수 배지/숫자 의미를 설명하는 범례 없음 |
| 2 | Match Between System & Real World | 3 | 카피는 자연스럽지만 "포토카드" 프레이밍이 실제 화면과 안 맞음 |
| 3 | User Control and Freedom | 4 | 확장/축소, 인라인 취소, 강제 모달 없음 |
| 4 | Consistency and Standards | 2 | 점수 배지가 4번째 미문서화 색 체계를 도입 |
| 5 | Error Prevention | 2 | 매칭 요청 폼 noValidate, 클라이언트 검증 전무 |
| 6 | Recognition Rather Than Recall | 3 | 폼 라벨은 좋으나 배지 등급 의미는 추론해야 함 |
| 7 | Flexibility and Efficiency | 2 | 매칭 결과 정렬/필터 없음, 게시판 필터 하나뿐 |
| 8 | Aesthetic and Minimalist Design | 3 | 깔끔하지만 "designed 부족"에 가까움 |
| 9 | Error Recovery | 3 | 에러 배너 일관됨 |
| 10 | Help and Documentation | 1 | 점수/등급색/가중치 인앱 설명 전무 |
| **Total** | | **26/40** | **Acceptable (65%)** |

## Design Specificity Verdict

**LLM 평가**: "포토카드 바인더" 테제가 화면이 아니라 거의 코드 주석과 카피에서만 살아남아 있다. MatchingResultCard는 원형 아바타+이름+점수 배지+소개+칩+버튼2개로 이뤄진 평범한 리스트 행이라 일반 매칭앱 리스트와 구조적으로 구분 안 됨. 카드 스킨모피즘 요소는 거의 없고, 유일한 시도(등급 배지)도 밋밋한 3단 그라디언트 원일 뿐. 결정적으로 가중치 색 체계(코랄=관심사/바이올렛=성격/틸=위치)가 정작 가장 필요한 점수 상세 분해에서 완전히 빠져 무채색 dl로 렌더링됨. 게시판은 "조용한 화면" 예외를 정확히 지켜 잘 작동.

**결정론적 스캔**: CLI 디텍터 0건(토큰 사용이 일관돼 긍정 신호). 브라우저 디텍터는 border-accent-on-rounded(의도된 패턴, 오탐)와 first-viewport-column-overflow(/matching 첫 섹션이 뷰포트의 150%+, 폴드가 섹션 중간에서 끊김 — 실제 신호)를 검출. 실측: 4개 결과(86/37/15/11점) 중 86점만 골드, 나머지 3개(37/15/11)는 전부 동일한 브론즈로 렌더링돼 3배 가까운 점수 차이가 배지 색으로 구분 안 됨. 카드 패딩은 32px 균일 또는 16/24px로, DESIGN.md의 "48px 32px 24px" 조합과 다름(개별 값은 스케일 안에 있음).

## Overall Impression

토큰 위생은 깨끗한데 이 화면에 요구된 핵심(가중치 색 분해, 카드 정체성)이 빠져 있다. "AI가 대충 만든 것 같다"는 인상이 가장 강한 화면군 — 서비스의 핵심 기능인데 실제로는 제네릭 리스트 UI + 밋밋한 배지뿐.

## What's Working

1. 아바타 배경색을 매칭/커넥션/메시지 전체에서 통일한 세심한 일관성 수정.
2. 다른 경로로 이미 연결된 사람이 다시 클릭 가능한 상태로 안 보이게 하는 방어적 처리.
3. 모달 없는 대화형 삭제 확인(게시글/댓글) — 흐름이 안 끊김.

## Priority Issues

**[P0] 점수 상세 분해에 가중치 색 체계가 전혀 없음**
- Why it matters: DESIGN.md가 이 규칙의 대표 적용처로 명시한 화면인데 무채색 dl이라 "왜 매칭됐는지" 색으로 안 보임 — 제품 원칙 1번(투명성)과 충돌.
- Fix: 관심사/성격/위치 점수를 코랄/바이올렛/틸로 색분리된 표시로 전환.
- Suggested command: /impeccable colorize
- Files: MatchingResultCard.tsx:154-173, MatchingScreen.css:395-419

**[P1] 등급 배지가 서로 구분 안 되고, 미문서화된 4번째 색 체계**
- Why it matters: 37/15/11점이 전부 동일 브론즈 — 점수 차이가 안 보임. 9개 hex값이 tokens.css에 없어 드리프트 위험.
- Fix: 기존 3색 체계에 편입하거나 등급 구간 세분화.
- Suggested command: /impeccable colorize
- Files: MatchingScreen.css:301-319, MatchingResultCard.tsx:26-30

**[P1] 펼치기/접기 버튼에 ARIA 상태 없음**
- Why it matters: aria-expanded/aria-controls 없어 스크린리더 사용자가 상태를 알 수 없음(WCAG 4.1.2).
- Fix: aria-expanded={expanded} + aria-controls 추가.
- Suggested command: /impeccable harden
- Files: MatchingResultCard.tsx:149-151, 154-173

**[P2] 매칭 요청 폼에 클라이언트 검증 전무**
- Why it matters: noValidate인데 min>max 나이 같은 오류도 서버 왕복 후에야 잡힘.
- Fix: 제출 전 가벼운 인라인 체크 추가.
- Suggested command: /impeccable harden
- Files: MatchingRequestForm.tsx:31-53, 62

**[P3] 결과 리스트가 가장 빈약한 카드로 끝남**
- Why it matters: peak-end — 정렬은 옳지만 마지막 인상이 정보 빈약한 카드로 끝남.
- Fix: 마지막 카드 뒤 "조건 조정해서 더 찾아보기" 등 마무리 요소.
- Suggested command: /impeccable delight
- Files: MatchingScreen.tsx:108-119

## Persona Red Flags

**Jordan (첫 방문자)**: "자세히 보기"를 눌러도 등급 색 의미·만점 기준·50/30/20 가중치 설명이 없어 "왜 매칭됐는지" 답을 못 찾음.

**Sam (접근성)**: 펼치기 버튼 ARIA 누락 + unviewed-dot이 role 없는 aria-label만 있어 "새 결과" 신호가 스크린리더에 불안정하게 전달됨.

## Minor Observations

- /matching 첫 섹션이 뷰포트의 150%+ 를 차지해 폴드가 섹션 중간에서 끊김(디텍터 실측).
- 게시판의 settings-* 클래스 재사용은 "조용한 화면" 원칙에 맞는 의도된 선택 — 문제 아님.
- 390px 모바일 뷰는 이번 세션에서 라이브 확인 못 함(소스 리딩으로만 확인) — 실기기 확인 권장.

## Questions to Consider

1. 점수 분해에 가중치 색이 하나도 안 쓰인 건 이 규칙이 이 화면에 실제로 적용된 적이 없다는 뜻인가요?
2. 등급 배지 하나로 카드 스킨모피즘 테제 전체를 감당할 수 있을까요?
3. "투명성" 원칙을 진지하게 받아들인다면 50/30/20 가중치 자체를 사용자에게 보여줘야 할까요?
