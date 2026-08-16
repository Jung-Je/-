import { apiFetch } from '../../../lib/apiClient'
import type { PasswordChangePayload, ProfileSettingsValues } from '../types'

// date_of_birth는 안 보낸다 — 가입 시 검증받은 값이라 여기서 다시 바꿀 수
// 있게 하면 안 됨(백엔드도 UserUpdateSerializer에서 read_only로 잠가서
// 보내도 무시되지만, 애초에 프론트에서 편집 UI 자체를 없앴다).
export async function updateProfile(userId: number, values: ProfileSettingsValues): Promise<void> {
  await apiFetch<unknown>(`/api/v1/users/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      first_name: values.firstName,
      last_name: values.lastName,
      gender: values.gender || null,
      location: values.location,
      bio: values.bio,
      is_active_for_matching: values.isActiveForMatching,
    }),
  })
}

/**
 * 백엔드: UserViewSet.change_password. 성공하면 서버가
 * update_session_auth_hash로 세션을 이어가므로, 비밀번호를 바꿔도
 * 다시 로그인할 필요가 없다.
 */
export async function changePassword(payload: PasswordChangePayload): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/users/change_password/', {
    method: 'POST',
    body: JSON.stringify({
      old_password: payload.oldPassword,
      new_password: payload.newPassword,
      new_password_confirm: payload.newPasswordConfirm,
    }),
  })
}

export async function deleteAccount(userId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/users/users/${userId}/`, { method: 'DELETE' })
}
