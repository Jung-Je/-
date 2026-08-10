export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED'

export type ConnectionUserDetail = {
  id: number
  username: string
  gender: 'M' | 'F' | 'O' | 'N' | null
  age: number | null
  location: string
  bio: string
  profile_image: string | null
  interests_count: number
}

export type Connection = {
  id: number
  from_user: number
  from_user_detail: ConnectionUserDetail
  to_user: number
  to_user_detail: ConnectionUserDetail
  status: ConnectionStatus
  matching_result: number | null
  message: string
  created_at: string
  responded_at: string | null
}

export type ConnectionAction = 'accept' | 'reject' | 'block'
