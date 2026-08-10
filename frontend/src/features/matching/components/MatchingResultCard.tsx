import { useState } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { createConnection } from '../../connections/api/connectionsApi'
import { viewMatchingResult } from '../api/matchingApi'
import type { MatchingResult } from '../types'

const GENDER_LABELS: Record<string, string> = {
  M: '남성',
  F: '여성',
  O: '기타',
  N: '',
}

function scoreTier(totalScore: number): 'high' | 'mid' | 'low' {
  if (totalScore >= 70) return 'high'
  if (totalScore >= 40) return 'mid'
  return 'low'
}

type Props = {
  result: MatchingResult
  onViewed: (resultId: number) => void
}

export function MatchingResultCard({ result, onViewed }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<MatchingResult>(result)
  const [connectStatus, setConnectStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [connectError, setConnectError] = useState('')

  const totalScore = Math.round(Number(detail.total_score))
  const { matched_user_detail: user } = detail

  async function handleToggle() {
    const willExpand = !expanded
    setExpanded(willExpand)

    if (willExpand && !detail.is_viewed) {
      try {
        const viewed = await viewMatchingResult(detail.id)
        setDetail(viewed)
        onViewed(detail.id)
      } catch {
        // 조회 실패해도 펼침 자체는 막지 않는다 — "확인함" 표시만 못 뜨는 정도.
      }
    }
  }

  async function handleConnect() {
    setConnectStatus('submitting')
    setConnectError('')

    try {
      await createConnection({ toUserId: user.id, matchingResultId: detail.id })
      setDetail((current) => ({ ...current, is_contacted: true }))
      setConnectStatus('idle')
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.detail
          : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      setConnectError(message)
      setConnectStatus('error')
    }
  }

  return (
    <div className="matching-result-card">
      <div className="matching-result-card__row">
        <div className="matching-result-card__avatar" aria-hidden="true">
          {user.username.slice(0, 1).toUpperCase()}
        </div>

        <div className="matching-result-card__identity">
          <div className="matching-result-card__name">
            {!detail.is_viewed && (
              <span className="matching-result-card__unviewed-dot" aria-label="새 결과" />
            )}
            <span>{user.username}</span>
          </div>
          <div className="matching-result-card__meta">
            {[user.age ? `${user.age}세` : null, GENDER_LABELS[user.gender ?? ''], user.location]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>

        <div className={`matching-score-badge matching-score-badge--${scoreTier(totalScore)}`}>
          <span className="matching-score-badge__value">{totalScore}</span>
          <span className="matching-score-badge__unit">점</span>
        </div>
      </div>

      {user.bio && <p className="matching-result-card__bio">{user.bio}</p>}

      {detail.common_interests.length > 0 && (
        <div className="matching-chip-row">
          {detail.common_interests.map((interest) => (
            <span className="matching-chip" key={interest.id}>
              {interest.name}
            </span>
          ))}
        </div>
      )}

      {connectStatus === 'error' && (
        <p className="matching-error" role="alert">
          <AlertIcon />
          <span>{connectError}</span>
        </p>
      )}

      <div className="matching-result-card__actions">
        {detail.is_contacted ? (
          <span className="matching-result-card__contacted">연결 요청됨</span>
        ) : (
          <button
            type="button"
            className="matching-connect"
            onClick={handleConnect}
            disabled={connectStatus === 'submitting'}
          >
            {connectStatus === 'submitting' && <SpinnerIcon />}
            {connectStatus === 'submitting' ? '요청 중…' : '연결하기'}
          </button>
        )}

        <button type="button" className="matching-result-card__toggle" onClick={handleToggle}>
          {expanded ? '접기' : '자세히 보기'}
        </button>
      </div>

      {expanded && (
        <div className="matching-result-card__details">
          <dl>
            <dt>관심사 일치</dt>
            <dd>{Math.round(Number(detail.interest_score))}점</dd>
            <dt>성격 궁합</dt>
            <dd>{Math.round(Number(detail.personality_score))}점</dd>
            <dt>지역 일치</dt>
            <dd>{Math.round(Number(detail.location_score))}점</dd>
            {user.personality?.mbti && (
              <>
                <dt>MBTI</dt>
                <dd>{user.personality.mbti}</dd>
              </>
            )}
            <dt>공통 관심사</dt>
            <dd>{detail.common_interests_count}개</dd>
          </dl>
        </div>
      )}
    </div>
  )
}
