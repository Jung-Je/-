import { apiFetch } from './client'

/**
 * shape 브리프에서 확정한 로그인 API 계약 (백엔드 신규 작업 범위):
 *   GET  /api/v1/auth/csrf/    -> 204, csrftoken 쿠키 설정
 *   POST /api/v1/auth/login/   -> 200 { user } | 400 { detail } | 403 { detail } (axes 잠금)
 *   POST /api/v1/auth/logout/  -> 204
 * 아직 백엔드에 구현되어 있지 않으므로, 이 계약대로 프론트를 먼저 짜 두고
 * 백엔드 작업이 끝나면 그대로 맞물리게 한다.
 */
export type AuthUser = {
  id: number
  username: string
  email: string
  is_profile_complete: boolean
}

export async function primeCsrf(): Promise<void> {
  await apiFetch<void>('/api/v1/auth/csrf/')
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>('/api/v1/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return user
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/api/v1/auth/logout/', { method: 'POST' })
}