export type Gender = 'M' | 'F' | 'O' | 'N'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'M', label: '남성' },
  { value: 'F', label: '여성' },
  { value: 'O', label: '기타' },
  { value: 'N', label: '선택 안함' },
]

// date_of_birth는 없다 — 가입 시 이미 확정된 값이라 온보딩에서는
// 다루지 않는다(ProfileStep.tsx 참고).
export type ProfileFormValues = {
  gender: Gender | ''
  location: string
  bio: string
}

// 백엔드 UserPersonality 모델과 동일한 구성 (apps/users/models.py)
export const MBTI_TYPES = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
] as const

export type PersonalityFormValues = {
  mbti: string
  introvertExtrovert: number
  planningSpontaneous: number
  activeRelaxed: number
  valuesDescription: string
}

export type InterestCategory = {
  id: number
  name: string
  icon: string
}

export type Interest = {
  id: number
  category: number
  category_name: string
  name: string
}

// UserInterestSerializer(백엔드)와 1:1 대응 — 설정 화면의 관심사
// 편집 섹션에서도 온보딩과 같은 타입을 재사용한다.
export type UserInterest = {
  id: number
  interest: number
  interest_detail: Interest
  level: number
}

export type ProfileCompletionResult = {
  is_complete: boolean
  missing_fields: {
    basic_info: boolean
    personality: boolean
    interests: boolean
  }
}
