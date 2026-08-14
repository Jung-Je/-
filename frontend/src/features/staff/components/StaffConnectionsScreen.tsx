import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import type { PaginatedResponse } from '../../../lib/apiClient'
import { listAdminConnections } from '../api/staffApi'
import { StaffLayout } from './StaffLayout'
import type { AdminConnection, AdminConnectionStatus } from '../types'

const STATUS_LABELS: Record<AdminConnectionStatus, string> = {
  PENDING: '대기중',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
  BLOCKED: '차단됨',
}

const STATUS_BADGE_VARIANT: Record<AdminConnectionStatus, string> = {
  PENDING: 'neutral',
  ACCEPTED: 'positive',
  REJECTED: 'warning',
  BLOCKED: 'danger',
}

export function StaffConnectionsScreen() {
  return (
    <RequireStaff>
      {() => <Screen />}
    </RequireStaff>
  )
}

function Screen() {
  const [data, setData] = useState<PaginatedResponse<AdminConnection> | null>(null)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminConnectionStatus | ''>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    listAdminConnections({ search: search || undefined, status: statusFilter || undefined, page })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((error) => {
        if (cancelled) return
        const detail =
          error instanceof ApiError ? error.detail : '연결 목록을 불러오지 못했습니다.'
        setLoadError(detail)
      })

    return () => {
      cancelled = true
    }
  }, [search, statusFilter, page])

  return (
    <StaffLayout>
      <div className="staff-filters">
        <input
          type="text"
          placeholder="유저명·메시지 내용 검색"
          value={search}
          onChange={(event) => {
            setPage(1)
            setSearch(event.target.value)
          }}
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setPage(1)
            setStatusFilter(event.target.value as AdminConnectionStatus | '')
          }}
        >
          <option value="">상태 전체</option>
          {(Object.keys(STATUS_LABELS) as AdminConnectionStatus[]).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {loadError && (
        <p className="staff-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      )}

      {!data && !loadError && <p className="staff-loading">불러오는 중…</p>}

      {data && data.results.length === 0 && <p className="staff-empty">조건에 맞는 연결이 없어요.</p>}

      {data && data.results.length > 0 && (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>보낸 사람</th>
                <th>받은 사람</th>
                <th>상태</th>
                <th>메시지 수</th>
                <th>생성일</th>
                <th>응답일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.from_user_detail.username}</td>
                  <td>{row.to_user_detail.username}</td>
                  <td>
                    <span className={`staff-badge staff-badge--${STATUS_BADGE_VARIANT[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td>{row.message_count}</td>
                  <td>{new Date(row.created_at).toLocaleDateString('ko-KR')}</td>
                  <td>
                    {row.responded_at ? new Date(row.responded_at).toLocaleDateString('ko-KR') : '—'}
                  </td>
                  <td>
                    <Link to={`/staff/connections/${row.id}`}>상세</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="staff-pagination">
          <button type="button" disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>
            이전
          </button>
          <span>총 {data.count}건</span>
          <button type="button" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
            다음
          </button>
        </div>
      )}
    </StaffLayout>
  )
}
