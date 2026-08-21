import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePaginatedList } from './usePaginatedList'
import { ApiError } from '../../../lib/apiClient'
import type { PaginatedResponse } from '../../../lib/apiClient'

function page<T>(results: T[]): PaginatedResponse<T> {
  return { count: results.length, next: null, previous: null, results }
}

describe('usePaginatedList', () => {
  it('마운트 시 fetcher를 호출해 data를 채운다', async () => {
    const fetcher = vi.fn().mockResolvedValue(page([{ id: 1 }]))
    const { result } = renderHook(() => usePaginatedList(fetcher, [], '실패'))

    await waitFor(() => expect(result.current.data).toEqual(page([{ id: 1 }])))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('deps가 바뀌면 다시 조회한다', async () => {
    const fetcher = vi.fn().mockResolvedValue(page([]))
    const { result, rerender } = renderHook(({ dep }) => usePaginatedList(fetcher, [dep], '실패'), {
      initialProps: { dep: 1 },
    })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    rerender({ dep: 2 })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(result.current.loadError).toBe('')
  })

  it('실패하면 ApiError.detail을 loadError에 담고, 아니면 폴백 메시지를 쓴다', async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(500, '서버 오류'))
    const { result } = renderHook(() => usePaginatedList(fetcher, [], '기본 에러 메시지'))

    await waitFor(() => expect(result.current.loadError).toBe('서버 오류'))
  })

  it('setData로 로컬 낙관적 갱신을 할 수 있다', async () => {
    const fetcher = vi.fn().mockResolvedValue(page([{ id: 1, active: false }]))
    // vi.fn()의 반환 타입이 제네릭 추론 없이는 unknown으로 좁혀져서(vitest
    // Mock 타입 특성), usePaginatedList<T>의 T가 안 잡히고 아래 setData의
    // row가 unknown이 돼 스프레드가 막힌다(TS2698) — 여기서만 명시적으로
    // 타입 인자를 준다.
    const { result } = renderHook(() =>
      usePaginatedList<{ id: number; active: boolean }>(fetcher, [], '실패'),
    )

    await waitFor(() => expect(result.current.data).not.toBeNull())

    act(() => {
      result.current.setData((current) =>
        current
          ? { ...current, results: current.results.map((row) => ({ ...row, active: true })) }
          : current,
      )
    })

    expect(result.current.data?.results).toEqual([{ id: 1, active: true }])
    // 낙관적 갱신은 서버를 다시 안 부른다
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refresh()는 deps 변경 없이도 최신 필터로 다시 조회한다', async () => {
    let currentFilter = 'a'
    const fetcher = vi.fn(() => Promise.resolve(page([currentFilter])))
    const { result } = renderHook(() => usePaginatedList(fetcher, [], '실패'))

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    currentFilter = 'b'
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.data?.results).toEqual(['b'])
  })

  it('refresh() 응답이 그 뒤에 나간 deps 변경 요청보다 늦게 도착해도 최신 데이터를 덮어쓰지 않는다', async () => {
    // 코드 리뷰로 발견한 회귀 재현 — 삭제 후 refresh()를 부른 직후
    // 페이지를 옮기면(deps 변경) 두 요청이 동시에 떠있는데, 늦게 도착한
    // 쪽이 refresh()라면 이미 최신인 다음 페이지 데이터를 옛 응답으로
    // 덮어써선 안 된다.
    const deferred: Array<(value: PaginatedResponse<string>) => void> = []
    const fetcher = vi.fn(
      () =>
        new Promise<PaginatedResponse<string>>((resolve) => {
          deferred.push(resolve)
        }),
    )

    const { result, rerender } = renderHook(({ dep }) => usePaginatedList(fetcher, [dep], '실패'), {
      initialProps: { dep: 1 },
    })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1)) // 마운트 요청

    let refreshPromise: Promise<void> = Promise.resolve()
    act(() => {
      refreshPromise = result.current.refresh() // refresh 요청 (더 먼저 나감)
    })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))

    rerender({ dep: 2 }) // deps 변경 요청 (더 나중에 나감 = 진짜 최신)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))

    // 더 나중에 나간 deps 요청이 먼저 도착
    await act(async () => {
      deferred[2](page(['page2']))
    })
    expect(result.current.data?.results).toEqual(['page2'])

    // 더 먼저 나간 refresh 요청이 뒤늦게 도착 — 무시돼야 함
    await act(async () => {
      deferred[1](page(['stale-refresh']))
      await refreshPromise
    })
    expect(result.current.data?.results).toEqual(['page2'])
  })
})
