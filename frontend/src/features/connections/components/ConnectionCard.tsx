import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { respondToConnection } from '../api/connectionsApi'
import type { Connection, ConnectionAction, ConnectionStatus } from '../types'

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  PENDING: '대기중',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
  BLOCKED: '차단됨',
}

type Props = {
  connection: Connection
  direction: 'received' | 'sent'
  onResponded?: (connectionId: number) => void
}

export function ConnectionCard({ connection, direction, onResponded }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const counterpart = direction === 'received' ? connection.from_user_detail : connection.to_user_detail
  const isSubmitting = status === 'submitting'
  const canRespond = direction === 'received' && connection.status === 'PENDING'

  async function respond(action: ConnectionAction) {
    setStatus('submitting')
    setErrorMessage('')

    try {
      await respondToConnection(connection.id, action)
      onResponded?.(connection.id)
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  return (
    <div className="connection-card">
      <div className="connection-card__avatar" aria-hidden="true">
        {counterpart.username.slice(0, 1).toUpperCase()}
      </div>

      <div className="connection-card__body">
        <div className="connection-card__name">{counterpart.username}</div>
        <div className="connection-card__meta">
          {[counterpart.age ? `${counterpart.age}세` : null, counterpart.location]
            .filter(Boolean)
            .join(' · ')}
        </div>
        {connection.message && <p className="connection-card__message">{connection.message}</p>}
        {status === 'error' && (
          <p className="connection-error" role="alert">
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>

      {canRespond ? (
        <div className="connection-card__actions">
          <button
            type="button"
            className="connection-action connection-action--accept"
            onClick={() => respond('accept')}
            disabled={isSubmitting}
          >
            수락
          </button>
          <button
            type="button"
            className="connection-action"
            onClick={() => respond('reject')}
            disabled={isSubmitting}
          >
            거절
          </button>
          <button
            type="button"
            className="connection-action connection-action--danger"
            onClick={() => respond('block')}
            disabled={isSubmitting}
          >
            차단
          </button>
        </div>
      ) : connection.status === 'ACCEPTED' ? (
        <Link to={`/messages/${connection.id}`} className="connection-message-link">
          메시지
          {connection.unread_message_count > 0 && (
            <span className="connection-message-link__badge">{connection.unread_message_count}</span>
          )}
        </Link>
      ) : (
        <span className={`connection-status connection-status--${connection.status.toLowerCase()}`}>
          {STATUS_LABELS[connection.status]}
        </span>
      )}
    </div>
  )
}
