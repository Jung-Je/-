import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { usePolling } from '../../../lib/usePolling'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { getConnection } from '../../connections/api/connectionsApi'
import type { Connection } from '../../connections/types'
import { listMessages, sendMessage } from '../api/messagingApi'
import type { Message } from '../types'
import './MessagingScreen.css'

const POLL_INTERVAL_MS = 3000
// 스크롤이 바닥에서 이만큼(px) 안이면 "바닥 근처"로 보고 새 메시지가
// 오면 계속 따라 내린다. 그보다 위로 스크롤해서 지난 대화를 보는
// 중이면, 폴링으로 새 메시지가 와도 보던 위치를 안 건드린다.
const NEAR_BOTTOM_THRESHOLD_PX = 80

export function MessageThreadScreen() {
  return <RequireAuth>{(user) => <Thread currentUserId={user.id} />}</RequireAuth>
}

function Thread({ currentUserId }: { currentUserId: number }) {
  const { connectionId } = useParams<{ connectionId: string }>()
  const id = Number(connectionId)

  const [connection, setConnection] = useState<Connection | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [sendError, setSendError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      try {
        const [connectionData, messageData] = await Promise.all([getConnection(id), listMessages(id)])
        if (cancelled) return
        setConnection(connectionData)
        setMessages(messageData)
      } catch (error) {
        if (cancelled) return
        const detail =
          error instanceof ApiError
            ? error.detail
            : '대화를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        setLoadError(detail)
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
  }, [id])

  // 상대방이 보낸 새 메시지를 받으려면 주기적으로 다시 조회해야 한다 —
  // 웹소켓 없이 폴링으로 "그럭저럭 실시간"을 구현. 조회 자체가 읽음
  // 처리도 겸하므로(listMessages), 대화창을 열어둔 동안은 상대 메시지가
  // 자동으로 읽음 처리된다. 실패해도 배경 갱신이라 조용히 다음 tick을
  // 기다린다 — 매번 에러 배너를 띄우면 일시적 네트워크 끊김에도 화면이
  // 시끄러워진다.
  usePolling(async () => {
    if (!connection) return
    try {
      const data = await listMessages(id)
      setMessages(data)
    } catch {
      // 다음 tick에서 다시 시도
    }
  }, POLL_INTERVAL_MS)

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [messages])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return

    setSendStatus('submitting')
    setSendError('')

    try {
      const message = await sendMessage(id, draft)
      isNearBottomRef.current = true // 내가 보낸 메시지는 항상 바로 보여준다
      setMessages((current) => (current ? [...current, message] : [message]))
      setDraft('')
      setSendStatus('idle')
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      setSendError(detail)
      setSendStatus('error')
    }
  }

  const counterpart =
    connection &&
    (connection.from_user === currentUserId ? connection.to_user_detail : connection.from_user_detail)

  return (
    <div className="thread-screen">
      <div className="thread-card">
        <div className="thread-header">
          <Link to="/messages" className="thread-header__back" aria-label="대화 목록으로">
            ←
          </Link>
          <span className="thread-header__name">{counterpart?.username ?? '대화'}</span>
        </div>

        {loadError && <p className="thread-error">{loadError}</p>}

        {!messages && !loadError && <p className="thread-loading">불러오는 중…</p>}

        {messages && (
          <div className="thread-messages" ref={containerRef} onScroll={handleScroll}>
            {messages.length === 0 && <p className="thread-empty">첫 메시지를 보내보세요.</p>}
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  'thread-bubble ' +
                  (message.sender === currentUserId ? 'thread-bubble--mine' : 'thread-bubble--theirs')
                }
              >
                {message.body}
                <span className="thread-bubble__time">
                  {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {sendStatus === 'error' && (
          <p className="thread-error" role="alert">
            <AlertIcon />
            <span>{sendError}</span>
          </p>
        )}

        <form className="thread-input-bar" onSubmit={handleSend}>
          <textarea
            rows={1}
            placeholder="메시지를 입력하세요"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={sendStatus === 'submitting' || !messages}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <button
            className="thread-send"
            type="submit"
            disabled={sendStatus === 'submitting' || !draft.trim()}
          >
            {sendStatus === 'submitting' ? <SpinnerIcon /> : '보내기'}
          </button>
        </form>
      </div>
    </div>
  )
}
