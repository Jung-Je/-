import { apiFetch } from './apiClient'

export type NotificationSummary = {
  unviewed_matching_results: number
  pending_connection_requests: number
}

/**
 * AppNav의 매칭/연결 탭 배지에 쓰는 가벼운 카운트 조회 (백엔드:
 * NotificationSummaryView). 매칭·연결 두 도메인을 가로지르는 요약이라
 * 특정 도메인의 features API가 아니라 공용 lib에 둔다.
 */
export async function getNotificationSummary(): Promise<NotificationSummary> {
  return apiFetch<NotificationSummary>('/api/v1/matching/notifications/summary/')
}
