import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { listAdminConnections } from '../api/staffApi'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { StaffLayout } from './StaffLayout'
import { StaffListStatus } from './StaffListStatus'
import { StaffPagination } from './StaffPagination'
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminConnectionStatus | ''>('')
  const [page, setPage] = useState(1)

  const { data, loadError } = usePaginatedList<AdminConnection>(
    () =>
      listAdminConnections({ search: search || undefined, status: statusFilter || undefined, page }),
    [search, statusFilter, page],
    '연결 목록을 불러오지 못했습니다.',
  )

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

      <StaffListStatus
        loadError={loadError}
        loading={!data}
        emptyMessage={data && data.results.length === 0 ? '조건에 맞는 연결이 없어요.' : undefined}
      />

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

      <StaffPagination data={data} onPageChange={setPage} unit="건" />
    </StaffLayout>
  )
}
