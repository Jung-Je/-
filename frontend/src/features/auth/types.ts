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
  is_active_for_matching: boolean
  is_staff: boolean
}

export type SignupPayload = {
  username: string
  email: string
  password: string
  passwordConfirm: string
}

export type KakaoVerificationStatus = {
  verified: boolean
}
