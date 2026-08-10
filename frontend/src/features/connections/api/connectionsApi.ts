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
export async function listReceivedConnections(): Promise<Connection[]> {
  return apiFetch<Connection[]>('/api/v1/matching/connections/received/')
}

export async function listSentConnections(): Promise<Connection[]> {
  return apiFetch<Connection[]>('/api/v1/matching/connections/sent/')
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
