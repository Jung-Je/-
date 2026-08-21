import { useEffect, useRef, useState } from 'react'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { ApiError } from '../../../lib/apiClient'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { listAllConnections } from '../../connections/api/connectionsApi'
import type { Connection } from '../../connections/types'
import { listMatchingResults } from '../api/matchingApi'
import type { MatchingRequestSummary, MatchingResult } from '../types'
import { MatchingRequestForm } from './MatchingRequestForm'
import { MatchingResultCard } from './MatchingResultCard'
import './MatchingScreen.css'

export function MatchingScreen() {
  return (
    <RequireAuth>
      {() => <Screen />}
    </RequireAuth>
  )
}

function Screen() {
  const requestCardRef = useRef<HTMLDivElement>(null)
  const [results, setResults] = useState<MatchingResult[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [banner, setBanner] = useState<{ text: string; empty: boolean } | null>(null)
  // 상대방 유저 id -> 나와의 기존 연결. 매칭 결과 카드가 이 유저와 이미
  // 연결/요청 중인지 판단하는 데 쓴다 — is_contacted만 보면 "이 결과에서
  // 연결했는지"만 알 수 있어서, 다른 매칭 요청이나 경로로 이미 연결된
  // 사람이 새 결과에 다시 뽑혀도 "연결하기"가 그대로 떠 있었다.
  const [connectionsByUserId, setConnectionsByUserId] = useState<Map<number, Connection>>(
    new Map(),
  )

  async function refreshResults() {
    try {
      const [data, connections] = await Promise.all([listMatchingResults(), listAllConnections()])
      setResults(data)

      const nextMap = new Map<number, Connection>()
      for (const connection of connections) {
        nextMap.set(connection.from_user, connection)
        nextMap.set(connection.to_user, connection)
      }
      setConnectionsByUserId(nextMap)
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
      setLoadError(detail)
    }
  }

  useEffect(() => {
    refreshResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCreated(request: MatchingRequestSummary) {
    setBanner(
      request.results_count > 0
        ? { text: `${request.results_count}명을 찾았어요!`, empty: false }
        : { text: '조건에 맞는 사용자를 찾지 못했어요. 조건을 조금 완화해보세요.', empty: true },
    )
    refreshResults()
  }

  function handleViewed(resultId: number) {
    setResults((current) =>
      current
        ? current.map((result) => (result.id === resultId ? { ...result, is_viewed: true } : result))
        : current,
    )
  }

  return (
    <div className="matching-screen">
      <div className="matching-header">
        <div className="matching-brand">
          <CardStackMark />
          <h1>매칭</h1>
        </div>
        <AppNav />
      </div>

      <div className="matching-content">
        <div ref={requestCardRef}>
          <MatchingRequestForm onCreated={handleCreated} />
        </div>

        {banner && (
          <p className={`matching-banner matching-banner--${banner.empty ? 'empty' : 'success'}`}>
            {banner.text}
          </p>
        )}

        <div>
          <h2 className="matching-results__heading">매칭 결과</h2>

          {loadError && <p className="matching-error">{loadError}</p>}

          {!results && !loadError && <p className="matching-results__loading">불러오는 중…</p>}

          {results && results.length === 0 && (
            <p className="matching-results__empty">
              아직 결과가 없어요. 위에서 매칭을 시작해보세요.
            </p>
          )}

          {results && results.length > 0 && (
            <>
              <div className="matching-result-list">
                {results.map((result) => (
                  <MatchingResultCard
                    key={result.id}
                    result={result}
                    onViewed={handleViewed}
                    existingConnection={connectionsByUserId.get(result.matched_user_detail.id)}
                  />
                ))}
              </div>

              {/* 목록이 가장 낮은 점수 카드로 끝나 인상이 밋밋해지지 않게,
                  조건을 조정해 다시 찾아볼 수 있는 마무리 동작을 붙인다. */}
              <button
                type="button"
                className="matching-results__more"
                onClick={() =>
                  requestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                조건을 조정해서 더 찾아보기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
