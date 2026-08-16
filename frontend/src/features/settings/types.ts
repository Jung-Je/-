export type Gender = 'M' | 'F' | 'O' | 'N'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'M', label: '남성' },
  { value: 'F', label: '여성' },
  { value: 'O', label: '기타' },
  { value: 'N', label: '선택 안함' },
]

// date_of_birth는 없다 — 가입 시 이미 확정된 값이라 설정에서는 표시만
// 하고 수정은 못 한다(ProfileSettingsForm.tsx 참고).
export type ProfileSettingsValues = {
  firstName: string
  lastName: string
  gender: Gender | ''
  location: string
  bio: string
  isActiveForMatching: boolean
}

export type PasswordChangePayload = {
  oldPassword: string
  newPassword: string
  newPasswordConfirm: string
}
