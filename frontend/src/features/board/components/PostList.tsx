import { Link } from 'react-router-dom'
import type { Post } from '../types'

type Props = {
  posts: Post[]
}

export function PostList({ posts }: Props) {
  if (posts.length === 0) {
    return <p className="board-empty">조건에 맞는 글이 없어요.</p>
  }

  return (
    <ul className="board-post-list">
      {posts.map((post) => (
        <li key={post.id} className="board-post-list__item">
          <Link to={`/board/${post.id}`} className="board-post-list__row">
            <div className="board-post-list__main">
              <span className="board-badge">{post.category_name}</span>
              <span className="board-post-list__title">{post.title}</span>
            </div>
            <div className="board-post-list__meta">
              <span className="board-post-list__author">{post.author_username}</span>
              <span className="board-post-list__comment-count">댓글 {post.comment_count}</span>
              <span className="board-post-list__date">
                {new Date(post.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
