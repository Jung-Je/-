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

/**
 * 회원가입 API 계약 (백엔드: apps/users/views.py UserViewSet.create,
 * UserCreateSerializer):
 *   POST /api/v1/users/users/ -> 201 { id, username, email, ... } | 400 { ...필드별 오류 }
 * 계정 생성만 하고 세션은 만들지 않으므로, 성공 후 login()을 이어서 호출해야 한다.
 * 프로필(이름/관심사/성격 등)은 회원가입 범위 밖 — 온보딩 단계에서 따로 수집한다.
 */
export type SignupPayload = {
  username: string
  email: string
  password: string
  passwordConfirm: string
}

export async function signup(payload: SignupPayload): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/users/', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      password_confirm: payload.passwordConfirm,
    }),
  })
}