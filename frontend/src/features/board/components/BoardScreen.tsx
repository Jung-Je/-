import { useEffect, useState } from 'react'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { AlertIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { listCategories, listPosts } from '../api/boardApi'
import type { BoardCategory, Post } from '../types'
import { PostForm } from './PostForm'
import { PostList } from './PostList'
import '../../settings/components/SettingsScreen.css'
import './BoardScreen.css'

export function BoardScreen() {
  return (
    <RequireAuth>
      {() => <Screen />}
    </RequireAuth>
  )
}

function Screen() {
  const [categories, setCategories] = useState<BoardCategory[]>([])
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => {
        // 카테고리를 못 불러와도 글 목록 자체는 계속 보여준다 — 새 글
        // 작성 폼의 카테고리 select만 비어 보임.
      })
  }, [])

  async function refresh() {
    try {
      const result = await listPosts({ category: categoryFilter || undefined })
      setPosts(result.results)
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : '글 목록을 불러오지 못했습니다.'
      setLoadError(detail)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter])

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <div className="settings-brand">
          <CardStackMark />
          <h1>매칭</h1>
        </div>
        <AppNav />
      </div>

      <div className="settings-content">
        <PostForm
          categories={categories}
          onCreated={(post) => setPosts((current) => (current ? [post, ...current] : [post]))}
        />

        <div className="settings-card">
          <div className="settings-card__heading">
            <h2>게시판</h2>
            <p>다른 유저들이 남긴 글을 둘러보세요.</p>
          </div>

          <div className="board-filters">
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value ? Number(event.target.value) : '')
              }
            >
              <option value="">카테고리 전체</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {loadError && (
            <p className="settings-error" role="alert">
              <AlertIcon />
              <span>{loadError}</span>
            </p>
          )}

          {!posts && !loadError && <p className="board-empty">불러오는 중…</p>}

          {posts && <PostList posts={posts} />}
        </div>
      </div>
    </div>
  )
}
