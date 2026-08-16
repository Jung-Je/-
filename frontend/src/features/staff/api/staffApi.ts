import { apiFetch, type PaginatedResponse } from '../../../lib/apiClient'
import type { MatchingResult } from '../../matching/types'
import type {
  AdminBoardCategory,
  AdminComment,
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
  AdminPost,
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

// 빈 문자열을 보내면 답변을 지운다 — 서버가 그 경우 resolved_at을 비우기만
// 하고 status는 그대로 둔다(AdminInquiryReplySerializer 참고).
export async function replyToInquiry(inquiryId: number, adminReply: string): Promise<AdminInquiry> {
  return apiFetch<AdminInquiry>(`/api/v1/staff/inquiries/${inquiryId}/reply/`, {
    method: 'POST',
    body: JSON.stringify({ admin_reply: adminReply }),
  })
}

export async function listAdminBoardCategories(): Promise<AdminBoardCategory[]> {
  const response = await apiFetch<PaginatedResponse<AdminBoardCategory>>(
    '/api/v1/staff/board-categories/?page_size=100',
  )
  return response.results
}

export async function createAdminBoardCategory(payload: {
  name: string
  description?: string
}): Promise<AdminBoardCategory> {
  return apiFetch<AdminBoardCategory>('/api/v1/staff/board-categories/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminBoardCategory(categoryId: number): Promise<void> {
  await apiFetch<unknown>(`/api/v1/staff/board-categories/${categoryId}/`, {
    method: 'DELETE',
  })
}

export type AdminPostListParams = {
  search?: string
  category?: number
  page?: number
}

export async function listAdminPosts(
  params: AdminPostListParams = {},
): Promise<PaginatedResponse<AdminPost>> {
  return apiFetch<PaginatedResponse<AdminPost>>(`/api/v1/staff/board-posts/${toQueryString(params)}`)
}

export async function deleteAdminPost(postId: number): Promise<void> {
  await apiFetch<unknown>(`/api/v1/staff/board-posts/${postId}/`, { method: 'DELETE' })
}

export async function listAdminComments(postId: number): Promise<AdminComment[]> {
  const response = await apiFetch<PaginatedResponse<AdminComment>>(
    `/api/v1/staff/board-comments/${toQueryString({ post: postId, page_size: 200 })}`,
  )
  return response.results
}

export async function deleteAdminComment(commentId: number): Promise<void> {
  await apiFetch<unknown>(`/api/v1/staff/board-comments/${commentId}/`, { method: 'DELETE' })
}
