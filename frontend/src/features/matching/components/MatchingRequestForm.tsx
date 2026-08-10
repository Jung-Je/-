import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { createMatchingRequest } from '../api/matchingApi'
import type { MatchingRequestSummary } from '../types'

type Props = {
  onCreated: (request: MatchingRequestSummary) => void
}

/**
 * 조건은 전부 선택 사항이다 — 아무것도 안 채우고 눌러도 전체 후보를
 * 대상으로 매칭을 돌린다 (백엔드 max_results 기본값 10).
 */
export function MatchingRequestForm({ onCreated }: Props) {
  const minAgeId = useId()
  const maxAgeId = useId()
  const locationId = useId()
  const maxResultsId = useId()
  const errorId = useId()

  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [preferredLocation, setPreferredLocation] = useState('')
  const [maxResults, setMaxResults] = useState('10')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const request = await createMatchingRequest({
        minAge: minAge ? Number(minAge) : undefined,
        maxAge: maxAge ? Number(maxAge) : undefined,
        preferredLocation: preferredLocation || undefined,
        maxResults: maxResults ? Number(maxResults) : undefined,
      })
      setStatus('idle')
      onCreated(request)
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
    <div className="matching-request-card">
      <div className="matching-request-card__heading">
        <h2>새 매칭 요청</h2>
        <p>조건은 전부 선택 사항이에요. 비워두면 전체를 대상으로 찾아요.</p>
      </div>

      <form className="matching-request-form" onSubmit={handleSubmit} noValidate>
        <div className="matching-request-form__grid">
          <div className="matching-field">
            <label htmlFor={minAgeId}>최소 나이</label>
            <input
              id={minAgeId}
              type="number"
              min={18}
              max={100}
              placeholder="18"
              value={minAge}
              onChange={(event) => setMinAge(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="matching-field">
            <label htmlFor={maxAgeId}>최대 나이</label>
            <input
              id={maxAgeId}
              type="number"
              min={18}
              max={100}
              placeholder="100"
              value={maxAge}
              onChange={(event) => setMaxAge(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="matching-field">
            <label htmlFor={locationId}>선호 지역</label>
            <input
              id={locationId}
              type="text"
              placeholder="예: 서울"
              value={preferredLocation}
              onChange={(event) => setPreferredLocation(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="matching-field">
            <label htmlFor={maxResultsId}>최대 결과 수</label>
            <input
              id={maxResultsId}
              type="number"
              min={1}
              max={50}
              value={maxResults}
              onChange={(event) => setMaxResults(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {status === 'error' && (
          <p className="matching-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <button className="matching-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon />}
          {isSubmitting ? '찾는 중…' : '매칭 시작'}
        </button>
      </form>
    </div>
  )
}
