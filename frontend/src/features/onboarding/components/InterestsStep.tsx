import { useEffect, useState } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import {
  addUserInterest,
  checkProfileCompletion,
  listInterestCategories,
  listInterestsByCategory,
} from '../api/onboardingApi'
import type { Interest, InterestCategory } from '../types'

type Props = {
  onNext: () => void
  onBack: () => void
}

type Group = { category: InterestCategory; interests: Interest[] }

export function InterestsStep({ onNext, onBack }: Props) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const categories = await listInterestCategories()
        const interestsByCategory = await Promise.all(
          categories.map((category) => listInterestsByCategory(category.id)),
        )
        if (cancelled) return
        setGroups(
          categories.map((category, index) => ({
            category,
            interests: interestsByCategory[index],
          })),
        )
      } catch (error) {
        if (cancelled) return
        const detail =
          error instanceof ApiError
            ? error.detail
            : '관심사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        setLoadError(detail)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function toggleInterest(interestId: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(interestId)) {
        next.delete(interestId)
      } else {
        next.add(interestId)
      }
      return next
    })
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      setErrorMessage('관심사를 1개 이상 선택해주세요.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      await Promise.all([...selected].map((interestId) => addUserInterest(interestId)))
      await checkProfileCompletion()
      onNext()
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  const isSubmitting = status === 'submitting'

  return (
    <>
      <div className="onboarding-step__heading">
        <h2>관심사</h2>
        <p>관심 있는 걸 골라주세요. 매칭 가중치가 가장 큰 항목이에요.</p>
      </div>

      {loadError && (
        <p className="onboarding-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      )}

      {!groups && !loadError && (
        <p className="onboarding-interests-loading">관심사 목록을 불러오는 중…</p>
      )}

      {groups && groups.length === 0 && (
        <p className="onboarding-interests-empty">아직 등록된 관심사가 없어요.</p>
      )}

      {groups &&
        groups.map((group) => (
          <div className="onboarding-interest-group" key={group.category.id}>
            <div className="onboarding-interest-group__title">
              <span aria-hidden="true">{group.category.icon}</span>
              <span>{group.category.name}</span>
            </div>
            <div className="onboarding-chip-grid">
              {group.interests.map((interest) => (
                <button
                  key={interest.id}
                  type="button"
                  className="onboarding-chip"
                  aria-pressed={selected.has(interest.id)}
                  onClick={() => toggleInterest(interest.id)}
                  disabled={isSubmitting}
                >
                  {interest.name}
                </button>
              ))}
            </div>
          </div>
        ))}

      {status === 'error' && (
        <p className="onboarding-error" role="alert">
          <AlertIcon />
          <span>{errorMessage}</span>
        </p>
      )}

      <div className="onboarding-actions">
        <button type="button" className="onboarding-back" onClick={onBack} disabled={isSubmitting}>
          이전
        </button>
        <button
          type="button"
          className="onboarding-submit"
          onClick={handleSubmit}
          disabled={isSubmitting || !groups}
        >
          {isSubmitting && <SpinnerIcon />}
          {isSubmitting ? '저장 중…' : '완료'}
        </button>
      </div>
    </>
  )
}
