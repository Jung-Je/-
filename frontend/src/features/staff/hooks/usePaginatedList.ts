import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../../lib/apiClient'
import type { PaginatedResponse } from '../../../lib/apiClient'

/**
 * 스태프 화면 6곳(유저·연결·문의·관심사·매칭 요청·게시판)이 "목록
 * state + 에러 state + 필터/페이지 변경 시 재조회"를 각자 거의 그대로
 * 복붙하고 있던 보일러플레이트를 한 곳으로 모은 훅(코드 리뷰 제안).
 * 화면마다 필터 종류가 달라서(검색어만 있는 곳, 상태+유형 두 개인 곳 등)
 * 필터 state 자체는 훅 밖(각 화면)에서 그대로 관리하고, 훅은 "이
 * fetcher를 이 deps가 바뀔 때마다 다시 부르고 결과/에러를 담아둔다"만
 * 책임진다.
 *
 * 기존 코드는 화면마다 두 가지 방식이 섞여 있었다 — 일부는 cancelled
 * 플래그로 응답이 뒤바뀌는 경쟁 상태를 막고, 일부는 eslint-disable로
 * 그냥 넘겨서 빠른 타이핑 중 오래된 응답이 최신 응답을 덮어쓸 위험이
 * 있었음. 여기서는 항상 cancelled 플래그를 쓰도록 통일.
 *
 * setData(낙관적 로컬 갱신 — 정지/상태변경처럼 서버가 갱신된 행만
 * 돌려줄 때)와 refresh(전체 재조회 — 삭제처럼 목록 자체가 바뀔 때)를
 * 둘 다 반환해서, 화면마다 필요한 쪽을 골라 쓰면 된다.
 */
export function usePaginatedList<T>(
  fetcher: () => Promise<PaginatedResponse<T>>,
  deps: unknown[],
  fallbackErrorMessage: string,
) {
  const [data, setData] = useState<PaginatedResponse<T> | null>(null)
  const [loadError, setLoadError] = useState('')

  // 매 렌더 최신 fetcher를 가리키게 해서, refresh()가 의존성 배열 없이도
  // 항상 최신 필터/페이지로 다시 조회하게 한다.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current()
      setData(result)
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.detail : fallbackErrorMessage)
    }
    // fallbackErrorMessage는 화면마다 리터럴 문자열로 고정 전달되므로
    // deps에서 빼도 안전 — 굳이 넣으면 화면 쪽에서 매 렌더 새 함수를
    // 안 만들려고 useMemo까지 둘러야 해서 번거로움만 늘어난다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    fetcherRef.current()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoadError('')
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof ApiError ? error.detail : fallbackErrorMessage)
      })

    return () => {
      cancelled = true
    }
    // deps는 호출부가 넘기는 필터/페이지 배열 그대로 — 훅 내부에서
    // 만들어내는 값이 아니라 정적으로 검사할 수 없어 여기서만 규칙을 끈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, setData, loadError, refresh }
}
