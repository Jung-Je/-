import { useEffect, useRef } from 'react'

/**
 * intervalMs마다 callback을 실행한다. 메시징처럼 웹소켓 없이 "그럭저럭
 * 실시간"이 필요한 화면에서 쓴다.
 *
 * - 탭이 백그라운드에 있는 동안은(document.visibilityState === 'hidden')
 *   실행을 건너뛰어 안 보는 화면에 불필요한 요청을 안 보낸다.
 * - 이전 호출이 아직 안 끝났으면 다음 tick도 건너뛴다 — 느린 네트워크에서
 *   요청이 쌓이는 걸 막는다.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    let running = false

    const id = setInterval(() => {
      if (running || document.visibilityState === 'hidden') return
      running = true
      Promise.resolve(callbackRef.current()).finally(() => {
        running = false
      })
    }, intervalMs)

    return () => clearInterval(id)
  }, [intervalMs])
}
