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

export function TechIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M7 17h6M10 13.5V17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function SportsIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M10 2.75V17.25M2.75 10h14.5M4.3 5.3c2 1.7 3.6 2.8 5.7 2.8s3.7-1.1 5.7-2.8M4.3 14.7c2-1.7 3.6-2.8 5.7-2.8s3.7 1.1 5.7 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TravelIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M17.25 2.75 2.75 8.9l5.4 2.1M17.25 2.75 11.15 17.25l-2.1-5.4m8.2-9.1-8.2 9.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ArtIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="7" cy="8" r="1.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m3.5 15 4.3-4.3a1.5 1.5 0 0 1 2.12 0L12.5 13.3 15 10.8a1.5 1.5 0 0 1 2.12 0l1.38 1.38"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FoodIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 3v5.5a2.5 2.5 0 0 0 5 0V3M7 8.5V17M13 3v6a2 2 0 0 0 2 2v6M13 3v5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MusicIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="15" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="13.5" cy="13" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M7.75 15V4.75L15.75 3v10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TagIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10.6 2.75h4.65a2 2 0 0 1 2 2v4.65a2 2 0 0 1-.59 1.42l-7.4 7.4a2 2 0 0 1-2.83 0l-4.65-4.65a2 2 0 0 1 0-2.83l7.4-7.4a2 2 0 0 1 1.42-.59Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="13.5" cy="6.5" r="1.1" fill="currentColor" />
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