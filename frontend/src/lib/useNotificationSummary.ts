import { useEffect, useState } from 'react'
import { getNotificationSummary, type NotificationSummary } from './notificationsApi'
import { usePolling } from './usePolling'

const POLL_INTERVAL_MS = 20000

/**
 * AppNav는 로그인 이후 모든 화면에 떠 있어서, 화면을 옮겨 다니는 동안은
 * 마운트될 때마다 자연스럽게 최신 값을 받는다. 폴링은 그 사이(한 화면에
 * 계속 머무는 동안)에도 배지가 갱신되게 하는 보조 수단이라 메시징만큼
 * 급하지 않다고 보고 간격을 넉넉히 잡았다. 실패해도 배지 하나 안
 * 갱신되는 것뿐이라 조용히 무시한다 — 로그인 전(RequireAuth가 걷어내기
 * 전 잠깐)에도 호출될 수 있는데, 그때의 401/403도 같은 이유로 무시한다.
 */
export function useNotificationSummary(): NotificationSummary {
  const [summary, setSummary] = useState<NotificationSummary>({
    unviewed_matching_results: 0,
    pending_connection_requests: 0,
    unread_messages: 0,
  })

  useEffect(() => {
    let cancelled = false

    getNotificationSummary()
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        // 배지 하나 못 띄우는 것뿐 — 조용히 무시
      })

    return () => {
      cancelled = true
    }
  }, [])

  usePolling(async () => {
    try {
      const data = await getNotificationSummary()
      setSummary(data)
    } catch {
      // 다음 tick에서 다시 시도
    }
  }, POLL_INTERVAL_MS)

  return summary
}
