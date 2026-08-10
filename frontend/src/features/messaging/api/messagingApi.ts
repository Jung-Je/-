import { apiFetch } from '../../../lib/apiClient'
import type { Message } from '../types'

/**
 * 메시지 계약 (백엔드: ConnectionViewSet.messages — 별도 "대화방" 모델 없이
 * 수락된 Connection을 그대로 대화방으로 쓴다):
 *   GET  /api/v1/matching/connections/{id}/messages/ -> 200 Message[]
 *     조회와 동시에 상대방이 보낸 안 읽은 메시지가 서버에서 읽음 처리된다.
 *   POST /api/v1/matching/connections/{id}/messages/ { body } -> 201 Message
 * 연결이 ACCEPTED 상태가 아니면 둘 다 400.
 */
export async function listMessages(connectionId: number): Promise<Message[]> {
  return apiFetch<Message[]>(`/api/v1/matching/connections/${connectionId}/messages/`)
}

export async function sendMessage(connectionId: number, body: string): Promise<Message> {
  return apiFetch<Message>(`/api/v1/matching/connections/${connectionId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}
