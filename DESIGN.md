---
name: 매칭 (가칭)
description: 취향·성격·위치를 정량적으로 설명하는 친구·네트워킹 매칭 서비스
colors:
  coral: "#FF5A36"
  coral-on: "#1B1D29"
  violet: "#8C7CF0"
  violet-text: "#5B46CC"
  teal: "#2FB8A6"
  teal-text: "#178071"
  bg: "#EDEEF2"
  surface: "#FFFFFF"
  ink: "#1B1D29"
  ink-muted: "rgba(27, 29, 41, 0.70)"
  ink-placeholder: "rgba(27, 29, 41, 0.64)"
  ink-disabled: "rgba(27, 29, 41, 0.38)"
  border: "rgba(27, 29, 41, 0.12)"
  border-strong: "rgba(27, 29, 41, 0.22)"
  danger: "#C81E4D"
  danger-bg: "#FBE7ED"
typography:
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  title:
    fontFamily: "{typography.body.fontFamily}"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.3
  label:
    fontFamily: "{typography.body.fontFamily}"
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "12px"
  card: "20px"
  card-compact: "16px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
  7: "48px"
  8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.coral-on}"
    rounded: "{rounded.control}"
    padding: "13px 20px"
  button-primary-disabled:
    backgroundColor: "rgba(255, 90, 54, 0.45)"
    textColor: "{colors.coral-on}"
    rounded: "{rounded.control}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  card-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
---

# Design System: 매칭 (가칭)

## Overview

**Creative North Star: "포토카드 바인더 (Photocard Binder)"**

사람은 스와이프해서 넘기는 프로필이 아니라, 슬리브에 꽂아 모으는 포토카드다. K-pop 포토카드 수집·트레이딩 문화에서 형식(스탯 카드, 등급감, 슬리브 그리드, 인덱스 탭)만 빌리고, 실제 팬덤 이미지·굿즈 그래픽은 쓰지 않는다 — 특정 팬덤 전용처럼 좁아지는 것을 막기 위함이다. 관심사(코랄)·성격(바이올렛)·위치(틸) 3색은 장식이 아니라 매칭 알고리즘의 가중치(50/30/20)를 색의 채도·온도 순서로 인코딩한 기능색이다.

확정된 시각적 거부: 틴더·범블류의 좌우 스와이프 제스처와 사진 중심 카드, 링크드인류의 차갑고 따뜻함 없는 미니멀리즘. 이 세계관은 여전히 Operate 모드(과업 완료가 우선)를 따르므로, 인증·설정처럼 "조용한" 화면은 팔레트·코너·타이포 문법만 물려받고 카드 스킨모피즘(홀로그램, 슬리브 텍스처)은 매칭 결과·바인더처럼 실제로 "카드를 다루는" 화면에만 쓴다.

**Key Characteristics:**
- 라이트 전용 — 바인더/포토카드는 밝은 실내광에서 다뤄지는 물성이라 다크 배경이 낯설다.
- Full palette 색 전략 — 관심사·성격·위치라는 실제 제품 구조를 3개의 명명된 역할색이 대변한다.
- 절제된 화이트 카드 표면 위에 코랄 CTA 하나만 강하게 튀는 절제-강조 대비.
- Pretendard 단일 UI 서체 — 워크호스 서체로 전 화면을 관통, 별도 디스플레이 서체 없음.

## Colors

배경은 펄 그레이, 표면은 순백, 텍스트는 짙은 잉크 네이비 — 그 위에 세 개의 명명된 역할색이 얹힌다.

### Primary
- **코랄 (Coral)** (`#FF5A36`): 관심사(가중치 50%)를 대변하며 주 CTA(로그인 버튼 등) 채움색으로 쓴다. 채도가 가장 높고 따뜻해, 3색 중 가장 먼저 눈에 띄어야 하는 요소에만 쓴다.

### Secondary
- **바이올렛 (Violet)** (`#8C7CF0` 그래픽 / `#5B46CC` 텍스트): 성격(가중치 30%)을 대변. 텍스트·링크·포커스 링에는 대비를 위해 어두운 텍스트 변형(`#5B46CC`, 대비 6.58:1)을 쓰고, 밝은 원색(`#8C7CF0`)은 그래픽 전용이다.

