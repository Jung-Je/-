export type AuthUser = {
  id: number
  username: string
  email: string
  is_profile_complete: boolean
}

export type SignupPayload = {
  username: string
  email: string
  password: string
  passwordConfirm: string
}
