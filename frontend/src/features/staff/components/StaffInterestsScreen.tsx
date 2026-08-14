import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import type { PaginatedResponse } from '../../../lib/apiClient'
import {
  createAdminInterest,
  createAdminInterestCategory,
  deleteAdminInterest,
  deleteAdminInterestCategory,
  listAdminInterestCategories,
  listAdminInterests,
} from '../api/staffApi'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
import type { AdminInterest, AdminInterestCategory } from '../types'

export function StaffInterestsScreen() {
  return (
    <RequireStaff>
      {() => <Screen />}
    </RequireStaff>
  )
}

function Screen() {
  const [data, setData] = useState<PaginatedResponse<AdminInterestCategory> | null>(null)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [interestsByCategory, setInterestsByCategory] = useState<Record<number, AdminInterest[]>>(
    {},
  )

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('')
  const [categoryFormError, setCategoryFormError] = useState('')

  const [newInterestName, setNewInterestName] = useState('')
  const [newInterestDescription, setNewInterestDescription] = useState('')
  const [interestFormError, setInterestFormError] = useState('')

  async function refresh() {
    try {
      const result = await listAdminInterestCategories({ search: search || undefined, page })
      setData(result)
    } catch (error) {
      const detail =
        error instanceof ApiError ? error.detail : '관심사 카테고리를 불러오지 못했습니다.'
      setLoadError(detail)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page])

  async function loadInterests(categoryId: number) {
    const interests = await listAdminInterests(categoryId)
    setInterestsByCategory((current) => ({ ...current, [categoryId]: interests }))
  }

  function toggleExpand(categoryId: number) {
    const next = expandedId === categoryId ? null : categoryId
    setExpandedId(next)
    setInterestFormError('')
    setNewInterestName('')
    setNewInterestDescription('')
    if (next !== null && !interestsByCategory[next]) {
      loadInterests(next)
    }
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault()
    setCategoryFormError('')
    try {
      await createAdminInterestCategory({
        name: newCategoryName,
        description: newCategoryDescription,
        icon: newCategoryIcon,
      })
      setNewCategoryName('')
      setNewCategoryDescription('')
      setNewCategoryIcon('')
      await refresh()
    } catch (error) {
      setCategoryFormError(
        error instanceof ApiError ? error.detail : '카테고리를 만들지 못했습니다.',
      )
    }
  }

  async function handleDeleteCategory(categoryId: number) {
    await deleteAdminInterestCategory(categoryId)
    if (expandedId === categoryId) setExpandedId(null)
    await refresh()
  }

  async function handleCreateInterest(categoryId: number, event: FormEvent) {
    event.preventDefault()
    setInterestFormError('')
    try {
      await createAdminInterest({
        category: categoryId,
        name: newInterestName,
        description: newInterestDescription,
      })
      setNewInterestName('')
      setNewInterestDescription('')
      await loadInterests(categoryId)
      await refresh()
    } catch (error) {
      setInterestFormError(
        error instanceof ApiError ? error.detail : '관심사를 만들지 못했습니다.',
      )
    }
  }

  async function handleDeleteInterest(categoryId: number, interestId: number) {
    await deleteAdminInterest(interestId)
    await loadInterests(categoryId)
    await refresh()
  }

  return (
    <StaffLayout>
      <form className="staff-detail-card" onSubmit={handleCreateCategory}>
        <h2>새 카테고리</h2>
        <div className="staff-filters">
          <input
            type="text"
            placeholder="카테고리 이름"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            required
          />
          <input
            type="text"
            placeholder="설명 (선택)"
            value={newCategoryDescription}
            onChange={(event) => setNewCategoryDescription(event.target.value)}
          />
          <input
            type="text"
            placeholder="아이콘 (선택, 이모지)"
            value={newCategoryIcon}
            onChange={(event) => setNewCategoryIcon(event.target.value)}
          />
          <button type="submit" className="staff-confirm-btn">
            카테고리 추가
          </button>
        </div>
        {categoryFormError && (
          <p className="staff-error" role="alert">
            <AlertIcon />
            <span>{categoryFormError}</span>
          </p>
        )}
      </form>

      <div className="staff-filters">
        <input
          type="text"
          placeholder="카테고리 이름·설명 검색"
          value={search}
          onChange={(event) => {
            setPage(1)
            setSearch(event.target.value)
          }}
        />
      </div>

      {loadError && (
        <p className="staff-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      )}

      {!data && !loadError && <p className="staff-loading">불러오는 중…</p>}

      {data && data.results.length === 0 && (
        <p className="staff-empty">조건에 맞는 카테고리가 없어요.</p>
      )}

      {data && data.results.length > 0 && (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>아이콘</th>
                <th>이름</th>
                <th>설명</th>
                <th>관심사 수</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((category) => {
                const isExpanded = expandedId === category.id
                const interests = interestsByCategory[category.id]
                return (
                  <>
                    <tr key={category.id} onClick={() => toggleExpand(category.id)}>
                      <td>{category.icon || '—'}</td>
                      <td>{category.name}</td>
                      <td>{category.description || '—'}</td>
                      <td>{category.interests_count}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <ConfirmButton
                          label="삭제"
                          variant="danger"
                          confirmLabel={
                            category.interests_count > 0
                              ? `관심사 ${category.interests_count}개도 함께 삭제됨`
                              : undefined
                          }
                          onConfirm={() => handleDeleteCategory(category.id)}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="staff-row-detail" key={`${category.id}-detail`}>
                        <td colSpan={5}>
                          {!interests && <p className="staff-loading">관심사 불러오는 중…</p>}

                          {interests && interests.length === 0 && (
                            <p className="staff-empty">이 카테고리엔 아직 관심사가 없어요.</p>
                          )}

                          {interests && interests.length > 0 && (
                            <ul className="staff-interest-list">
                              {interests.map((interest) => (
                                <li key={interest.id}>
                                  <span>{interest.name}</span>
                                  {interest.description && (
                                    <span className="staff-interest-list__desc">
                                      {interest.description}
                                    </span>
                                  )}
                                  <ConfirmButton
                                    label="삭제"
                                    variant="danger"
                                    onConfirm={() =>
                                      handleDeleteInterest(category.id, interest.id)
                                    }
                                  />
                                </li>
                              ))}
                            </ul>
                          )}

                          <form
                            className="staff-filters"
                            onSubmit={(event) => handleCreateInterest(category.id, event)}
                          >
                            <input
                              type="text"
                              placeholder="새 관심사 이름"
                              value={newInterestName}
                              onChange={(event) => setNewInterestName(event.target.value)}
                              required
                            />
                            <input
                              type="text"
                              placeholder="설명 (선택)"
                              value={newInterestDescription}
                              onChange={(event) => setNewInterestDescription(event.target.value)}
                            />
                            <button type="submit" className="staff-confirm-btn">
                              관심사 추가
                            </button>
                          </form>
                          {interestFormError && (
                            <p className="staff-error" role="alert">
                              <AlertIcon />
                              <span>{interestFormError}</span>
                            </p>
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
