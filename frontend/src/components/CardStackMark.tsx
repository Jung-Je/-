/**
 * 워드마크 옆에 놓는 스택 카드 모티프.
 * 관심사(코랄)·성격(바이올렛)·위치(틸) 3장이 살짝 부채꼴로 겹쳐,
 * "사람은 모으는 카드다"라는 방향 테제를 로그인 화면 첫 진입에서부터 알린다.
 */
export function CardStackMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="매칭 카드 스택 로고"
    >
      <rect
        x="10"
        y="4"
        width="20"
        height="27"
        rx="4"
        transform="rotate(-8 20 17.5)"
        fill="var(--color-teal)"
      />
      <rect
        x="10"
        y="5"
        width="20"
        height="27"
        rx="4"
        transform="rotate(6 20 18.5)"
        fill="var(--color-violet)"
      />
      <rect x="9" y="6" width="22" height="29" rx="4.5" fill="var(--color-coral)" />
      <rect
        x="13"
        y="11"
        width="14"
        height="3"
        rx="1.5"
        fill="var(--color-on-coral)"
        opacity="0.85"
      />
      <rect
        x="13"
        y="17"
        width="9"
        height="2.5"
        rx="1.25"
        fill="var(--color-on-coral)"
        opacity="0.55"
      />
    </svg>
  )
}