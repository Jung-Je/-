import { apiFetch } from '../../../lib/apiClient'
import type {
  AuthUser,
  KakaoLoginResult,
  KakaoSignupCompletionPayload,
  KakaoVerificationStatus,
  SignupPayload,
} from '../types'

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
 * 현재 로그인한 사용자 조회 (백엔드: UserViewSet.me). 세션 쿠키만으로는
 * 브라우저가 로그인 상태를 알 수 없으므로, 보호된 화면에 들어갈 때마다
 * 이걸로 실제 인증 여부를 확인한다. 비로그인이면 403.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/v1/users/users/me/')
}

/**
 * 회원가입 이메일 인증 API 계약 (백엔드: apps/users/views/user.py
 * UserViewSet.request_email_verification / confirm_email_verification):
 *   POST /api/v1/users/users/request_email_verification/ { email } ->
 *     200 { detail } | 400 { email: [...] }(이미 가입된 이메일) |
 *     429 { detail }(60초 재전송 쿨다운)
 *   POST /api/v1/users/users/confirm_email_verification/ { email, code } ->
 *     200 { verified: true } | 400 { detail }(코드 불일치·만료·시도 초과)
 * 인증에 성공하면 서버가 그 사실을 이메일 기준으로 1시간 동안 기억해서,
 * signup()이 같은 이메일로 계정을 만들 수 있게 해준다(카카오 가입은
 * 대상 아님 — 카카오 OAuth 자체가 이미 이메일 소유를 보증).
 */
export async function requestEmailVerification(email: string): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/users/request_email_verification/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function confirmEmailVerification(email: string, code: string): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/users/confirm_email_verification/', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

/**
 * 회원가입 API 계약 (백엔드: apps/users/views.py UserViewSet.create,
 * UserCreateSerializer):
 *   POST /api/v1/users/users/ -> 201 { id, username, email, ... } | 400 { ...필드별 오류 }
 * 계정 생성만 하고 세션은 만들지 않으므로, 성공 후 login()을 이어서 호출해야 한다.
 * date_of_birth는 회원가입이 만 19세 이상만 가능해서 받는 최소연령 검증용
 * — 이름/관심사/성격 등 나머지 프로필은 회원가입 범위 밖(온보딩 단계에서
 * 따로 수집). email은 request_email_verification/confirm_email_verification으로
 * 미리 인증돼 있어야 한다 — 안 그러면 서버가 400으로 거부.
 */
export async function signup(payload: SignupPayload): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/users/', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      email: payload.email,
      date_of_birth: payload.dateOfBirth,
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

/**
 * 회원가입 성인인증 API 계약 (백엔드: apps/users/views/auth.py
 * KakaoAgeVerificationView):
 *   GET  /api/v1/auth/kakao/verify/ -> 200 { verified } — 세션에 인증
 *     플래그가 있는지 조회. 회원가입 폼을 열지 말지 판단하는 용도.
 *   POST /api/v1/auth/kakao/verify/ { code, redirect_uri } -> 200
 *     { verified: true } | 400 { detail } — 성공하면 세션에 플래그가
 *     세팅되고, 회원가입 성공과 동시에 1회성으로 소모된다.
 */
export async function getKakaoVerificationStatus(): Promise<KakaoVerificationStatus> {
  return apiFetch<KakaoVerificationStatus>('/api/v1/auth/kakao/verify/')
}

export async function verifyKakaoAdult(code: string, redirectUri: string): Promise<void> {
  await apiFetch<unknown>('/api/v1/auth/kakao/verify/', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })
}

/**
 * 카카오 소셜 로그인/가입 API 계약 (백엔드: apps/users/views/auth.py
 * KakaoLoginView / KakaoSignupCompletionView) — 성인인증(age_range)과는
 * 완전히 별개, 이메일만 다룬다(닉네임은 카카오와 무관하게 항상 사이트에서
 * 직접 입력받음).
 *   POST /api/v1/auth/kakao/login/ { code, redirect_uri } ->
 *     200 { status: 'logged_in', user } | 200 { status: 'signup_required',
 *     suggested_email } | 400 { detail }
 *   POST /api/v1/auth/kakao/complete-signup/ { username, email,
 *     date_of_birth } -> 201 { user } | 400 { detail | ...필드별 오류 }
 *     signup_required 이후에만 의미 있음(서버 세션에 저장된 카카오
 *     식별자가 관문).
 */
export async function kakaoLogin(code: string, redirectUri: string): Promise<KakaoLoginResult> {
  return apiFetch<KakaoLoginResult>('/api/v1/auth/kakao/login/', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })
}

export async function completeKakaoSignup(
  payload: KakaoSignupCompletionPayload,
): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>('/api/v1/auth/kakao/complete-signup/', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      email: payload.email,
      date_of_birth: payload.dateOfBirth,
    }),
  })
  return user
}
