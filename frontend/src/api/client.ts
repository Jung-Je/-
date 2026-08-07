// 백엔드는 CORS_ALLOW_CREDENTIALS=True + SessionAuthentication 구성이므로
// 모든 요청은 credentials: 'include'로 세션/CSRF 쿠키를 함께 보낸다.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  // Django CSRF: 안전하지 않은 메서드는 csrftoken 쿠키 값을 헤더로 되돌려줘야 함
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    const csrfToken = readCookie('csrftoken')
    if (csrfToken) headers.set('X-CSRFToken', csrfToken)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const detail =
      (payload && (payload.detail as string)) ??
      (response.status === 403
        ? '로그인 시도가 너무 많아 잠시 차단되었습니다. 잠시 후 다시 시도해 주세요.'
        : '요청을 처리하지 못했습니다.')
    throw new ApiError(response.status, detail)
  }

  return payload as T
}