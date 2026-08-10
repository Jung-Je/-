import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { getConnection } from '../../connections/api/connectionsApi'
import type { Connection } from '../../connections/types'
import { listMessages, sendMessage } from '../api/messagingApi'
import type { Message } from '../types'
import './MessagingScreen.css'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
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

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return

    setSendStatus('submitting')
    setSendError('')

    try {
      const message = await sendMessage(id, draft)
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
          <div className="thread-messages">
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
