export type Gender = 'M' | 'F' | 'O' | 'N'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'M', label: '남성' },
  { value: 'F', label: '여성' },
  { value: 'O', label: '기타' },
  { value: 'N', label: '선택 안함' },
]

export type ProfileFormValues = {
  gender: Gender | ''
  dateOfBirth: string // YYYY-MM-DD (input type="date" 형식)
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

export type ProfileCompletionResult = {
  is_complete: boolean
  missing_fields: {
    basic_info: boolean
    personality: boolean
    interests: boolean
  }
}
