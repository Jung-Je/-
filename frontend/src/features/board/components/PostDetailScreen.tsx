import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { RequireAuth } from '../../auth/components/RequireAuth'
import type { AuthUser } from '../../auth/types'
import {
  createComment,
  deleteComment,
  deletePost,
  getPost,
  listCategories,
  listComments,
  updatePost,
} from '../api/boardApi'
import type { BoardCategory, Comment, Post } from '../types'
import '../../settings/components/SettingsScreen.css'
import './BoardScreen.css'

export function PostDetailScreen() {
  return (
    <RequireAuth>
      {(user) => <Detail currentUser={user} />}
    </RequireAuth>
  )
}

function Detail({ currentUser }: { currentUser: AuthUser }) {
  const { postId } = useParams<{ postId: string }>()
  const id = Number(postId)
  const navigate = useNavigate()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [categories, setCategories] = useState<BoardCategory[]>([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([getPost(id), listComments(id), listCategories()])
      .then(([postData, commentData, categoryData]) => {
        if (cancelled) return
        setPost(postData)
        setComments(commentData)
        setCategories(categoryData)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const detail = error instanceof ApiError ? error.detail : '글을 불러오지 못했습니다.'
        setLoadError(detail)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleDeletePost() {
    // 실패 시(스태프가 이미 강제삭제했거나 세션 만료 등) 예외를 그대로
    // 던져서 PostBody가 잡아 재시도 UI를 보여주게 한다 — 여기서 삼키면
    // navigate가 조용히 실행 안 될 뿐 아무 피드백도 없이 끝난다.
    await deletePost(id)
    navigate('/board', { replace: true })
  }

  async function handleDeleteComment(commentId: number) {
    await deleteComment(commentId)
    setComments((current) => current?.filter((comment) => comment.id !== commentId) ?? current)
    setPost((current) =>
      current ? { ...current, comment_count: current.comment_count - 1 } : current,
    )
  }

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <div className="settings-brand">
          <CardStackMark />
          <h1>매칭</h1>
        </div>
        <AppNav />
      </div>

      <div className="settings-content">
        <Link to="/board" className="board-back-link">
          ← 게시판으로
        </Link>

        {loadError && (
          <p className="settings-error" role="alert">
            <AlertIcon />
            <span>{loadError}</span>
          </p>
        )}

        {!post && !loadError && <p className="board-empty">불러오는 중…</p>}

        {post && (
          <PostBody
            post={post}
            categories={categories}
            isAuthor={post.author === currentUser.id}
            onUpdated={setPost}
            onDelete={handleDeletePost}
          />
        )}

        {post && comments && (
          <CommentsSection
            postId={post.id}
            comments={comments}
            currentUserId={currentUser.id}
            onCreated={(comment) => {
              setComments((current) => (current ? [...current, comment] : [comment]))
              setPost((current) =>
                current ? { ...current, comment_count: current.comment_count + 1 } : current,
              )
            }}
            onDeleted={handleDeleteComment}
          />
        )}
      </div>
    </div>
  )
}

function PostBody({
  post,
  categories,
  isAuthor,
  onUpdated,
  onDelete,
}: {
  post: Post
  categories: BoardCategory[]
  isAuthor: boolean
  onUpdated: (post: Post) => void
  onDelete: () => Promise<void>
}) {
  const titleId = useId()
  const categoryId = useId()
  const contentId = useId()

  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [title, setTitle] = useState(post.title)
  const [category, setCategory] = useState(post.category)
  const [content, setContent] = useState(post.content)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleDeleteClick() {
    setDeleting(true)
    setDeleteError('')
    try {
      await onDelete()
      // 성공하면 onDelete(handleDeletePost)가 /board로 navigate하므로
      // 이 컴포넌트는 곧 언마운트된다 — 별도로 idle 상태로 되돌릴 필요 없음.
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '글을 삭제하지 못했습니다.'
      setDeleteError(detail)
      setDeleting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const updated = await updatePost(post.id, { title, category, content })
      onUpdated(updated)
      setEditing(false)
      setStatus('idle')
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '글을 수정하지 못했습니다.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  if (editing) {
    return (
      <div className="settings-card">
        <form className="settings-form" onSubmit={handleSubmit} noValidate>
          <div className="settings-field">
            <label htmlFor={categoryId}>카테고리</label>
            <select
              id={categoryId}
              value={category}
              onChange={(event) => setCategory(Number(event.target.value))}
              disabled={status === 'submitting'}
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor={titleId}>제목</label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={status === 'submitting'}
              maxLength={200}
              required
            />
          </div>
          <div className="settings-field">
            <label htmlFor={contentId}>내용</label>
            <textarea
              id={contentId}
              rows={5}
              maxLength={5000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={status === 'submitting'}
              required
            />
          </div>

          {status === 'error' && (
            <p className="settings-error" role="alert">
              <AlertIcon />
              <span>{errorMessage}</span>
            </p>
          )}

          <div className="settings-actions">
            <button className="settings-submit" type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' && <SpinnerIcon />}
              {status === 'submitting' ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              className="settings-secondary-btn"
              onClick={() => setEditing(false)}
              disabled={status === 'submitting'}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="settings-card">
      <div className="board-post-detail__header">
        <span className="board-badge">{post.category_name}</span>
        <span className="board-post-detail__meta">
          {post.author_username} · {new Date(post.created_at).toLocaleDateString('ko-KR')}
        </span>
      </div>
      <h2 className="board-post-detail__title">{post.title}</h2>
      <p className="board-post-detail__content">{post.content}</p>

      {isAuthor && (
        <div className="settings-actions">
          <button type="button" className="settings-secondary-btn" onClick={() => setEditing(true)}>
            수정
          </button>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                className="settings-danger-btn"
                onClick={handleDeleteClick}
                disabled={deleting}
              >
                {deleting && <SpinnerIcon />}
                {deleting ? '삭제 중…' : '정말요? 삭제'}
              </button>
              <button
                type="button"
                className="settings-secondary-btn"
                onClick={() => {
                  setConfirmingDelete(false)
                  setDeleteError('')
                }}
                disabled={deleting}
              >
                취소
              </button>
            </>
          ) : (
            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => setConfirmingDelete(true)}
            >
              삭제
            </button>
          )}
        </div>
      )}

      {deleteError && (
        <p className="settings-error" role="alert">
          <AlertIcon />
          <span>{deleteError}</span>
        </p>
      )}
    </div>
  )
}

function CommentsSection({
  postId,
  comments,
  currentUserId,
  onCreated,
  onDeleted,
}: {
  postId: number
  comments: Comment[]
  currentUserId: number
  onCreated: (comment: Comment) => void
  onDeleted: (commentId: number) => Promise<void>
}) {
  const contentId = useId()
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteClick(commentId: number) {
    setDeletingId(commentId)
    setDeleteError('')
    try {
      await onDeleted(commentId)
      setConfirmingId(null)
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '댓글을 삭제하지 못했습니다.'
      setDeleteError(detail)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const comment = await createComment({ post: postId, content: draft })
      onCreated(comment)
      setDraft('')
      setStatus('idle')
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '댓글을 작성하지 못했습니다.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  return (
    <div className="settings-card">
      <div className="settings-card__heading">
        <h2>댓글 {comments.length}개</h2>
      </div>

      {comments.length === 0 ? (
        <p className="board-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="board-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="board-comment-list__item">
              <div className="board-comment-list__meta">
                <span className="board-comment-list__author">{comment.author_username}</span>
                <span className="board-post-list__date">
                  {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                </span>
                {comment.author === currentUserId &&
                  (confirmingId === comment.id ? (
                    <>
                      <button
                        type="button"
                        className="board-comment-list__delete"
                        onClick={() => handleDeleteClick(comment.id)}
                        disabled={deletingId === comment.id}
                      >
                        {deletingId === comment.id ? '삭제 중…' : '정말요? 삭제'}
                      </button>
                      <button
                        type="button"
                        className="board-comment-list__cancel"
                        onClick={() => {
                          setConfirmingId(null)
                          setDeleteError('')
                        }}
                        disabled={deletingId === comment.id}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="board-comment-list__delete"
                      onClick={() => setConfirmingId(comment.id)}
                    >
                      삭제
                    </button>
                  ))}
              </div>
              <p className="board-comment-list__content">{comment.content}</p>
              {deleteError && confirmingId === comment.id && (
                <p className="settings-error" role="alert">
                  <AlertIcon />
                  <span>{deleteError}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <div className="settings-field">
          <label htmlFor={contentId}>댓글 작성</label>
          <textarea
            id={contentId}
            rows={2}
            maxLength={1000}
            placeholder="댓글을 남겨보세요"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={status === 'submitting'}
          />
        </div>

        {status === 'error' && (
          <p className="settings-error" role="alert">
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <div className="settings-actions">
          <button
            className="settings-submit"
            type="submit"
            disabled={status === 'submitting' || !draft.trim()}
          >
            {status === 'submitting' && <SpinnerIcon />}
            {status === 'submitting' ? '작성 중…' : '댓글 작성'}
          </button>
        </div>
      </form>
    </div>
  )
}
