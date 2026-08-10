import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { ApiError } from '../../../lib/apiClient'
import { usePolling } from '../../../lib/usePolling'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { listAllConnections } from '../../connections/api/connectionsApi'
import type { Connection } from '../../connections/types'
import './MessagingScreen.css'

const POLL_INTERVAL_MS = 5000

async function loadAcceptedConversations(): Promise<Connection[]> {
  const all = await listAllConnections()
  return all
    .filter((connection) => connection.status === 'ACCEPTED')
    .sort((a, b) => {
      const aTime = a.last_message?.created_at ?? a.created_at
      const bTime = b.last_message?.created_at ?? b.created_at
      return bTime.localeCompare(aTime)
    })
}

export function ConversationsScreen() {
  return (
    <RequireAuth>
      {(user) => <Screen currentUserId={user.id} />}
    </RequireAuth>
  )
}

function Screen({ currentUserId }: { currentUserId: number }) {
  const [conversations, setConversations] = useState<Connection[] | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const accepted = await loadAcceptedConversations()
        if (cancelled) return
        setConversations(accepted)
      } catch (error) {
        if (cancelled) return
        const detail =
          error instanceof ApiError
            ? error.detail
            : '대화 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        setLoadError(detail)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 안 읽음 배지·마지막 메시지 미리보기가 새로고침 없이도 갱신되도록
  // 주기적으로 다시 조회한다. 배경 갱신 실패는 조용히 무시하고 다음
  // tick을 기다린다 — 목록 화면에서 매번 에러 배너를 띄우면 시끄럽다.
  usePolling(async () => {
    try {
      const accepted = await loadAcceptedConversations()
      setConversations(accepted)
    } catch {
      // 다음 tick에서 다시 시도
    }
  }, POLL_INTERVAL_MS)

  return (
    <div className="conversations-screen">
      <div className="conversations-header">
        <div className="conversations-brand">
          <CardStackMark />
          <h1>매칭</h1>
        </div>
        <AppNav />
      </div>

      <div className="conversations-content">
        {loadError && <p className="thread-error">{loadError}</p>}

        {!conversations && !loadError && <p className="conversations-loading">불러오는 중…</p>}

        {conversations && conversations.length === 0 && (
          <p className="conversations-empty">
            아직 대화가 없어요. 연결을 수락하면 여기서 대화할 수 있어요.
          </p>
        )}

        {conversations && conversations.length > 0 && (
          <div className="conversation-list">
            {conversations.map((connection) => {
              const counterpart =
                connection.from_user === currentUserId
                  ? connection.to_user_detail
                  : connection.from_user_detail

              return (
                <Link key={connection.id} to={`/messages/${connection.id}`} className="conversation-item">
                  <div className="conversation-item__avatar" aria-hidden="true">
                    {counterpart.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="conversation-item__body">
                    <span className="conversation-item__name">{counterpart.username}</span>
                    <span className="conversation-item__preview">
                      {connection.last_message?.body ?? '대화를 시작해보세요'}
                    </span>
                  </div>
                  {connection.unread_message_count > 0 && (
                    <span className="conversation-item__unread">{connection.unread_message_count}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
