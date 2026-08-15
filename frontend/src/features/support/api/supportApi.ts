import { apiFetch, type PaginatedResponse } from '../../../lib/apiClient'
import type { Inquiry, InquiryCreatePayload } from '../types'

export async function createInquiry(payload: InquiryCreatePayload): Promise<Inquiry> {
  return apiFetch<Inquiry>('/api/v1/support/inquiries/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listMyInquiries(): Promise<PaginatedResponse<Inquiry>> {
  return apiFetch<PaginatedResponse<Inquiry>>('/api/v1/support/inquiries/')
}
