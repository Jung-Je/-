import { apiFetch, type PaginatedResponse } from '../../../lib/apiClient'
import type {
  Interest,
  InterestCategory,
  PersonalityFormValues,
  ProfileCompletionResult,
  ProfileFormValues,
  UserInterest,
} from '../types'

// PaginatedResponse는 lib/apiClient.ts에 공용으로 있다 — 결과가
// PAGE_SIZE(20)보다 적어도 항상 감싸져 있다.

/**
 * 프로필 업데이트 (백엔드: UserViewSet.partial_update, UserUpdateSerializer).
 * check_profile_completion이 요구하는 필드 중 date_of_birth는 가입 시(회원가입/
 * 카카오 가입 완료 폼) 이미 검증받아 저장돼 있어서 여기서 다루지 않는다 — 온보딩이
 * 다시 물어봐서 가입 때와 다른 값으로 덮어쓸 수 있던 걸 막기 위함(백엔드도
 * date_of_birth를 read_only로 잠가서 보내도 무시됨). 이름/프로필 사진 등은
 * 나중에 설정 화면에서 다룬다.
 */
export async function updateProfile(userId: number, values: ProfileFormValues): Promise<void> {
  await apiFetch<unknown>(`/api/v1/users/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      gender: values.gender || null,
      location: values.location,
      bio: values.bio,
    }),
  })
}

/**
 * 성격 정보 생성 (백엔드: UserPersonalityViewSet.create). user는 요청자로
 * 자동 설정된다. 모델상 모든 필드가 선택값이라, 비워서 제출해도 성공한다
 * (건너뛰고 싶은 사용자를 막지 않기 위함).
 */
export async function createPersonality(values: PersonalityFormValues): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/personalities/', {
    method: 'POST',
    body: JSON.stringify({
      mbti: values.mbti,
      introvert_extrovert: values.introvertExtrovert,
      planning_spontaneous: values.planningSpontaneous,
      active_relaxed: values.activeRelaxed,
      values_description: values.valuesDescription,
    }),
  })
}

export async function listInterestCategories(): Promise<InterestCategory[]> {
  const data = await apiFetch<PaginatedResponse<InterestCategory>>('/api/v1/matching/categories/')
  return data.results
}

// 카테고리 수가 적어(현재 6개) 카테고리별로 따로 불러도 무리가 없고,
// 화면도 어차피 카테고리별로 묶어서 보여준다 — page_size를 서버에서
// 클라이언트가 바꿀 수 없으므로(관심사 총 30개 > PAGE_SIZE 20) 이 방식이
// 페이지네이션을 신경 쓸 필요 없는 가장 단순한 방법이다.
export async function listInterestsByCategory(categoryId: number): Promise<Interest[]> {
  const data = await apiFetch<PaginatedResponse<Interest>>(
    `/api/v1/matching/interests/?category=${categoryId}`,
  )
  return data.results
}

export async function addUserInterest(interestId: number, level = 3): Promise<void> {
  await apiFetch<unknown>('/api/v1/matching/user-interests/', {
    method: 'POST',
    body: JSON.stringify({ interest: interestId, level }),
  })
}

/**
 * 내 관심사 목록 (백엔드: UserInterestViewSet.list — get_queryset이 이미
 * 본인 것만 필터링). 설정 화면의 관심사 편집 섹션에서 현재 상태를
 * 보여주는 데 쓴다.
 */
export async function listMyInterests(): Promise<UserInterest[]> {
  const data = await apiFetch<PaginatedResponse<UserInterest>>(
    '/api/v1/matching/user-interests/?page_size=100',
  )
  return data.results
}

export async function updateInterestLevel(
  userInterestId: number,
  level: number,
): Promise<UserInterest> {
  return apiFetch<UserInterest>(`/api/v1/matching/user-interests/${userInterestId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ level }),
  })
}

export async function removeInterest(userInterestId: number): Promise<void> {
  await apiFetch<unknown>(`/api/v1/matching/user-interests/${userInterestId}/`, {
    method: 'DELETE',
  })
}

/**
 * 프로필 완성도 확인 (백엔드: UserViewSet.check_profile_completion).
 * 서버가 is_profile_complete를 이 호출 결과로 갱신하므로, 온보딩 마지막
 * 단계에서 반드시 호출해줘야 이후 "카드가 이미 완성됐다" 판단이 맞는다.
 */
export async function checkProfileCompletion(): Promise<ProfileCompletionResult> {
  return apiFetch<ProfileCompletionResult>('/api/v1/users/users/check_profile_completion/', {
    method: 'POST',
  })
}
