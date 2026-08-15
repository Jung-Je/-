import { useEffect, useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { createPost } from '../api/boardApi'
import type { BoardCategory, Post } from '../types'

type Props = {
  categories: BoardCategory[]
  onCreated: (post: Post) => void
}

export function PostForm({ categories, onCreated }: Props) {
  const categoryId = useId()
  const titleId = useId()
  const contentId = useId()
  const errorId = useId()

  const [category, setCategory] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // categories는 부모의 비동기 조회가 끝난 뒤에야 채워지므로, 마운트
  // 시점의 초기값(useState 인자)만으로는 못 잡는다 — 처음 도착했을 때
  // 한 번 기본값(첫 카테고리)을 채워준다. 이후 사용자가 직접 고른
  // 값은 category가 이미 채워져 있어 이 effect가 덮어쓰지 않는다.
  useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0].id)
    }
  }, [categories, category])

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!category) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const post = await createPost({ category, title, content })
      onCreated(post)
      setTitle('')
      setContent('')
      setStatus('idle')
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '글을 작성하지 못했습니다.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  return (
    <div className="settings-card">
      <div className="settings-card__heading">
        <h2>새 글 작성</h2>
        <p>다른 유저들과 자유롭게 이야기를 나눠보세요.</p>
      </div>

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <div className="settings-field">
          <label htmlFor={categoryId}>카테고리</label>
          <select
            id={categoryId}
            value={category}
            onChange={(event) => setCategory(Number(event.target.value))}
            disabled={isSubmitting || categories.length === 0}
            required
          >
            {categories.length === 0 && <option value="">카테고리가 아직 없어요</option>}
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
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
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
            placeholder="자유롭게 적어주세요"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        {status === 'error' && (
          <p className="settings-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <div className="settings-actions">
          <button
            className="settings-submit"
            type="submit"
            disabled={isSubmitting || !category}
          >
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '작성 중…' : '작성하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
