import { apiFetch } from '../../../lib/apiClient'
import type { MatchingRequestPayload, MatchingRequestSummary, MatchingResult } from '../types'

// DRF의 DEFAULT_PAGINATION_CLASS(PageNumberPagination)가 list 응답을 이
// 모양으로 감싼다. 결과가 PAGE_SIZE(20)를 넘어가는 경우의 "더 보기"는
// 아직 다루지 않는다 — 첫 페이지만 보여준다.
type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * 매칭 요청 생성 (백엔드: MatchingRequestViewSet.create). 생성과 동시에
 * 서버가 동기적으로 채점까지 끝내고 완료된 상태로 응답하므로, 이 호출이
 * 끝나면 바로 결과 목록을 다시 불러오면 된다.
 */
export async function createMatchingRequest(
  payload: MatchingRequestPayload,
): Promise<MatchingRequestSummary> {
  return apiFetch<MatchingRequestSummary>('/api/v1/matching/requests/', {
    method: 'POST',
    body: JSON.stringify({
      min_age: payload.minAge ?? null,
      max_age: payload.maxAge ?? null,
      preferred_location: payload.preferredLocation ?? '',
      max_results: payload.maxResults ?? 10,
    }),
  })
}

export async function listMatchingResults(): Promise<MatchingResult[]> {
  const data = await apiFetch<PaginatedResponse<MatchingResult>>('/api/v1/matching/results/')
  return data.results
}

/**
 * 결과 상세 조회 (백엔드: MatchingResultViewSet.retrieve). 조회 시
 * is_viewed를 서버가 자동으로 true로 바꿔주므로, 카드를 펼칠 때 이걸
 * 한 번 호출해두면 "확인함" 상태가 자연스럽게 반영된다.
 */
export async function viewMatchingResult(resultId: number): Promise<MatchingResult> {
  return apiFetch<MatchingResult>(`/api/v1/matching/results/${resultId}/`)
}