### Tertiary
- **틸 (Teal)** (`#2FB8A6` 그래픽 / `#178071` 텍스트): 위치(가중치 20%)를 대변, 3색 중 가장 차분한 색. 성공 배지 등 낮은 강조가 필요한 곳에 쓴다.

### Neutral
- **펄 그레이 (Pearl Gray)** (`#EDEEF2`): 앱 배경.
- **화이트 (Surface White)** (`#FFFFFF`): 카드/입력 표면.
- **잉크 네이비 (Ink Navy)** (`#1B1D29`): 본문 텍스트, 코랄 버튼 위 텍스트(대비 5.4:1).
- **잉크 뮤트/플레이스홀더/디세이블드**: 각각 잉크의 70% / 64% / 38% 불투명도. 70%·64%는 각각 대비 ≥5.7:1 / ≥4.8:1로 AA를 만족하도록 보정한 값이며, 38%는 비활성(disabled) 컨트롤 전용으로 AA 대비 요건이 면제되는 자리에만 쓴다.

### Named Rules
**The Weighted Color Rule.** 코랄=관심사, 바이올렛=성격, 틸=위치라는 매핑과 그 등장 순서는 화면을 막론하고 절대 뒤바뀌지 않는다 — 색이 알고리즘 가중치(50/30/20)를 그대로 인코딩하기 때문이다.
**The No-Gray-Punish Rule.** 매칭 점수가 낮다고 사람 카드를 회색조로 죽이지 않는다. 채도를 낮출 뿐 존재감을 지우지 않는다(현재는 로그인 화면에만 적용된 원칙이며, 매칭 결과 카드 구현 시 이어진다).

## Typography

**Body/UI Font:** Pretendard Variable (with Pretendard, -apple-system, system-ui, sans-serif)

**Character:** 하나의 워크호스 UI 서체가 제목부터 라벨까지 전부 담당한다. Operate 모드에서 표현이 과업을 가리지 않도록, 별도 디스플레이 서체를 얹지 않았다.

### Hierarchy
- **Title** (700, 26px/1.3, -0.02em): 화면 제목(예: "로그인").
- **Body** (400, 16px/1.5, -0.01em): 기본 본문·입력 텍스트.
- **Label** (600, 14px): 폼 라벨, 링크.
- **Small** (400, 15px/1.5, ink-muted): 보조 설명 문구.

## Layout

두 가지 레이아웃 패턴이 있다.

**인증/온보딩 (단일 카드).** 로그인·회원가입·비밀번호 재설정·온보딩 마법사. 중앙 정렬 단일 컬럼 카드, 뷰포트 전체에서 세로·가로 모두 flex 중앙 정렬. 카드 최대 너비 400px(인증) / 560px(온보딩). 420px 미만 브레이크포인트에서 카드 코너가 20px→16px로, 패딩이 줄고, 좌우로 나란하던 링크 쌍이 세로로 쌓인다.

**앱 셸 (상단 네비 + 콘텐츠).** 매칭·연결·설정·메시지처럼 로그인 후 `AppNav`가 상단에 떠 있는 화면들. 콘텐츠 최대 너비는 화면마다 다르다 — 설정/메시지 560px, 연결 640px, 매칭(카드 리스트라 더 넓게) 720px. 480px 미만 브레이크포인트에서 패딩·폰트가 줄어든다(인증/온보딩의 420px과는 다른 값 — 카드 한 장이 아니라 리스트/네비가 있는 더 넓은 레이아웃이라 전환점을 조금 더 넓게 잡았다).

두 패턴 모두 간격은 4px 기준 스케일(4/8/12/16/24/32/48/64)을 따른다.

## Elevation & Depth

표면은 대부분 플랫하고, 카드 하나만 오프셋+블러가 있는 부드러운 그림자로 배경 위에 떠 있다. 포커스 상태는 별도의 글로우 링(그림자가 아닌 box-shadow 기반 링)으로 표현한다.

### Shadow Vocabulary
- **card** (`0 1px 2px rgba(27,29,41,0.04), 0 20px 40px -16px rgba(27,29,41,0.22)`): 로그인 카드처럼 배경 위에 떠 있는 유일한 표면 요소.
- **focus** (`0 0 0 3px rgba(91,70,204,0.28)`): 키보드 포커스 시 입력 필드 테두리와 함께 나타나는 글로우 링.

