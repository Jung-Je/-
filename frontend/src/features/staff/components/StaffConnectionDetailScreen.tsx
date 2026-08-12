import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import {
  deleteAdminMessage,
  getAdminConnection,
  listAdminConnectionMessages,
  overrideConnectionStatus,
} from '../api/staffApi'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
import type { AdminConnection, AdminConnectionStatus, AdminMessage } from '../types'

const STATUS_LABELS: Record<AdminConnectionStatus, string> = {
  PENDING: '대기중',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
  BLOCKED: '차단됨',
}

export function StaffConnectionDetailScreen() {
  return (
    <RequireStaff>
      {() => <Screen />}
    </RequireStaff>
  )
}

function Screen() {
  const { connectionId } = useParams<{ connectionId: string }>()
  const id = Number(connectionId)

  const [connection, setConnection] = useState<AdminConnection | null>(null)
  const [messages, setMessages] = useState<AdminMessage[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [statusChoice, setStatusChoice] = useState<AdminConnectionStatus>('PENDING')

  async function load() {
    try {
      const [connectionData, messageData] = await Promise.all([
        getAdminConnection(id),
        listAdminConnectionMessages(id),
      ])
      setConnection(connectionData)
      setStatusChoice(connectionData.status)
      setMessages(messageData)
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '연결 정보를 불러오지 못했습니다.'
      setLoadError(detail)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleApplyStatus() {
    const updated = await overrideConnectionStatus(id, statusChoice)
    setConnection(updated)
  }

  async function handleDeleteMessage(messageId: number) {
    await deleteAdminMessage(id, messageId)
    setMessages((current) => (current ? current.filter((m) => m.id !== messageId) : current))
  }

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

  if (!connection || !messages) {
    return (
      <StaffLayout>
        <p className="staff-loading">불러오는 중…</p>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="staff-detail-card">
        <h2>
          {connection.from_user_detail.username} → {connection.to_user_detail.username}
        </h2>
        <dl className="staff-detail-card__row">
          <dt>현재 상태</dt>
          <dd>{STATUS_LABELS[connection.status]}</dd>
          <dt>최초 메시지</dt>
          <dd>{connection.message || '—'}</dd>
          <dt>생성일</dt>
          <dd>{new Date(connection.created_at).toLocaleString('ko-KR')}</dd>
          <dt>응답일</dt>
          <dd>
            {connection.responded_at
              ? new Date(connection.responded_at).toLocaleString('ko-KR')
              : '—'}
          </dd>
        </dl>

        <div className="staff-filters">
          <select
            value={statusChoice}
            onChange={(event) => setStatusChoice(event.target.value as AdminConnectionStatus)}
          >
            {(Object.keys(STATUS_LABELS) as AdminConnectionStatus[]).map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <ConfirmButton
            label="상태 변경 적용"
            variant={statusChoice === 'BLOCKED' ? 'danger' : 'default'}
            disabled={statusChoice === connection.status}
            onConfirm={handleApplyStatus}
          />
        </div>
      </div>

      <div className="staff-detail-card">
        <h2>메시지 이력</h2>

        {messages.length === 0 && <p className="staff-empty">주고받은 메시지가 없어요.</p>}

        {messages.length > 0 && (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>보낸 사람</th>
                  <th>내용</th>
                  <th>시각</th>
                  <th>읽음</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td>{message.sender_username}</td>
                    <td>{message.body}</td>
                    <td>{new Date(message.created_at).toLocaleString('ko-KR')}</td>
                    <td>
                      <span
                        className={`staff-badge staff-badge--${message.read_at ? 'positive' : 'neutral'}`}
                      >
                        {message.read_at ? '읽음' : '안읽음'}
                      </span>
                    </td>
                    <td>
                      <ConfirmButton
                        label="삭제"
                        variant="danger"
                        onConfirm={() => handleDeleteMessage(message.id)}
                      />
                    </td>
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
