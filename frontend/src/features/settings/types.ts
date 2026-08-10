export type Gender = 'M' | 'F' | 'O' | 'N'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'M', label: '남성' },
  { value: 'F', label: '여성' },
  { value: 'O', label: '기타' },
  { value: 'N', label: '선택 안함' },
]

export type ProfileSettingsValues = {
  firstName: string
  lastName: string
  gender: Gender | ''
  dateOfBirth: string
  location: string
  bio: string
  isActiveForMatching: boolean
}

export type PasswordChangePayload = {
  oldPassword: string
  newPassword: string
  newPasswordConfirm: string
}
