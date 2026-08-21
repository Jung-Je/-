import type { PaginatedResponse } from '../../../lib/apiClient'

// DRF REST_FRAMEWORK.PAGE_SIZE(backend/config/settings/base.py) — 서버가
// 응답 바디에 페이지 크기를 안 실어주고, 클라이언트도 바꿀 수 없는
// 고정값이라(onboardingApi.ts의 같은 가정 참고) 총 페이지 수 계산에
// 그대로 하드코딩해도 안전하다.
const STAFF_PAGE_SIZE = 20

type Props = {
  data: PaginatedResponse<unknown> | null
  page: number
  onPageChange: (updater: (page: number) => number) => void
  /** "총 12명"/"총 12건" 등 단위만 화면마다 다름. */
  unit?: string
}

/** 스태프 화면 6곳이 거의 그대로 복붙하던 이전/다음 페이지네이션
 * 푸터(코드 리뷰 제안 — usePaginatedList와 짝). 지금 몇 페이지째인지 알
 * 방법이 이전/다음 버튼의 비활성 여부뿐이라, 목록을 훑는 관리자가 남은
 * 분량을 가늠하기 어렵다는 리뷰 지적(critique)을 반영해 위치 표시를
 * 더했다. */
export function StaffPagination({ data, page, onPageChange, unit = '건' }: Props) {
  if (!data) return null

  const totalPages = Math.max(1, Math.ceil(data.count / STAFF_PAGE_SIZE))

  return (
    <div className="staff-pagination">
      <button type="button" disabled={!data.previous} onClick={() => onPageChange((p) => p - 1)}>
        이전
      </button>
      <span>
        {page} / {totalPages}페이지 · 총 {data.count}
        {unit}
      </span>
      <button type="button" disabled={!data.next} onClick={() => onPageChange((p) => p + 1)}>
        다음
      </button>
    </div>
  )
}
