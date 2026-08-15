import { useEffect, useState } from 'react'
import {
  AlertIcon,
  ArtIcon,
  FoodIcon,
  MusicIcon,
  SportsIcon,
  TagIcon,
  TechIcon,
  TravelIcon,
} from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { listInterestCategories, listInterestsByCategory } from '../api/onboardingApi'
import type { Interest, InterestCategory } from '../types'
// 온보딩 트리 밖(설정 화면)에서도 이 컴포넌트를 쓰므로, 부모가
// OnboardingWizard.css를 이미 불러왔을 거라 기대하지 않고 여기서
// 직접 불러온다(칩/카테고리 그룹 스타일이 전부 이 파일에 있음).
import './OnboardingWizard.css'

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

const LEVELS = [1, 2, 3, 4, 5]

type Props = {
  // interestId -> 관심도(1~5). 칩이 이 안에 있으면 "선택됨"으로 표시하고
  // 아래에 레벨 점 5개를 보여준다.
  selectedLevels: Map<number, number>
  onToggle: (interestId: number) => void
  onSetLevel: (interestId: number, level: number) => void
  disabled?: boolean
  // 이미 추가된 관심사를 후보에서 아예 숨기고 싶을 때(설정 화면의
  // "추가하기" 섹션처럼 — 이미 있는 건 아래 "내 관심사" 목록에서
  // 따로 다루므로 여기 다시 안 보여줌).
  excludeInterestIds?: Set<number>
}

/**
 * 카테고리별 관심사 칩 그리드 — 온보딩 InterestsStep과 설정 화면의
 * 관심사 추가 섹션이 똑같이 쓰는 표시 컴포넌트. 목록 로딩은 이 컴포넌트가
 * 직접 하고(양쪽에서 똑같은 fetch 코드를 중복할 필요가 없게), 선택
 * 상태·레벨 조정·제출 여부는 부모가 props로 제어한다.
 */
export function InterestPicker({
  selectedLevels,
  onToggle,
  onSetLevel,
  disabled = false,
  excludeInterestIds,
}: Props) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [loadError, setLoadError] = useState('')

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

  const visibleGroups = excludeInterestIds
    ? groups
        ?.map((group) => ({
          ...group,
          interests: group.interests.filter((interest) => !excludeInterestIds.has(interest.id)),
        }))
        .filter((group) => group.interests.length > 0)
    : groups

  return (
    <>
      {loadError && (
        <p className="onboarding-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      )}

      {!groups && !loadError && (
        <p className="onboarding-interests-loading">관심사 목록을 불러오는 중…</p>
      )}

      {visibleGroups && visibleGroups.length === 0 && (
        <p className="onboarding-interests-empty">
          {groups && groups.length > 0 ? '더 추가할 관심사가 없어요.' : '아직 등록된 관심사가 없어요.'}
        </p>
      )}

      {visibleGroups &&
        visibleGroups.map((group) => (
          <div className="onboarding-interest-group" key={group.category.id}>
            <div className="onboarding-interest-group__title">
              <CategoryIcon name={group.category.name} />
              <span>{group.category.name}</span>
            </div>
            <div className="onboarding-chip-grid">
              {group.interests.map((interest) => {
                const level = selectedLevels.get(interest.id)
                const isSelected = level !== undefined

                return (
                  <div className="onboarding-chip-wrap" key={interest.id}>
                    <button
                      type="button"
                      className="onboarding-chip"
                      aria-pressed={isSelected}
                      onClick={() => onToggle(interest.id)}
                      disabled={disabled}
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
                            onClick={() => onSetLevel(interest.id, n)}
                            disabled={disabled}
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
    </>
  )
}
