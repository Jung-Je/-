import type { MatchedPersonality, MatchedUserDetail } from '../matching/types'

// AdminUserSerializer(백엔드)와 1:1 대응.
export type AdminUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  gender: 'M' | 'F' | 'O' | 'N' | null
  date_of_birth: string | null
  age: number | null
  location: string
  bio: string
  profile_image: string | null
  is_profile_complete: boolean
  is_active: boolean
  is_active_for_matching: boolean
  is_staff: boolean
  is_superuser: boolean
  personality: MatchedPersonality | null
  date_joined: string
  last_login: string | null
  created_at: string
  updated_at: string
}

export type AdminUserModerationPayload = {
  is_active?: boolean
  is_active_for_matching?: boolean
}

export type AdminConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED'

// AdminConnectionSerializer(백엔드)와 1:1 대응. from/to 상세는
// UserDetailSerializer를 그대로 쓰므로(matching의 ConnectionSerializer와
// 동일), MatchedUserDetail을 재사용한다.
export type AdminConnection = {
  id: number
  from_user: number
  from_user_detail: MatchedUserDetail
  to_user: number
  to_user_detail: MatchedUserDetail
  status: AdminConnectionStatus
  matching_result: number | null
  message: string
  message_count: number
  created_at: string
  updated_at: string
  responded_at: string | null
}

// AdminMessageSerializer(백엔드)와 1:1 대응.
export type AdminMessage = {
  id: number
  connection: number
  sender: number
  sender_username: string
  body: string
  created_at: string
  read_at: string | null
}

// InterestCategorySerializer(백엔드, 소비자용을 관리자 뷰셋도 그대로
// 재사용)와 1:1 대응.
export type AdminInterestCategory = {
  id: number
  name: string
  description: string
  icon: string
  interests_count: number
  created_at: string
  updated_at: string
}

// InterestSerializer(백엔드, 소비자용을 관리자 뷰셋도 그대로 재사용)와
// 1:1 대응.
export type AdminInterest = {
  id: number
  category: number
  category_name: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

// MatchingRequestSerializer(백엔드, 소비자용을 관리자 뷰셋도 그대로
// 재사용)와 1:1 대응. requester_detail은 UserDetailSerializer라
// MatchedUserDetail과 모양이 같다.
export type AdminMatchingRequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'

export type AdminMatchingRequest = {
  id: number
  requester: number
  requester_detail: MatchedUserDetail
  status: AdminMatchingRequestStatus
  min_age: number | null
  max_age: number | null
  preferred_location: string
  max_results: number
  results_count: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

// AdminInquirySerializer(백엔드)와 1:1 대응.
export type AdminInquiryCategory = 'REPORT' | 'QUESTION' | 'SUGGESTION'
export type AdminInquiryStatus = 'PENDING' | 'RESOLVED'

export type AdminInquiry = {
  id: number
  user: number
  username: string
  email: string
  category: AdminInquiryCategory
  category_display: string
  title: string
  content: string
  status: AdminInquiryStatus
  status_display: string
  created_at: string
  resolved_at: string | null
}
