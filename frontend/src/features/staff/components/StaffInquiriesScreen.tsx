import { useEffect, useState } from 'react'
import { AlertIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import type { PaginatedResponse } from '../../../lib/apiClient'
import { listAdminInquiries, updateInquiryStatus } from '../api/staffApi'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
import type { AdminInquiry, AdminInquiryCategory, AdminInquiryStatus } from '../types'

const CATEGORY_LABELS: Record<AdminInquiryCategory, string> = {
  REPORT: '신고',
  QUESTION: '문의',
  SUGGESTION: '건의',
}

const STATUS_LABELS: Record<AdminInquiryStatus, string> = {
  PENDING: '미처리',
  RESOLVED: '처리완료',
}

export function StaffInquiriesScreen() {
  return (
    <RequireStaff>
      {() => <Screen />}
    </RequireStaff>
  )
}

function Screen() {
  const [data, setData] = useState<PaginatedResponse<AdminInquiry> | null>(null)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminInquiryStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<AdminInquiryCategory | ''>('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  async function refresh() {
    try {
      const result = await listAdminInquiries({
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        page,
      })
      setData(result)
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '문의 목록을 불러오지 못했습니다.'
      setLoadError(detail)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, categoryFilter, page])

  async function handleToggleStatus(inquiry: AdminInquiry) {
    const nextStatus = inquiry.status === 'PENDING' ? 'RESOLVED' : 'PENDING'
    const updated = await updateInquiryStatus(inquiry.id, nextStatus)
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
          placeholder="제목·내용·작성자 검색"
          value={search}
          onChange={(event) => {
            setPage(1)
            setSearch(event.target.value)
          }}
        />
        <select
          value={categoryFilter}
          onChange={(event) => {
            setPage(1)
            setCategoryFilter(event.target.value as AdminInquiryCategory | '')
          }}
        >
          <option value="">유형 전체</option>
          {(Object.keys(CATEGORY_LABELS) as AdminInquiryCategory[]).map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setPage(1)
            setStatusFilter(event.target.value as AdminInquiryStatus | '')
          }}
        >
          <option value="">상태 전체</option>
          {(Object.keys(STATUS_LABELS) as AdminInquiryStatus[]).map((value) => (
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
        <p className="staff-empty">조건에 맞는 문의가 없어요.</p>
      )}

      {data && data.results.length > 0 && (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>유형</th>
                <th>제목</th>
                <th>작성자</th>
                <th>상태</th>
                <th>작성일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => {
                const isExpanded = expandedId === row.id
                return (
                  <>
                    <tr key={row.id} onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      <td>{row.category_display}</td>
                      <td>{row.title}</td>
                      <td>
                        {row.username}
                        <br />
                        <span className="staff-badge staff-badge--neutral">{row.email}</span>
                      </td>
                      <td>
                        <span
                          className={`staff-badge staff-badge--${
                            row.status === 'RESOLVED' ? 'positive' : 'warning'
                          }`}
                        >
                          {row.status_display}
                        </span>
                      </td>
                      <td>{new Date(row.created_at).toLocaleDateString('ko-KR')}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <ConfirmButton
                          label={row.status === 'PENDING' ? '처리완료' : '미처리로 되돌리기'}
                          onConfirm={() => handleToggleStatus(row)}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="staff-row-detail" key={`${row.id}-detail`}>
                        <td colSpan={6}>
                          <dl className="staff-detail-card__row">
                            <dt>내용</dt>
                            <dd>{row.content}</dd>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </>
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
