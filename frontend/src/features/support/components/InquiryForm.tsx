import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { createInquiry } from '../api/supportApi'
import type { Inquiry, InquiryCategory } from '../types'

const CATEGORY_OPTIONS: { value: InquiryCategory; label: string }[] = [
  { value: 'REPORT', label: '신고' },
  { value: 'QUESTION', label: '문의' },
  { value: 'SUGGESTION', label: '건의' },
]

type Props = {
  onCreated: (inquiry: Inquiry) => void
}

export function InquiryForm({ onCreated }: Props) {
  const categoryId = useId()
  const titleId = useId()
  const contentId = useId()
  const errorId = useId()

  const [category, setCategory] = useState<InquiryCategory>('QUESTION')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const inquiry = await createInquiry({ category, title, content })
      onCreated(inquiry)
      setTitle('')
      setContent('')
      setStatus('success')
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  return (
    <div className="settings-card">
      <div className="settings-card__heading">
        <h2>문의하기</h2>
        <p>신고·문의·건의 무엇이든 남겨주시면 운영진이 확인할게요.</p>
      </div>

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <div className="settings-field">
          <label htmlFor={categoryId}>유형</label>
          <select
            id={categoryId}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as InquiryCategory)
              setStatus('idle')
            }}
            disabled={isSubmitting}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-field">
          <label htmlFor={titleId}>제목</label>
          <input
            id={titleId}
            type="text"
            placeholder="어떤 내용인지 한 줄로 알려주세요"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setStatus('idle')
            }}
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
            maxLength={2000}
            placeholder="자세한 내용을 남겨주세요"
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              setStatus('idle')
            }}
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
          <button className="settings-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '보내는 중…' : '보내기'}
          </button>
          {status === 'success' && <span className="settings-success">잘 전달됐어요</span>}
        </div>
      </form>
    </div>
  )
}
