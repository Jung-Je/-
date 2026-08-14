import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import type { PaginatedResponse } from '../../../lib/apiClient'
import { cancelAdminMatchingRequest, listAdminMatchingRequests } from '../api/staffApi'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
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
  const [data, setData] = useState<PaginatedResponse<AdminMatchingRequest> | null>(null)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminMatchingRequestStatus | ''>('')
  const [page, setPage] = useState(1)

  async function refresh() {
    try {
      const result = await listAdminMatchingRequests({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
      })
      setData(result)
    } catch (error) {
      const detail =
        error instanceof ApiError ? error.detail : '매칭 요청 목록을 불러오지 못했습니다.'
      setLoadError(detail)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page])

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

      {loadError && (
        <p className="staff-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      )}

      {!data && !loadError && <p className="staff-loading">불러오는 중…</p>}

      {data && data.results.length === 0 && (
        <p className="staff-empty">조건에 맞는 매칭 요청이 없어요.</p>
      )}

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
