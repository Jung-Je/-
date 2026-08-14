import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import { getAdminMatchingRequest, listAdminMatchingRequestResults } from '../api/staffApi'
import { StaffLayout } from './StaffLayout'
import type { AdminMatchingRequest, AdminMatchingRequestStatus } from '../types'
import type { MatchingResult } from '../../matching/types'

const STATUS_LABELS: Record<AdminMatchingRequestStatus, string> = {
  PENDING: '대기중',
  PROCESSING: '처리중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
}

export function StaffMatchingRequestDetailScreen() {
  return (
    <RequireStaff>
      {() => <Screen />}
    </RequireStaff>
  )
}

function Screen() {
  const { requestId } = useParams<{ requestId: string }>()
  const id = Number(requestId)

  const [matchingRequest, setMatchingRequest] = useState<AdminMatchingRequest | null>(null)
  const [results, setResults] = useState<MatchingResult[] | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([getAdminMatchingRequest(id), listAdminMatchingRequestResults(id)])
      .then(([requestData, resultData]) => {
        if (cancelled) return
        setMatchingRequest(requestData)
        setResults(resultData)
      })
      .catch((error) => {
        if (cancelled) return
        const detail =
          error instanceof ApiError ? error.detail : '매칭 요청 정보를 불러오지 못했습니다.'
        setLoadError(detail)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loadError) {
    return (
      <StaffLayout>
        <p className="staff-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      </StaffLayout>
    )
  }

  if (!matchingRequest || !results) {
    return (
      <StaffLayout>
        <p className="staff-loading">불러오는 중…</p>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="staff-detail-card">
        <h2>{matchingRequest.requester_detail.username}의 매칭 요청</h2>
        <dl className="staff-detail-card__row">
          <dt>상태</dt>
          <dd>{STATUS_LABELS[matchingRequest.status]}</dd>
          <dt>희망 지역</dt>
          <dd>{matchingRequest.preferred_location || '—'}</dd>
          <dt>나이 범위</dt>
          <dd>
            {matchingRequest.min_age ?? '—'} ~ {matchingRequest.max_age ?? '—'}세
          </dd>
          <dt>최대 결과 수</dt>
          <dd>{matchingRequest.max_results}</dd>
          <dt>생성일</dt>
          <dd>{new Date(matchingRequest.created_at).toLocaleString('ko-KR')}</dd>
          <dt>완료일</dt>
          <dd>
            {matchingRequest.completed_at
              ? new Date(matchingRequest.completed_at).toLocaleString('ko-KR')
              : '—'}
          </dd>
        </dl>
      </div>

      <div className="staff-detail-card">
        <h2>매칭 결과 ({results.length}건)</h2>

        {results.length === 0 && <p className="staff-empty">매칭 결과가 없어요.</p>}

        {results.length > 0 && (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>매칭된 유저</th>
                  <th>총점</th>
                  <th>관심사 점수</th>
                  <th>성격 점수</th>
                  <th>지역 점수</th>
                  <th>공통 관심사 수</th>
                  <th>조회됨</th>
                  <th>연결 시도됨</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.matched_user_detail.username}</td>
                    <td>{result.total_score}</td>
                    <td>{result.interest_score}</td>
                    <td>{result.personality_score}</td>
                    <td>{result.location_score}</td>
                    <td>{result.common_interests_count}</td>
                    <td>
                      <span
                        className={`staff-badge staff-badge--${result.is_viewed ? 'positive' : 'neutral'}`}
                      >
                        {result.is_viewed ? '조회됨' : '안봄'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`staff-badge staff-badge--${result.is_contacted ? 'positive' : 'neutral'}`}
                      >
                        {result.is_contacted ? '시도됨' : '없음'}
                      </span>
                    </td>
                    <td>{new Date(result.created_at).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StaffLayout>
  )
}
