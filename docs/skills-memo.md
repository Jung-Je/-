# 프로젝트 스킬 메모 (작성: 2026-08-18)

## 이 프로젝트에 설치된 Claude 스킬

| 스킬 | 위치 | 역할 | 출처 |
|---|---|---|---|
| **impeccable** (v4.0.4) | `.claude/skills/impeccable` | 프론트엔드 UI 디자인/리뷰/개선 전담. 이 프로젝트에서 "UI 품질 문제 17개 크리틱" 등 실제로 여러 번 사용된 핵심 스킬 | 로컬 설치 |
| **ui-ux-pro-max** | `.claude/skills/ui-ux-pro-max` | 스타일 67종·팔레트 96종·폰트 페어링 57종 등 디자인 레퍼런스 DB. UI 구현/리뷰 시 참고용 | 로컬 설치 |
| **design-taste-frontend** | `.claude/skills/design-taste-frontend` **+** `.agents/skills/design-taste-frontend` (동일 내용 중복 위치) | 랜딩페이지·포트폴리오·리디자인용 "안티-슬롭"(템플릿처럼 안 보이게) 스킬 | GitHub `Leonxlnx/taste-skill` (`skills-lock.json`에 잠금 기록됨) |

→ 셋 다 **프론트엔드 디자인/UI 품질** 쪽에 집중된 스킬들이고, `docs/progress.md`에 기록된 "UI가 너무 대충이다" 피드백 대응 작업에서 실제로 활용된 이력이 있음.

### design-taste-frontend(Taste) vs ui-ux-pro-max 비교

| | **Taste** | **ui-ux-pro-max** |
|---|---|---|
| 적용 범위 | 랜딩페이지·포트폴리오·리디자인 **만** (대시보드/데이터테이블/멀티스텝 제품 UI는 명시적 제외) | 웹사이트, 대시보드, 관리자 패널, 이커머스, SaaS, 모바일 앱까지 전 제품 유형 |
| 작동 방식 | SKILL.md에 규칙이 그대로 박힌 정적 룰북(1200줄) | `search.py` CLI로 검색 가능한 DB(스타일·팔레트·폰트페어링·차트)를 쿼리하는 도구형 |
| 철학 | "AI스러운 뻔한 디자인(클리셰)을 어떻게 피할까" — 구체적 금지 목록(폰트·색·레이아웃 규칙) | "기본적인 UX 품질을 어떻게 보장할까" — 접근성·성능·반응형 등 범용 체크리스트 |

**이 프로젝트에 대한 적용 판단**: 프로젝트 구조(`matching`/`settings`/`board`/`staff`/`onboarding`/`login` 등)가 전부 로그인 후 **제품 UI(멀티스텝 위저드, 관리자 대시보드, 폼, 리스트)**이고 별도 랜딩/마케팅 페이지가 없어서, Taste가 명시적으로 "적용 제외"한 대상에 거의 해당함. 따라서:
- **ui-ux-pro-max**: 지금 실질적으로 쓰이는 쪽 (impeccable 크리틱 작업에도 활용된 이력 있음)
- **Taste**: 지금은 거의 발동될 일 없는 대기 상태. 나중에 회원가입 전 공개 랜딩/마케팅 페이지를 만들게 되면 그때 유용해질 수 있음

## GSD Core (`@opengsd/gsd-core`) — 미설치, 검토만 함

| 항목 | 내용 |
|---|---|
| 정체 | AI 코딩 에이전트용 컨텍스트 엔지니어링 + 스펙 기반 개발 프레임워크 |
| 설치 명령 | `npx @opengsd/gsd-core@latest` (대화형 설치, 런타임/전역·로컬 선택) |
| 핵심 루프 | Discuss → Plan → Execute → Verify → Ship |
| 이 프로젝트 적용 판단 | **보류 (지금은 불필요)** — `docs/progress.md`로 이미 상태 추적이 잘 되고 있고, 대규모 병렬 서브에이전트가 필요한 규모도 아님. 향후 대형 마일스톤을 여러 단계로 쪼개 병렬 실행해야 할 때 재검토 |

## mcp-builder — 미설치, 검토만 함

| 항목 | 내용 |
|---|---|
| 정체 | Anthropic 공식 스킬(`anthropics/skills` 저장소). **MCP(Model Context Protocol) 서버를 새로 만들어주는** 메타 스킬 — Python(FastMCP)/Node(TypeScript SDK)로 스캐폴딩, 툴 정의, 외부 API 인증 연동까지 처리 |
| 성격 | 이 프로젝트의 기능(매칭 서비스)을 만드는 스킬이 아니라, **Claude 자신이 쓸 새 도구를 늘리는** 스킬 — impeccable/ui-ux-pro-max/Taste와는 완전히 다른 층위 |
| 이 프로젝트 적용 판단 | **불필요** — `PRODUCT.md`/`DESIGN.md`/`docs/progress.md`/`README.md` 어디에도 MCP 관련 언급 없음. 기능 검증은 이미 백엔드 테스트 스위트 + `claude-in-chrome` 라이브 브라우저 검증으로 충분히 커버되고 있음 |
| 향후 필요해질 경우 | 다른 AI 에이전트가 이 서비스의 API(매칭/스태프 데이터 등)를 툴로 직접 호출해야 하거나, Claude Code 작업 중 브라우저 대신 DB/API에 직접 접근하는 전용 툴이 필요해지면 그때 재검토 |
