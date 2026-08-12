import { useEffect, useState } from 'react'
import {
  AlertIcon,
  ArtIcon,
  FoodIcon,
  MusicIcon,
  SpinnerIcon,
  SportsIcon,
  TagIcon,
  TechIcon,
  TravelIcon,
} from '../../../components/icons'
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

// 카테고리 icon 필드는 seed_interests 명령어가 이모지로 채워둔 값이라
// (icons.tsx 자신이 "유니코드 글리프/이모지를 아이콘 대용으로 쓰지
// 않는다"고 명시함) 그대로 렌더링하지 않고, 카테고리 이름으로 authored
// 아이콘을 골라 쓴다. 목록에 없는 이름이 추가돼도 TagIcon으로 안전하게
// 대체된다.
const CATEGORY_ICONS: Record<string, typeof TechIcon> = {
  기술: TechIcon,
  스포츠: SportsIcon,
  여행: TravelIcon,
  '예술/문화': ArtIcon,
  음식: FoodIcon,
  음악: MusicIcon,
}

function CategoryIcon({ name }: { name: string }) {
  const Icon = CATEGORY_ICONS[name] ?? TagIcon
  return <Icon size={16} />
}

const DEFAULT_LEVEL = 3
const LEVELS = [1, 2, 3, 4, 5]

export function InterestsStep({ onNext, onBack }: Props) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [loadError, setLoadError] = useState('')
  // interestId -> 관심도(1~5). 선택 즉시 DEFAULT_LEVEL로 들어가고, 칩 아래
  // 점 5개로 직접 조절할 수 있다 — 예전엔 이 값을 조절할 UI가 아예 없어서
  // 항상 3으로만 저장됐음(매칭 알고리즘이 실제로 쓰는 값인데도).
  const [levels, setLevels] = useState<Map<number, number>>(new Map())
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
    setLevels((current) => {
      const next = new Map(current)
      if (next.has(interestId)) {
        next.delete(interestId)
      } else {
        next.set(interestId, DEFAULT_LEVEL)
      }
      return next
    })
  }

  function setLevel(interestId: number, level: number) {
    setLevels((current) => {
      if (!current.has(interestId)) return current
      const next = new Map(current)
      next.set(interestId, level)
      return next
    })
  }

  async function handleSubmit() {
    if (levels.size === 0) {
      setErrorMessage('관심사를 1개 이상 선택해주세요.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      await Promise.all(
        [...levels].map(([interestId, level]) => addUserInterest(interestId, level)),
      )
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
              <CategoryIcon name={group.category.name} />
              <span>{group.category.name}</span>
            </div>
            <div className="onboarding-chip-grid">
              {group.interests.map((interest) => {
                const level = levels.get(interest.id)
                const isSelected = level !== undefined

                return (
                  <div className="onboarding-chip-wrap" key={interest.id}>
                    <button
                      type="button"
                      className="onboarding-chip"
                      aria-pressed={isSelected}
                      onClick={() => toggleInterest(interest.id)}
                      disabled={isSubmitting}
                    >
                      {interest.name}
                    </button>

                    {isSelected && (
                      <div
                        className="onboarding-chip-level"
                        role="group"
                        aria-label={`${interest.name} 관심도 (1~5)`}
                      >
                        {LEVELS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="onboarding-chip-level__dot"
                            aria-pressed={level >= n}
                            aria-label={`관심도 ${n}`}
                            onClick={() => setLevel(interest.id, n)}
                            disabled={isSubmitting}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
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
