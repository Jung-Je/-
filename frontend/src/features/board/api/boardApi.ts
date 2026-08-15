import { apiFetch, type PaginatedResponse } from '../../../lib/apiClient'
import type {
  BoardCategory,
  Comment,
  CommentCreatePayload,
  Post,
  PostCreatePayload,
  PostUpdatePayload,
} from '../types'

export async function listCategories(): Promise<BoardCategory[]> {
  const response = await apiFetch<PaginatedResponse<BoardCategory>>(
    '/api/v1/board/categories/?page_size=100',
  )
  return response.results
}

export type PostListParams = {
  category?: number
  search?: string
  page?: number
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  if (entries.length === 0) return ''
  const query = new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))
  return `?${query.toString()}`
}

export async function listPosts(params: PostListParams = {}): Promise<PaginatedResponse<Post>> {
  return apiFetch<PaginatedResponse<Post>>(`/api/v1/board/posts/${toQueryString(params)}`)
}

export async function getPost(postId: number): Promise<Post> {
  return apiFetch<Post>(`/api/v1/board/posts/${postId}/`)
}

export async function createPost(payload: PostCreatePayload): Promise<Post> {
  return apiFetch<Post>('/api/v1/board/posts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePost(postId: number, payload: PostUpdatePayload): Promise<Post> {
  return apiFetch<Post>(`/api/v1/board/posts/${postId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deletePost(postId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/board/posts/${postId}/`, { method: 'DELETE' })
}

export async function listComments(postId: number): Promise<Comment[]> {
  const response = await apiFetch<PaginatedResponse<Comment>>(
    `/api/v1/board/comments/?post=${postId}&page_size=200`,
  )
  return response.results
}

export async function createComment(payload: CommentCreatePayload): Promise<Comment> {
  return apiFetch<Comment>('/api/v1/board/comments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteComment(commentId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/board/comments/${commentId}/`, { method: 'DELETE' })
}
