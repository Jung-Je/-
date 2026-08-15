import { apiFetch, type PaginatedResponse } from '../../../lib/apiClient'
import type { MatchingResult } from '../../matching/types'
import type {
  AdminConnection,
  AdminConnectionStatus,
  AdminInquiry,
  AdminInquiryCategory,
  AdminInquiryStatus,
  AdminInterest,
  AdminInterestCategory,
  AdminMatchingRequest,
  AdminMatchingRequestStatus,
  AdminMessage,
  AdminUser,
  AdminUserModerationPayload,
} from '../types'

export type AdminUserListParams = {
  search?: string
  is_active?: boolean
  is_active_for_matching?: boolean
  page?: number
}

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  if (entries.length === 0) return ''
  const query = new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))
  return `?${query.toString()}`
}

export async function listAdminUsers(
  params: AdminUserListParams = {},
): Promise<PaginatedResponse<AdminUser>> {
  return apiFetch<PaginatedResponse<AdminUser>>(
    `/api/v1/staff/users/${toQueryString(params)}`,
  )
}

export async function moderateUser(
  userId: number,
  payload: AdminUserModerationPayload,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/v1/staff/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export type AdminConnectionListParams = {
  search?: string
  status?: AdminConnectionStatus
  page?: number
}

export async function listAdminConnections(
  params: AdminConnectionListParams = {},
): Promise<PaginatedResponse<AdminConnection>> {
  return apiFetch<PaginatedResponse<AdminConnection>>(
    `/api/v1/staff/connections/${toQueryString(params)}`,
  )
}

export async function getAdminConnection(connectionId: number): Promise<AdminConnection> {
  return apiFetch<AdminConnection>(`/api/v1/staff/connections/${connectionId}/`)
}

export async function listAdminConnectionMessages(connectionId: number): Promise<AdminMessage[]> {
  return apiFetch<AdminMessage[]>(`/api/v1/staff/connections/${connectionId}/messages/`)
}

export async function deleteAdminMessage(connectionId: number, messageId: number): Promise<void> {
  await apiFetch<unknown>(
    `/api/v1/staff/connections/${connectionId}/messages/${messageId}/`,
    { method: 'DELETE' },
  )
}

export async function overrideConnectionStatus(
  connectionId: number,
  status: AdminConnectionStatus,
): Promise<AdminConnection> {
  return apiFetch<AdminConnection>(`/api/v1/staff/connections/${connectionId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export type AdminInterestCategoryListParams = {
  search?: string
  page?: number
}

export async function listAdminInterestCategories(
  params: AdminInterestCategoryListParams = {},
): Promise<PaginatedResponse<AdminInterestCategory>> {
  return apiFetch<PaginatedResponse<AdminInterestCategory>>(
    `/api/v1/staff/interest-categories/${toQueryString(params)}`,
  )
}

export async function createAdminInterestCategory(payload: {
  name: string
  description?: string
  icon?: string
}): Promise<AdminInterestCategory> {
  return apiFetch<AdminInterestCategory>('/api/v1/staff/interest-categories/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminInterestCategory(categoryId: number): Promise<void> {
  await apiFetch<unknown>(`/api/v1/staff/interest-categories/${categoryId}/`, {
    method: 'DELETE',
  })
}

export async function listAdminInterests(categoryId?: number): Promise<AdminInterest[]> {
  const response = await apiFetch<PaginatedResponse<AdminInterest>>(
    `/api/v1/staff/interests/${toQueryString({ category: categoryId, page_size: 200 })}`,
  )
  return response.results
}

export async function createAdminInterest(payload: {
  category: number
  name: string
  description?: string
}): Promise<AdminInterest> {
  return apiFetch<AdminInterest>('/api/v1/staff/interests/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminInterest(interestId: number): Promise<void> {
  await apiFetch<unknown>(`/api/v1/staff/interests/${interestId}/`, {
    method: 'DELETE',
  })
}

export type AdminMatchingRequestListParams = {
  search?: string
  status?: AdminMatchingRequestStatus
  page?: number
}

export async function listAdminMatchingRequests(
  params: AdminMatchingRequestListParams = {},
): Promise<PaginatedResponse<AdminMatchingRequest>> {
  return apiFetch<PaginatedResponse<AdminMatchingRequest>>(
    `/api/v1/staff/matching-requests/${toQueryString(params)}`,
  )
}

export async function getAdminMatchingRequest(requestId: number): Promise<AdminMatchingRequest> {
  return apiFetch<AdminMatchingRequest>(`/api/v1/staff/matching-requests/${requestId}/`)
}

export async function cancelAdminMatchingRequest(
  requestId: number,
): Promise<AdminMatchingRequest> {
  return apiFetch<AdminMatchingRequest>(
    `/api/v1/staff/matching-requests/${requestId}/cancel/`,
    { method: 'POST' },
  )
}

export async function listAdminMatchingRequestResults(
  requestId: number,
): Promise<MatchingResult[]> {
  return apiFetch<MatchingResult[]>(
    `/api/v1/staff/matching-requests/${requestId}/results/`,
  )
}

export type AdminInquiryListParams = {
  search?: string
  status?: AdminInquiryStatus
  category?: AdminInquiryCategory
  page?: number
}

export async function listAdminInquiries(
  params: AdminInquiryListParams = {},
): Promise<PaginatedResponse<AdminInquiry>> {
  return apiFetch<PaginatedResponse<AdminInquiry>>(
    `/api/v1/staff/inquiries/${toQueryString(params)}`,
  )
}

export async function updateInquiryStatus(
  inquiryId: number,
  inquiryStatus: AdminInquiryStatus,
): Promise<AdminInquiry> {
  return apiFetch<AdminInquiry>(`/api/v1/staff/inquiries/${inquiryId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status: inquiryStatus }),
  })
}
