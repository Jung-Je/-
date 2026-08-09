import { apiFetch } from '../../../lib/apiClient'
import type { AuthUser, SignupPayload } from '../types'

/**
 * shape 브리프에서 확정한 로그인 API 계약:
 *   GET  /api/v1/auth/csrf/    -> 204, csrftoken 쿠키 설정
 *   POST /api/v1/auth/login/   -> 200 { user } | 400 { detail } | 403 { detail } (axes 잠금)
 *   POST /api/v1/auth/logout/  -> 204
 * 백엔드: apps/users/auth_views.py
 */
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

/**
 * 비밀번호 재설정 API 계약 (백엔드: apps/users/views.py UserViewSet.password_reset
 * / password_reset_confirm):
 *   POST /api/v1/users/users/password_reset/         { email } -> 200 { detail }
 *     계정 존재 여부와 무관하게 항상 같은 응답 — 이메일이 실재하면 메일 발송.
 *   POST /api/v1/users/users/password_reset_confirm/ { uid, token, new_password,
 *     new_password_confirm } -> 200 { detail } | 400 { ...필드별 오류 }
 * uid/token은 이메일로 발송된 링크(FRONTEND_URL/reset-password?uid=&token=)의
 * 쿼리 파라미터에서 그대로 읽어 넘긴다.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/users/password_reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export type ConfirmPasswordResetPayload = {
  uid: string
  token: string
  newPassword: string
  newPasswordConfirm: string
}

export async function confirmPasswordReset(payload: ConfirmPasswordResetPayload): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/users/password_reset_confirm/', {
    method: 'POST',
    body: JSON.stringify({
      uid: payload.uid,
      token: payload.token,
      new_password: payload.newPassword,
      new_password_confirm: payload.newPasswordConfirm,
    }),
  })
}
