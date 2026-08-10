export type MatchingRequestPayload = {
  minAge?: number
  maxAge?: number
  preferredLocation?: string
  maxResults?: number
}

export type MatchingRequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'

// 백엔드가 매칭 요청을 생성과 동시에 동기적으로 처리하므로(services.py
// process_matching_request), 이 응답을 받는 시점엔 이미 status가
// COMPLETED이고 results_count도 최종 값이다 — 별도 폴링이 필요 없다.
export type MatchingRequestSummary = {
  id: number
  status: MatchingRequestStatus
  min_age: number | null
  max_age: number | null
  preferred_location: string
  max_results: number
  results_count: number
  created_at: string
  completed_at: string | null
}

export type MatchedPersonality = {
  mbti: string
  introvert_extrovert: number | null
  planning_spontaneous: number | null
  active_relaxed: number | null
  values_description: string
}

export type MatchedUserDetail = {
  id: number
  username: string
  gender: 'M' | 'F' | 'O' | 'N' | null
  age: number | null
  location: string
  bio: string
  profile_image: string | null
  personality: MatchedPersonality | null
  interests_count: number
}

export type MatchedInterest = {
  id: number
  category: number
  category_name: string
  name: string
}

// total_score/interest_score/personality_score/location_score는 DRF
// DecimalField 기본 직렬화 방식(COERCE_DECIMAL_TO_STRING=True, 기본값)
// 때문에 숫자가 아니라 "72.50" 같은 문자열로 온다.
export type MatchingResult = {
  id: number
  request: number
  matched_user_detail: MatchedUserDetail
  total_score: string
  interest_score: string
  personality_score: string
  location_score: string
  common_interests_count: number
  common_interests: MatchedInterest[]
  matching_reason: string
  is_viewed: boolean
  is_contacted: boolean
  created_at: string
}
