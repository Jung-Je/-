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

// DRF의 DEFAULT_PAGINATION_CLASS(PageNumberPagination)가 list 응답을 이
// 모양으로 감싼다 — matchingApi/connectionsApi/onboardingApi가 각자 똑같이
// 다시 선언하던 걸 여기 한 곳으로 모음.
export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * DRF의 기본 시리얼라이저 검증 오류는 {detail: "..."}가 아니라
 * {필드명: ["메시지", ...]} 형태로 온다 (로그인처럼 우리가 직접 만든 뷰만
 * detail을 명시적으로 준다). 화면에 필드별 오류를 각각 붙이기 전까지는,
 * 첫 번째 오류 메시지라도 그대로 보여주는 게 "요청을 처리하지 못했습니다"
 * 같은 뭉뚱그린 메시지보다 낫다.
 */
function firstFieldErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }
  return null
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
      firstFieldErrorMessage(payload) ??
      (response.status === 403
        ? '로그인 시도가 너무 많아 잠시 차단되었습니다. 잠시 후 다시 시도해 주세요.'
        : '요청을 처리하지 못했습니다.')
    throw new ApiError(response.status, detail)
  }

  return payload as T
}