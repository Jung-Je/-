import { useEffect, useState } from 'react'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { ApiError } from '../../../lib/apiClient'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { listReceivedConnections, listSentConnections } from '../api/connectionsApi'
import type { Connection } from '../types'
import { ConnectionCard } from './ConnectionCard'
import './ConnectionsScreen.css'

export function ConnectionsScreen() {
  return <RequireAuth>{() => <Screen />}</RequireAuth>
}

function Screen() {
  const [received, setReceived] = useState<Connection[] | null>(null)
  const [sent, setSent] = useState<Connection[] | null>(null)
  const [loadError, setLoadError] = useState('')

  async function refresh() {
    try {
      const [receivedData, sentData] = await Promise.all([
        listReceivedConnections(),
        listSentConnections(),
      ])
      setReceived(receivedData)
      setSent(sentData)
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '연결 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
      setLoadError(detail)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleResponded(connectionId: number) {
    // 응답한 요청은 더 이상 "받은 요청(대기중)" 목록에 속하지 않으므로
    // 로컬에서 바로 걷어낸다 — 서버 재조회를 기다리지 않아도 됨.
    setReceived((current) => (current ? current.filter((c) => c.id !== connectionId) : current))
  }

  return (
    <div className="connections-screen">
      <div className="connections-header">
        <div className="connections-brand">
          <CardStackMark />
          <h1>매칭</h1>
        </div>
        <AppNav />
      </div>

      <div className="connections-content">
        {loadError && <p className="connection-error">{loadError}</p>}

        <section>
          <h2 className="connections-section__heading">받은 요청</h2>
          {!received && !loadError && <p className="connections-loading">불러오는 중…</p>}
          {received && received.length === 0 && (
            <p className="connections-empty">받은 연결 요청이 없어요.</p>
          )}
          {received && received.length > 0 && (
            <div className="connection-list">
              {received.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  direction="received"
                  onResponded={handleResponded}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="connections-section__heading">보낸 요청</h2>
          {!sent && !loadError && <p className="connections-loading">불러오는 중…</p>}
          {sent && sent.length === 0 && <p className="connections-empty">보낸 연결 요청이 없어요.</p>}
          {sent && sent.length > 0 && (
            <div className="connection-list">
              {sent.map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} direction="sent" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