### Named Rules
**The One Card Rule.** 한 화면에 그림자를 지닌 표면은 원칙적으로 하나(주 카드)뿐이다. 제로 오프셋 컬러 헤일로나 장식용 블러는 쓰지 않는다.

## Shapes

카드 20px(좁은 화면 16px), 입력·버튼 12px, 원형 배지·토글 버튼은 완전한 알약형(999px). 카드 상단에만 옅은 코랄/바이올렛 톤의 2px 엣지를 둘러 "다루는 카드"라는 세계관을 절제된 수준으로 암시한다 — 전체 스킨모피즘 없이.

## Components

### Buttons
- **Shape:** 12px 라운드.
- **Primary:** 코랄 채움(`#FF5A36`) + 잉크 텍스트(`#1B1D29`, 대비 5.4:1), 13px 20px 패딩, 로딩 중 스피너+"로그인 중…" 라벨로 전환.
- **Hover / Focus:** hover 시 밝기 4% 감소, active 시 1px 눌림. 포커스는 전역 `:focus-visible` 링(바이올렛)을 상속.
- **Disabled:** 코랄 45% 불투명도 배경, 커서 not-allowed — WCAG 비활성 예외 적용.

### Inputs / Fields
- **Style:** 1.5px `border-strong` 스트로크, 12px 라운드, 흰 배경.
- **Focus:** 테두리가 포커스 바이올렛(`#5B46CC`)으로 바뀌고 글로우 링이 함께 나타난다.
- **Error:** 테두리가 danger(`#C81E4D`)로 바뀌고 `aria-invalid`가 함께 선다.
- **Placeholder:** `ink-placeholder`(잉크 64%) — AA 대비 확보를 위해 일반적인 "옅은 회색" 관행보다 의도적으로 진하다.

### Card / Container
- **Corner:** 20px(좁은 화면 16px).
- **Background:** 흰 표면.
- **Shadow:** Elevation의 `card` 토큰.
- **Border:** 상단에만 옅은 역할색 2px 엣지(로그인=코랄, 준비중 화면=바이올렛).
- **Padding:** 48px 32px 24px(넉넉한 상단, 좁은 화면에서 32px 16px 24px로 축소).

### Error Banner
- **Style:** danger 배경 틴트(`#FBE7ED`) + danger 텍스트, 좌우 스트라이프 없이 전체 배경으로 표현. authored 알림 아이콘 동반, `role="alert"`.

### Icon Button (비밀번호 토글)
- **Style:** 32px 원형(999px) 히트 영역, authored 눈 아이콘(선 굵기 1.75, 열림/닫힘 두 상태).

### 워드마크 (Signature Component)
- 코랄·바이올렛·틸 3장의 둥근 사각형이 살짝 부채꼴로 겹친 스택 카드 아이콘 — "사람은 모으는 카드다"라는 세계관 테제를 첫 진입 화면부터 알리는 유일한 장식 요소.

## Do's and Don'ts

### Do:
- **Do** 관심사=코랄, 성격=바이올렛, 위치=틸 매핑을 모든 화면에서 그대로 유지한다.
- **Do** 원색(코랄/바이올렛/틸)은 그래픽·채움 전용으로, 텍스트에는 각 역할의 어두운 "-text" 변형만 쓴다(AA 대비 확보).
- **Do** 카드 표면은 화면당 원칙적으로 하나만 그림자를 지닌다.
- **Do** 인증·설정 등 "조용한" 화면은 팔레트·코너 문법만 물려받고, 홀로그램/슬리브 텍스처 같은 스킨모피즘은 실제로 카드를 다루는 화면(매칭 결과, 바인더)에만 쓴다.

### Don't:
- **Don't** 좌우 스와이프 제스처를 매칭/거절 동작에 쓰지 않는다 — 명시적 버튼으로만 표현한다.
- **Don't** 낮은 매칭 점수를 회색조·흐릿함으로 벌주듯 표현하지 않는다.
- **Don't** 카드·경고·리스트 아이템에 좌우 컬러 스트라이프(강한 `border-left`/`border-right`)를 쓰지 않는다 — 배경 틴트나 상단 엣지로 강조한다.
- **Don't** Pretendard 외의 시스템 기본 서체(Arial, 플랫폼 산세리프)를 디스플레이 보이스로 쓰지 않는다.