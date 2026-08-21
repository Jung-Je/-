/**
 * 워드마크 옆에 놓는 스택 카드 모티프.
 * 관심사(코랄)·성격(바이올렛)·위치(틸) 3장이 부채꼴로 겹쳐,
 * "사람은 모으는 카드다"라는 방향 테제를 로그인 화면 첫 진입에서부터 알린다.
 *
 * 뒤 두 장(틸·바이올렛)은 앞 카드(코랄)보다 살짝 크게, 회전폭도 넓게
 * 잡아서 40px 실제 렌더 크기에서도 모서리가 뚜렷이 삐져나오게 했다 —
 * 이전 버전은 세 장이 거의 같은 크기라 코랄 뒤로 완전히 가려졌었다.
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
        x="8"
        y="6"
        width="24"
        height="30"
        rx="4.5"
        transform="rotate(-16 20 21)"
        fill="var(--color-teal)"
      />
      <rect
        x="8"
        y="6"
        width="24"
        height="30"
        rx="4.5"
        transform="rotate(13 20 21)"
        fill="var(--color-violet)"
      />
      <rect x="9" y="5" width="22" height="29" rx="4.5" fill="var(--color-coral)" />
      <rect
        x="13"
        y="10"
        width="14"
        height="3"
        rx="1.5"
        fill="var(--color-on-coral)"
        opacity="0.85"
      />
      <rect
        x="13"
        y="16"
        width="9"
        height="2.5"
        rx="1.25"
        fill="var(--color-on-coral)"
        opacity="0.55"
      />
    </svg>
  )
}