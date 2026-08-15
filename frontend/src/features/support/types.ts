export type InquiryCategory = 'REPORT' | 'QUESTION' | 'SUGGESTION'
export type InquiryStatus = 'PENDING' | 'RESOLVED'

// InquirySerializer(백엔드)와 1:1 대응.
export type Inquiry = {
  id: number
  category: InquiryCategory
  category_display: string
  title: string
  content: string
  status: InquiryStatus
  status_display: string
  created_at: string
  resolved_at: string | null
}

export type InquiryCreatePayload = {
  category: InquiryCategory
  title: string
  content: string
}
