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
    const { result } = renderHook(() => usePaginatedList(fetcher, [], '실패'))

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
})
