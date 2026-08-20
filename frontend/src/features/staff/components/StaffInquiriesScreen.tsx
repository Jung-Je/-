import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import { listAdminInquiries, replyToInquiry, updateInquiryStatus } from '../api/staffApi'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
import { StaffListStatus } from './StaffListStatus'
import { StaffPagination } from './StaffPagination'
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminInquiryStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<AdminInquiryCategory | ''>('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, setData, loadError } = usePaginatedList<AdminInquiry>(
    () =>
      listAdminInquiries({
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        page,
      }),
    [search, statusFilter, categoryFilter, page],
    '문의 목록을 불러오지 못했습니다.',
  )

  function applyUpdate(updated: AdminInquiry) {
    setData((current) =>
      current
        ? {
            ...current,
            results: current.results.map((row) => (row.id === updated.id ? updated : row)),
          }
        : current,
    )
  }

  async function handleToggleStatus(inquiry: AdminInquiry) {
    const nextStatus = inquiry.status === 'PENDING' ? 'RESOLVED' : 'PENDING'
    applyUpdate(await updateInquiryStatus(inquiry.id, nextStatus))
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

      <StaffListStatus
        loadError={loadError}
        loading={!data}
        emptyMessage={data && data.results.length === 0 ? '조건에 맞는 문의가 없어요.' : undefined}
      />

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
                          <InquiryReplyForm inquiry={row} onReplied={applyUpdate} />
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

      <StaffPagination data={data} onPageChange={setPage} unit="건" />
    </StaffLayout>
  )
}

type InquiryReplyFormProps = {
  inquiry: AdminInquiry
  onReplied: (updated: AdminInquiry) => void
}

/**
 * 문의당 답변 1개(백엔드 AdminInquiryReplySerializer와 짝) — 이미 답변이
 * 있으면 프리필해서 고쳐 쓸 수 있게 한다. 저장하면 서버가 알아서
 * 처리완료로 전환하므로, 여기선 상태를 따로 안 건드리고 onReplied로
 * 받은 최신 row를 그대로 부모 목록에 반영만 한다.
 */
function InquiryReplyForm({ inquiry, onReplied }: InquiryReplyFormProps) {
  const replyId = useId()
  const [reply, setReply] = useState(inquiry.admin_reply)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const updated = await replyToInquiry(inquiry.id, reply)
      onReplied(updated)
      setStatus('success')
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '답변을 저장하지 못했습니다.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  return (
    <form className="staff-reply-form" onSubmit={handleSubmit}>
      <label htmlFor={replyId}>관리자 답변</label>
      <textarea
        id={replyId}
        rows={3}
        maxLength={2000}
        placeholder="문의한 유저에게 남길 답변을 적어주세요"
        value={reply}
        onChange={(event) => {
          setReply(event.target.value)
          setStatus('idle')
        }}
        disabled={isSubmitting}
      />
      {status === 'error' && (
        <p className="staff-error" role="alert">
          <AlertIcon />
          <span>{errorMessage}</span>
        </p>
      )}
      <div className="staff-reply-form__actions">
        <button className="staff-confirm-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon size={14} />}
          {isSubmitting ? '저장 중…' : '답변 저장'}
        </button>
        {status === 'success' && <span className="staff-reply-form__success">저장됐어요</span>}
      </div>
    </form>
  )
}
