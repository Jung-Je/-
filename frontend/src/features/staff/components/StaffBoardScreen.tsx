import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertIcon } from '../../../components/icons'
import { RequireStaff } from '../../auth/components/RequireStaff'
import { ApiError } from '../../../lib/apiClient'
import {
  createAdminBoardCategory,
  deleteAdminBoardCategory,
  deleteAdminComment,
  deleteAdminPost,
  listAdminBoardCategories,
  listAdminComments,
  listAdminPosts,
} from '../api/staffApi'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { StaffLayout } from './StaffLayout'
import { ConfirmButton } from './ConfirmButton'
import { StaffListStatus } from './StaffListStatus'
import { StaffPagination } from './StaffPagination'
import type { AdminBoardCategory, AdminComment, AdminPost } from '../types'

export function StaffBoardScreen() {
  return (
    <RequireStaff>
      {() => <Screen />}
    </RequireStaff>
  )
}

function Screen() {
  const [categories, setCategories] = useState<AdminBoardCategory[]>([])
  const [categoryError, setCategoryError] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [categoryFormError, setCategoryFormError] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [commentsByPost, setCommentsByPost] = useState<Record<number, AdminComment[]>>({})

  const {
    data,
    loadError,
    refresh: refreshPosts,
  } = usePaginatedList<AdminPost>(
    () => listAdminPosts({ search: search || undefined, category: categoryFilter || undefined, page }),
    [search, categoryFilter, page],
    '게시글 목록을 불러오지 못했습니다.',
  )

  async function refreshCategories() {
    try {
      const result = await listAdminBoardCategories()
      setCategories(result)
    } catch (error) {
      setCategoryError(error instanceof ApiError ? error.detail : '카테고리를 불러오지 못했습니다.')
    }
  }

  useEffect(() => {
    refreshCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault()
    setCategoryFormError('')
    try {
      await createAdminBoardCategory({
        name: newCategoryName,
        description: newCategoryDescription,
      })
      setNewCategoryName('')
      setNewCategoryDescription('')
      await refreshCategories()
    } catch (error) {
      setCategoryFormError(error instanceof ApiError ? error.detail : '카테고리를 만들지 못했습니다.')
    }
  }

  async function handleDeleteCategory(categoryId: number) {
    await deleteAdminBoardCategory(categoryId)
    await Promise.all([refreshCategories(), refreshPosts()])
  }

  async function loadComments(postId: number) {
    const comments = await listAdminComments(postId)
    setCommentsByPost((current) => ({ ...current, [postId]: comments }))
  }

  function toggleExpand(postId: number) {
    const next = expandedId === postId ? null : postId
    setExpandedId(next)
    if (next !== null && !commentsByPost[next]) {
      loadComments(next)
    }
  }

  async function handleDeletePost(postId: number) {
    await deleteAdminPost(postId)
    if (expandedId === postId) setExpandedId(null)
    await refreshPosts()
  }

  async function handleDeleteComment(postId: number, commentId: number) {
    await deleteAdminComment(commentId)
    await loadComments(postId)
    await refreshPosts()
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
        {categoryError && (
          <p className="staff-error" role="alert">
            <AlertIcon />
            <span>{categoryError}</span>
          </p>
        )}

        {categories.length > 0 && (
          <ul className="staff-interest-list">
            {categories.map((category) => (
              <li key={category.id}>
                <span>{category.name}</span>
                {category.description && (
                  <span className="staff-interest-list__desc">{category.description}</span>
                )}
                <span className="staff-badge staff-badge--neutral">글 {category.posts_count}개</span>
                <ConfirmButton
                  label="삭제"
                  variant="danger"
                  confirmLabel={
                    category.posts_count > 0
                      ? `글 ${category.posts_count}개도 함께 삭제됨`
                      : undefined
                  }
                  onConfirm={() => handleDeleteCategory(category.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </form>

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
            setCategoryFilter(event.target.value ? Number(event.target.value) : '')
          }}
        >
          <option value="">카테고리 전체</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <StaffListStatus
        loadError={loadError}
        loading={!data}
        emptyMessage={data && data.results.length === 0 ? '조건에 맞는 글이 없어요.' : undefined}
      />

      {data && data.results.length > 0 && (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>카테고리</th>
                <th>제목</th>
                <th>작성자</th>
                <th>댓글</th>
                <th>작성일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => {
                const isExpanded = expandedId === row.id
                const comments = commentsByPost[row.id]
                return (
                  <>
                    <tr key={row.id} onClick={() => toggleExpand(row.id)}>
                      <td>{row.category_name}</td>
                      <td>{row.title}</td>
                      <td>
                        {row.username}
                        <br />
                        <span className="staff-badge staff-badge--neutral">{row.email}</span>
                      </td>
                      <td>{row.comment_count}</td>
                      <td>{new Date(row.created_at).toLocaleDateString('ko-KR')}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <ConfirmButton
                          label="삭제"
                          variant="danger"
                          onConfirm={() => handleDeletePost(row.id)}
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

                          <h3 className="staff-board-comments-heading">댓글</h3>
                          {!comments && <p className="staff-loading">댓글 불러오는 중…</p>}
                          {comments && comments.length === 0 && (
                            <p className="staff-empty">댓글이 없어요.</p>
                          )}
                          {comments && comments.length > 0 && (
                            <ul className="staff-interest-list">
                              {comments.map((comment) => (
                                <li key={comment.id}>
                                  <span>{comment.username}</span>
                                  <span className="staff-interest-list__desc">{comment.content}</span>
                                  <ConfirmButton
                                    label="삭제"
                                    variant="danger"
                                    onConfirm={() => handleDeleteComment(row.id, comment.id)}
                                  />
                                </li>
                              ))}
                            </ul>
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

      <StaffPagination data={data} onPageChange={setPage} unit="건" />
    </StaffLayout>
  )
}
