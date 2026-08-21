import { useEffect, useState } from 'react'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { ApiError } from '../../../lib/apiClient'
import { RequireAuth } from '../../auth/components/RequireAuth'
import {
  listAllConnections,
  listReceivedConnections,
  listSentConnections,
} from '../api/connectionsApi'
import type { Connection, ConnectionAction } from '../types'
import { ConnectionCard } from './ConnectionCard'
import './ConnectionsScreen.css'

const RESPONSE_NOTICE: Record<ConnectionAction, (name: string) => string> = {
  accept: (name) => `${name}님과 연결됐어요. 메시지에서 대화를 시작해보세요.`,
  reject: () => '요청을 거절했어요.',
  block: (name) => `${name}님을 차단했어요.`,
}

export function ConnectionsScreen() {
  return <RequireAuth>{(user) => <Screen currentUserId={user.id} />}</RequireAuth>
}

function Screen({ currentUserId }: { currentUserId: number }) {
  const [received, setReceived] = useState<Connection[] | null>(null)
  const [sent, setSent] = useState<Connection[] | null>(null)
  // "받은 요청"은 대기중인 것만, "보낸 요청"은 상태 상관없이 보여준다
  // (connectionsApi.ts 주석 참고) — 그래서 내가 수락한 연결은 어느 쪽에도
  // 안 남는다. "누구와 연결돼 있는지"에 답하려면 방향과 무관하게 전부
  // 조회하는 listAllConnections에서 ACCEPTED만 따로 걸러야 한다.
  const [connected, setConnected] = useState<Connection[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')

  async function refresh() {
    try {
      const [receivedData, sentData, allData] = await Promise.all([
        listReceivedConnections(),
        listSentConnections(),
        listAllConnections(),
      ])
      setReceived(receivedData)
      setSent(sentData)
      setConnected(allData.filter((c) => c.status === 'ACCEPTED'))
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

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  function handleResponded(_connectionId: number, action: ConnectionAction, counterpartName: string) {
    setNotice(RESPONSE_NOTICE[action](counterpartName))
    // 수락은 "받은 요청"에서 "연결됨"으로 자리를 옮기는 것이라 로컬
    // 스플라이스만으론 부족하다 — 세 목록을 한 번에 다시 맞춘다.
    refresh()
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
        {notice && (
          <p className="connections-notice" role="status">
            {notice}
          </p>
        )}

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
          <h2 className="connections-section__heading">연결됨</h2>
          {!connected && !loadError && <p className="connections-loading">불러오는 중…</p>}
          {connected && connected.length === 0 && (
            <p className="connections-empty">아직 연결된 사람이 없어요.</p>
          )}
          {connected && connected.length > 0 && (
            <div className="connection-list">
              {connected.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  direction={connection.from_user === currentUserId ? 'sent' : 'received'}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="connections-section__heading">보낸 요청</h2>
          {!sent && !loadError && <p className="connections-loading">불러오는 중…</p>}
          {(() => {
            // ACCEPTED가 된 보낸 요청은 위 "연결됨" 섹션이 이미 보여주므로
            // 여기서 중복으로 안 보여준다 — 이 섹션은 "아직 응답 대기중이거나
            // 끝난(거절/차단) 요청"에 집중한다.
            const pendingOrEnded = sent?.filter((c) => c.status !== 'ACCEPTED') ?? null
            return (
              <>
                {pendingOrEnded && pendingOrEnded.length === 0 && (
                  <p className="connections-empty">보낸 연결 요청이 없어요.</p>
                )}
                {pendingOrEnded && pendingOrEnded.length > 0 && (
                  <div className="connection-list">
                    {pendingOrEnded.map((connection) => (
                      <ConnectionCard key={connection.id} connection={connection} direction="sent" />
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </section>
      </div>
    </div>
  )
}
