import { useState } from 'react'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { listAdminUsers, moderateUser } from '../api/staffApi'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
import { StaffListStatus } from './StaffListStatus'
import { StaffPagination } from './StaffPagination'
import type { AdminUser } from '../types'

const GENDER_LABELS: Record<string, string> = {
  M: '남성',
  F: '여성',
  O: '기타',
  N: '',
}

// MatchingResultCard.tsx의 formatAge와 같은 이유 — 생년월일이 미래인
// 이상 데이터가 있으면 User.age가 음수를 반환하는데, falsy 체크만으로는
// -1 같은 값을 못 걸러낸다("-1세"로 그대로 노출됨, 실제로 겪은 사례).
function formatAge(age: number | null): string | null {
  if (age === null || age <= 0) return null
  return `${age}세`
}

export function StaffUsersScreen() {
  return (
    <RequireStaff>
      {(currentUser) => <Screen currentUserId={currentUser.id} />}
    </RequireStaff>
  )
}

function Screen({ currentUserId }: { currentUserId: number }) {
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [matchingFilter, setMatchingFilter] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, setData, loadError } = usePaginatedList<AdminUser>(
    () =>
      listAdminUsers({
        search: search || undefined,
        is_active: isActiveFilter === '' ? undefined : isActiveFilter === 'true',
        is_active_for_matching: matchingFilter === '' ? undefined : matchingFilter === 'true',
        page,
      }),
    [search, isActiveFilter, matchingFilter, page],
    '사용자 목록을 불러오지 못했습니다.',
  )

  async function handleModerate(user: AdminUser, payload: Parameters<typeof moderateUser>[1]) {
    const updated = await moderateUser(user.id, payload)
    setData((current) =>
      current
        ? { ...current, results: current.results.map((row) => (row.id === updated.id ? updated : row)) }
        : current,
    )
  }

  return (
    <StaffLayout>
      <div className="staff-filters">
        <input
          type="text"
          placeholder="유저명·이메일·지역 검색"
          value={search}
          onChange={(event) => {
            setPage(1)
            setSearch(event.target.value)
          }}
        />
        <select
          value={isActiveFilter}
          onChange={(event) => {
            setPage(1)
            setIsActiveFilter(event.target.value as typeof isActiveFilter)
          }}
        >
          <option value="">계정 상태 전체</option>
          <option value="true">활성</option>
          <option value="false">정지됨</option>
        </select>
        <select
          value={matchingFilter}
          onChange={(event) => {
            setPage(1)
            setMatchingFilter(event.target.value as typeof matchingFilter)
          }}
        >
          <option value="">매칭풀 전체</option>
          <option value="true">포함</option>
          <option value="false">제외</option>
        </select>
      </div>

      <StaffListStatus
        loadError={loadError}
        loading={!data}
        emptyMessage={data && data.results.length === 0 ? '조건에 맞는 사용자가 없어요.' : undefined}
      />

      {data && data.results.length > 0 && (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>유저명</th>
                <th>이메일</th>
                <th>성별/나이</th>
                <th>지역</th>
                <th>매칭풀</th>
                <th>계정 상태</th>
                <th>권한</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => {
                const isSelf = row.id === currentUserId
                const isExpanded = expandedId === row.id
                return (
                  <>
                    <tr key={row.id} onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      <td>{row.username}</td>
                      <td>{row.email}</td>
                      <td>
                        {[GENDER_LABELS[row.gender ?? ''], formatAge(row.age)]
                          .filter(Boolean)
                          .join(' · ')}
                      </td>
                      <td>{row.location || '—'}</td>
                      <td>
                        <span
                          className={`staff-badge staff-badge--${row.is_active_for_matching ? 'positive' : 'neutral'}`}
                        >
                          {row.is_active_for_matching ? '포함' : '제외'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`staff-badge staff-badge--${row.is_active ? 'positive' : 'danger'}`}
                        >
                          {row.is_active ? '활성' : '정지됨'}
                        </span>
                      </td>
                      <td>
                        {row.is_superuser ? (
                          <span className="staff-badge staff-badge--warning">슈퍼유저</span>
                        ) : row.is_staff ? (
                          <span className="staff-badge staff-badge--warning">스태프</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{new Date(row.date_joined).toLocaleDateString('ko-KR')}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="staff-confirm-group">
                          <ConfirmButton
                            label={row.is_active ? '정지' : '해제'}
                            variant={row.is_active ? 'danger' : 'default'}
                            disabled={isSelf}
                            onConfirm={() => handleModerate(row, { is_active: !row.is_active })}
                          />
                          <ConfirmButton
                            label={row.is_active_for_matching ? '매칭풀 제외' : '매칭풀 포함'}
                            onConfirm={() =>
                              handleModerate(row, {
                                is_active_for_matching: !row.is_active_for_matching,
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="staff-row-detail" key={`${row.id}-detail`}>
                        <td colSpan={9}>
                          <dl className="staff-detail-card__row">
                            <dt>자기소개</dt>
                            <dd>{row.bio || '—'}</dd>
                          </dl>
                          {row.personality ? (
                            <dl className="staff-detail-card__row">
                              <dt>MBTI</dt>
                              <dd>{row.personality.mbti || '—'}</dd>
                              <dt>내향-외향</dt>
                              <dd>{row.personality.introvert_extrovert ?? '—'}</dd>
                              <dt>계획-즉흥</dt>
                              <dd>{row.personality.planning_spontaneous ?? '—'}</dd>
                              <dt>활동적-여유로운</dt>
                              <dd>{row.personality.active_relaxed ?? '—'}</dd>
                              <dt>가치관</dt>
                              <dd>{row.personality.values_description || '—'}</dd>
                            </dl>
                          ) : (
                            <p className="staff-empty">성격 정보 없음</p>
                          )}
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

      <StaffPagination data={data} onPageChange={setPage} unit="명" />
    </StaffLayout>
  )
}
