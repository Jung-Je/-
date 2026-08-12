import { apiFetch, type PaginatedResponse } from '../../../lib/apiClient'
import type {
  AdminConnection,
  AdminConnectionStatus,
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
    `/api/v1/users/admin/users/${toQueryString(params)}`,
  )
}

export async function moderateUser(
  userId: number,
  payload: AdminUserModerationPayload,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/v1/users/admin/users/${userId}/`, {
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
    `/api/v1/matching/admin/connections/${toQueryString(params)}`,
  )
}

export async function getAdminConnection(connectionId: number): Promise<AdminConnection> {
  return apiFetch<AdminConnection>(`/api/v1/matching/admin/connections/${connectionId}/`)
}

export async function listAdminConnectionMessages(connectionId: number): Promise<AdminMessage[]> {
  return apiFetch<AdminMessage[]>(`/api/v1/matching/admin/connections/${connectionId}/messages/`)
}

export async function deleteAdminMessage(connectionId: number, messageId: number): Promise<void> {
  await apiFetch<unknown>(
    `/api/v1/matching/admin/connections/${connectionId}/messages/${messageId}/`,
    { method: 'DELETE' },
  )
}

export async function overrideConnectionStatus(
  connectionId: number,
  status: AdminConnectionStatus,
): Promise<AdminConnection> {
  return apiFetch<AdminConnection>(`/api/v1/matching/admin/connections/${connectionId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
