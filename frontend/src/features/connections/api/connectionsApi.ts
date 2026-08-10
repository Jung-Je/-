import { apiFetch } from '../../../lib/apiClient'
import type { Connection, ConnectionAction } from '../types'

/**
 * 연결 요청 생성 (백엔드: ConnectionViewSet.create). matchingResultId를
 * 함께 넘기면 해당 매칭 결과가 "연결 시도됨"으로 표시된다.
 */
export async function createConnection(payload: {
  toUserId: number
  matchingResultId?: number
  message?: string
}): Promise<Connection> {
  return apiFetch<Connection>('/api/v1/matching/connections/', {
    method: 'POST',
    body: JSON.stringify({
      to_user: payload.toUserId,
      matching_result: payload.matchingResultId ?? null,
      message: payload.message ?? '',
    }),
  })
}

// received/sent는 list()가 아니라 커스텀 @action이라
// DEFAULT_PAGINATION_CLASS를 타지 않고 배열을 그대로 반환한다.
// 주의: received는 "응답 대기중(PENDING)"인 요청만 반환한다 — 수락한
// 뒤에는 이 목록에서 사라진다(연결 화면의 "받은 요청" 섹션 의도상 맞는
// 동작). 그래서 ACCEPTED 연결까지 포함해 전부 보려면(예: 대화 목록)
// received/sent 대신 아래 listAllConnections를 써야 한다.
export async function listReceivedConnections(): Promise<Connection[]> {
  return apiFetch<Connection[]>('/api/v1/matching/connections/received/')
}

export async function listSentConnections(): Promise<Connection[]> {
  return apiFetch<Connection[]>('/api/v1/matching/connections/sent/')
}

type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * 상태·방향 상관없이 나와 관련된 연결 전부 (기본 list() 액션, 페이지네이션
 * 됨 — 지금은 첫 페이지만 가져온다). 대화 목록처럼 ACCEPTED 연결이
 * 양쪽 사용자 모두에게 보여야 하는 화면에 쓴다.
 */
export async function listAllConnections(): Promise<Connection[]> {
  const data = await apiFetch<PaginatedResponse<Connection>>('/api/v1/matching/connections/')
  return data.results
}

export async function getConnection(connectionId: number): Promise<Connection> {
  return apiFetch<Connection>(`/api/v1/matching/connections/${connectionId}/`)
}

export async function respondToConnection(
  connectionId: number,
  action: ConnectionAction,
): Promise<Connection> {
  return apiFetch<Connection>(`/api/v1/matching/connections/${connectionId}/respond/`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}
