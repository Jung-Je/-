// 백엔드 /users/me/가 실제로 돌려주는 UserSerializer 전체 모양 중,
// 화면에서 지금까지 쓰인 필드 + 설정 화면 프로필 편집에 필요한 필드.
export type AuthUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  gender: 'M' | 'F' | 'O' | 'N' | null
  date_of_birth: string | null
  location: string
  bio: string
  is_profile_complete: boolean
  // is_profile_complete와 달리 한 번 true가 되면 계속 true(한 방향
  // 래치) — OnboardingWizard가 이 값으로 마법사 재노출 여부를 판단한다.
  has_completed_onboarding: boolean
  is_active_for_matching: boolean
  is_staff: boolean
}

export type SignupPayload = {
  username: string
  email: string
  dateOfBirth: string
  password: string
  passwordConfirm: string
}

export type KakaoVerificationStatus = {
  verified: boolean
}

// 카카오 소셜 로그인/가입 1단계(KakaoLoginView) 응답 — 이미 연결된
// 계정이면 logged_in(바로 로그인 완료), 처음이면 signup_required(부족한
// 정보를 더 받아야 함, KakaoSignupCompletionScreen에서 처리).
export type KakaoLoginResult =
  | { status: 'logged_in'; user: AuthUser }
  | { status: 'signup_required'; suggested_email: string | null }

export type KakaoSignupCompletionPayload = {
  username: string
  email: string
  dateOfBirth: string
}
