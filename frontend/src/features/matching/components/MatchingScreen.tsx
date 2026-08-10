import { useEffect, useState } from 'react'
import { CardStackMark } from '../../../components/CardStackMark'
import { ApiError } from '../../../lib/apiClient'
import { RequireAuth } from '../../auth/components/RequireAuth'
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
  const [results, setResults] = useState<MatchingResult[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [banner, setBanner] = useState<{ text: string; empty: boolean } | null>(null)

  async function refreshResults() {
    try {
      const data = await listMatchingResults()
      setResults(data)
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
      <div className="matching-brand">
        <CardStackMark />
        <h1>매칭</h1>
      </div>

      <div className="matching-content">
        <MatchingRequestForm onCreated={handleCreated} />

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
            <div className="matching-result-list">
              {results.map((result) => (
                <MatchingResultCard key={result.id} result={result} onViewed={handleViewed} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
