import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './apiClient'

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    status: 200,
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({}),
    ...response,
  } as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('요청이 성공하면 JSON 바디를 그대로 반환한다', async () => {
    mockFetchOnce({ json: async () => ({ id: 1, name: '설군' }) })

    const result = await apiFetch<{ id: number; name: string }>('/api/users/1')

    expect(result).toEqual({ id: 1, name: '설군' })
  })

  it('204 No Content면 undefined를 반환한다', async () => {
    mockFetchOnce({ status: 204, headers: new Headers() })

    const result = await apiFetch('/api/logout')

    expect(result).toBeUndefined()
  })

  it('실패 응답의 detail 메시지를 담아 ApiError를 던진다', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: '이미 사용 중인 이메일입니다.' }),
    })

    await expect(apiFetch('/api/signup')).rejects.toMatchObject({
      status: 400,
      detail: '이미 사용 중인 이메일입니다.',
    })
  })

  it('필드별 검증 오류만 있으면 첫 번째 메시지를 detail로 사용한다', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: async () => ({ email: ['유효한 이메일 주소를 입력하세요.'] }),
    })

    await expect(apiFetch('/api/signup')).rejects.toMatchObject({
      detail: '유효한 이메일 주소를 입력하세요.',
    })
  })

  it('네트워크 자체가 실패하면 상태 0의 ApiError를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(apiFetch('/api/users/me')).rejects.toBeInstanceOf(ApiError)
    await expect(apiFetch('/api/users/me')).rejects.toMatchObject({ status: 0 })
  })
})
