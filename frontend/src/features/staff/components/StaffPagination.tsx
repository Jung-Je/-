import type { PaginatedResponse } from '../../../lib/apiClient'

type Props = {
  data: PaginatedResponse<unknown> | null
  onPageChange: (updater: (page: number) => number) => void
  /** "총 12명"/"총 12건" 등 단위만 화면마다 다름. */
  unit?: string
}

/** 스태프 화면 6곳이 거의 그대로 복붙하던 이전/다음 페이지네이션
 * 푸터(코드 리뷰 제안 — usePaginatedList와 짝). */
export function StaffPagination({ data, onPageChange, unit = '건' }: Props) {
  if (!data) return null

  return (
    <div className="staff-pagination">
      <button type="button" disabled={!data.previous} onClick={() => onPageChange((p) => p - 1)}>
        이전
      </button>
      <span>
        총 {data.count}
        {unit}
      </span>
      <button type="button" disabled={!data.next} onClick={() => onPageChange((p) => p + 1)}>
        다음
      </button>
    </div>
  )
}
