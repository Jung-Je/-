import { AlertIcon } from '../../../components/icons'

type Props = {
  loadError: string
  /** data가 아직 없을 때(첫 로딩)만 true로 넘기면 로딩 문구가 뜬다. */
  loading: boolean
  /** data는 있지만 결과가 0건일 때 보여줄 문구. */
  emptyMessage?: string
}

/**
 * 스태프 화면 6곳이 거의 그대로 복붙하던 "에러/로딩/빈 목록" 3줄
 * 블록(코드 리뷰 제안 — usePaginatedList와 짝) — 화면마다 톤이 다른
 * emptyMessage만 갈아 끼우면 됨.
 */
export function StaffListStatus({ loadError, loading, emptyMessage }: Props) {
  return (
    <>
      {loadError && (
        <p className="staff-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      )}
      {loading && !loadError && <p className="staff-loading">불러오는 중…</p>}
      {emptyMessage && !loading && !loadError && <p className="staff-empty">{emptyMessage}</p>}
    </>
  )
}
