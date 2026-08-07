/**
 * 한 줄 굵기(1.75)·둥근 캡의 authored 아이콘 세트.
 * 유니코드 글리프/이모지를 아이콘 대용으로 쓰지 않는다.
 */
type IconProps = { size?: number }

export function EyeIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export function EyeOffIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2.75 2.75l14.5 14.5M8.28 8.34a2.5 2.5 0 0 0 3.4 3.4M5.8 5.86C3.2 7.3 1.5 10 1.5 10s3 6 8.5 6c1.55 0 2.9-.47 4.03-1.13M15.7 14.06C17.44 12.62 18.5 10 18.5 10s-3-6-8.5-6c-.62 0-1.2.07-1.76.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AlertIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 5.5v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="9" cy="12.25" r="1" fill="currentColor" />
    </svg>
  )
}

export function SpinnerIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="spinner-icon"
    >
      <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.75" opacity="0.22" />
      <path
        d="M16.25 9A7.25 7.25 0 0 0 9 1.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}