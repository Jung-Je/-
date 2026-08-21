import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { createConnection } from '../../connections/api/connectionsApi'
import type { Connection } from '../../connections/types'
import { viewMatchingResult } from '../api/matchingApi'
import type { MatchingResult } from '../types'

const GENDER_LABELS: Record<string, string> = {
  M: '남성',
  F: '여성',
  O: '기타',
  N: '',
}

// 서버(User.age)도 이제 미래 생년월일을 막지만(validate_date_of_birth),
// 그 전에 이미 들어간 데이터나 다른 경로로 들어온 값까지 안전하게
// 가리기 위한 표시 단 가드 — "-1세"처럼 말이 안 되는 나이를 그대로
// 보여주지 않는다.
function formatAge(age: number | null): string | null {
  if (age === null || age <= 0) return null
  return `${age}세`
}

function scoreTier(totalScore: number): 'high' | 'mid' | 'low' {
  if (totalScore >= 70) return 'high'
  if (totalScore >= 40) return 'mid'
  return 'low'
}

// 배지 색만으로 등급을 구분하기 어려운 사람(저시력·색약, 화면을 얼른 훑는
// 사람 모두)을 위해 스크린리더/타이틀에 등급명을 텍스트로도 남겨둔다 —
// No-Gray-Punish Rule과 같은 이유로, 낮은 등급도 "매칭"이라는 결과 자체는
// 부정하지 않는 톤으로 이름 붙였다.
const TIER_LABELS: Record<'high' | 'mid' | 'low', string> = {
  high: '베스트 매칭',
  mid: '좋은 매칭',
  low: '매칭',
}

type Props = {
  result: MatchingResult
  onViewed: (resultId: number) => void
  // 이 카드의 matched_user와 나 사이에 이미 존재하는 연결(있다면). 다른
  // 매칭 요청이나 경로로 이미 연결/요청한 사람이 새 결과에 다시 뽑혀도
  // "연결하기"를 다시 활성화된 채로 보여주지 않기 위해 필요하다 — result의
  // is_contacted만으로는 "이 결과에서" 연결했는지만 알 수 있다.
  existingConnection?: Connection
}

export function MatchingResultCard({ result, onViewed, existingConnection }: Props) {
  const detailsId = useId()
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<MatchingResult>(result)
  const [connectStatus, setConnectStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [connectError, setConnectError] = useState('')

  const totalScore = Math.round(Number(detail.total_score))
  const interestScore = Math.round(Number(detail.interest_score))
  const personalityScore = Math.round(Number(detail.personality_score))
  const locationScore = Math.round(Number(detail.location_score))
  const tier = scoreTier(totalScore)
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
              <span className="matching-result-card__unviewed-dot" role="img" aria-label="새 결과" />
            )}
            <span>{user.username}</span>
          </div>
          <div className="matching-result-card__meta">
            {[formatAge(user.age), GENDER_LABELS[user.gender ?? ''], user.location]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>

        <div
          className={`matching-score-badge matching-score-badge--${tier}`}
          role="img"
          aria-label={`매칭 점수 ${totalScore}점, ${TIER_LABELS[tier]}`}
        >
          <span className="matching-score-badge__value" aria-hidden="true">
            {totalScore}
          </span>
          <span className="matching-score-badge__unit" aria-hidden="true">
            점
          </span>
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
        {existingConnection?.status === 'ACCEPTED' ? (
          <Link to={`/messages/${existingConnection.id}`} className="connection-message-link">
            메시지 보내기
          </Link>
        ) : existingConnection || detail.is_contacted ? (
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

        <button
          type="button"
          className="matching-result-card__toggle"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
        >
          {expanded ? '접기' : '자세히 보기'}
        </button>
      </div>

      {expanded && (
        <div className="matching-result-card__details" id={detailsId}>
          {/* 관심사(코랄 50%)·성격(바이올렛 30%)·위치(틸 20%) — DESIGN.md의
              Weighted Color Rule을 이 화면에서 실제로 적용하는 유일한 자리.
              막대 자체는 장식(aria-hidden)이고, 접근성 정보는 아래 dl의
              텍스트가 그대로 담당한다. */}
          <div className="matching-score-breakdown">
            <div className="matching-score-breakdown__bar" aria-hidden="true">
              <span
                className="matching-score-breakdown__segment matching-score-breakdown__segment--interest"
                style={{ flexGrow: Math.max(interestScore, 2) }}
              />
              <span
                className="matching-score-breakdown__segment matching-score-breakdown__segment--personality"
                style={{ flexGrow: Math.max(personalityScore, 2) }}
              />
              <span
                className="matching-score-breakdown__segment matching-score-breakdown__segment--location"
                style={{ flexGrow: Math.max(locationScore, 2) }}
              />
            </div>
            <dl className="matching-score-breakdown__list">
              <div className="matching-score-breakdown__item matching-score-breakdown__item--interest">
                <dt>관심사 일치</dt>
                <dd>{interestScore}점</dd>
              </div>
              <div className="matching-score-breakdown__item matching-score-breakdown__item--personality">
                <dt>성격 궁합</dt>
                <dd>{personalityScore}점</dd>
              </div>
              <div className="matching-score-breakdown__item matching-score-breakdown__item--location">
                <dt>지역 일치</dt>
                <dd>{locationScore}점</dd>
              </div>
            </dl>
          </div>

          <dl className="matching-result-card__meta-list">
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
