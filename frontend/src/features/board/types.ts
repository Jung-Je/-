// BoardCategorySerializer(백엔드)와 1:1 대응.
export type BoardCategory = {
  id: number
  name: string
  description: string
  posts_count: number
  created_at: string
  updated_at: string
}

// PostSerializer(백엔드)와 1:1 대응.
export type Post = {
  id: number
  category: number
  category_name: string
  author: number
  author_username: string
  title: string
  content: string
  comment_count: number
  created_at: string
  updated_at: string
}

export type PostCreatePayload = {
  category: number
  title: string
  content: string
}

export type PostUpdatePayload = {
  category?: number
  title?: string
  content?: string
}

// CommentSerializer(백엔드)와 1:1 대응.
export type Comment = {
  id: number
  post: number
  author: number
  author_username: string
  content: string
  created_at: string
  updated_at: string
}

export type CommentCreatePayload = {
  post: number
  content: string
}
