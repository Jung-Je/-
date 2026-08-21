import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { cancelAdminMatchingRequest, listAdminMatchingRequests } from '../api/staffApi'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
import { StaffListStatus } from './StaffListStatus'
import { StaffPagination } from './StaffPagination'
import type { AdminMatchingRequest, AdminMatchingRequestStatus } from '../types'

const STATUS_LABELS: Record<AdminMatchingRequestStatus, string> = {
  PENDING: '대기중',
  PROCESSING: '처리중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
}

const STATUS_BADGE_VARIANT: Record<AdminMatchingRequestStatus, string> = {
  PENDING: 'neutral',
  PROCESSING: 'neutral',
  COMPLETED: 'positive',
  CANCELLED: 'danger',
}

function formatAgeRange(minAge: number | null, maxAge: number | null): string {
  if (minAge === null && maxAge === null) return '—'
  return `${minAge ?? '—'} ~ ${maxAge ?? '—'}세`
}

export function StaffMatchingRequestsScreen() {
  return (
    <RequireStaff>
      {() => <Screen />}
    </RequireStaff>
  )
}

function Screen() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminMatchingRequestStatus | ''>('')
  const [page, setPage] = useState(1)

  const { data, setData, loadError } = usePaginatedList<AdminMatchingRequest>(
    () =>
      listAdminMatchingRequests({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
      }),
    [search, statusFilter, page],
    '매칭 요청 목록을 불러오지 못했습니다.',
  )

  async function handleCancel(requestId: number) {
    const updated = await cancelAdminMatchingRequest(requestId)
    setData((current) =>
      current
        ? {
            ...current,
            results: current.results.map((row) => (row.id === updated.id ? updated : row)),
          }
        : current,
    )
  }

  return (
    <StaffLayout>
      <div className="staff-filters">
        <input
          type="text"
          placeholder="요청자명 검색"
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
            setStatusFilter(event.target.value as AdminMatchingRequestStatus | '')
          }}
        >
          <option value="">상태 전체</option>
          {(Object.keys(STATUS_LABELS) as AdminMatchingRequestStatus[]).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <StaffListStatus
        loadError={loadError}
        loading={!data}
        emptyMessage={data && data.results.length === 0 ? '조건에 맞는 매칭 요청이 없어요.' : undefined}
      />

      {data && data.results.length > 0 && (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>요청자</th>
                <th>상태</th>
                <th>희망 지역</th>
                <th>나이 범위</th>
                <th>결과 수</th>
                <th>생성일</th>
                <th>완료일</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => {
                const canCancel = row.status === 'PENDING' || row.status === 'PROCESSING'
                return (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.requester_detail.username}</td>
                    <td>
                      <span
                        className={`staff-badge staff-badge--${STATUS_BADGE_VARIANT[row.status]}`}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td>{row.preferred_location || '—'}</td>
                    <td>{formatAgeRange(row.min_age, row.max_age)}</td>
                    <td>{row.results_count}</td>
                    <td>{new Date(row.created_at).toLocaleDateString('ko-KR')}</td>
                    <td>
                      {row.completed_at
                        ? new Date(row.completed_at).toLocaleDateString('ko-KR')
                        : '—'}
                    </td>
                    <td>
                      <ConfirmButton
                        label="취소"
                        variant="danger"
                        disabled={!canCancel}
                        onConfirm={() => handleCancel(row.id)}
                      />
                    </td>
                    <td>
                      <Link to={`/staff/matching-requests/${row.id}`}>상세</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <StaffPagination data={data} page={page} onPageChange={setPage} unit="건" />
    </StaffLayout>
  )
}
