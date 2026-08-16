import { useEffect, useState } from 'react'
import { AlertIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { InterestPicker } from '../../onboarding/components/InterestPicker'
import {
  addUserInterest,
  listMyInterests,
  removeInterest,
  updateInterestLevel,
} from '../../onboarding/api/onboardingApi'
import type { UserInterest } from '../../onboarding/types'

const LEVELS = [1, 2, 3, 4, 5]

/**
 * 온보딩 InterestsStep과 달리 항목 단위로 즉시 저장된다(모아서
 * "완료" 한 번에 제출하는 배치 방식이 아님) — 설정 화면답게 클릭할
 * 때마다 바로 반영. 새 관심사를 고를 때 쓰는 칩 그리드는
 * InterestPicker를 그대로 재사용(온보딩과 동일 컴포넌트).
 */
export function InterestsSettingsForm() {
  const [interests, setInterests] = useState<UserInterest[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  async function refresh() {
    try {
      const data = await listMyInterests()
      setInterests(data)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.detail : '관심사를 불러오지 못했습니다.')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSetLevel(userInterestId: number, level: number) {
    setActionError('')
    try {
      const updated = await updateInterestLevel(userInterestId, level)
      setInterests(
        (current) => current?.map((ui) => (ui.id === updated.id ? updated : ui)) ?? current,
      )
    } catch (error) {
      setActionError(error instanceof ApiError ? error.detail : '관심도를 변경하지 못했습니다.')
    }
  }

  async function handleRemove(userInterestId: number) {
    setActionError('')
    try {
      await removeInterest(userInterestId)
      setInterests((current) => current?.filter((ui) => ui.id !== userInterestId) ?? current)
    } catch (error) {
      setActionError(error instanceof ApiError ? error.detail : '관심사를 삭제하지 못했습니다.')
    }
  }

  async function handleAdd(interestId: number) {
    setActionError('')
    try {
      await addUserInterest(interestId)
      // InterestPicker는 추가된 항목을 excludeInterestIds로 넘겨받아
      // 스스로 목록을 다시 불러오지 않으니, 여기서 내 관심사만 다시
      // 조회해서 새로 생긴 id/interest_detail을 얻는다.
      await refresh()
    } catch (error) {
      setActionError(error instanceof ApiError ? error.detail : '관심사를 추가하지 못했습니다.')
    }
  }

  const excludeInterestIds = new Set((interests ?? []).map((ui) => ui.interest))

  return (
    <div className="settings-card">
      <div className="settings-card__heading">
        <h2>관심사</h2>
        <p>매칭에 가장 크게 반영되는 정보예요. 눌러서 바로 저장돼요.</p>
      </div>

      {loadError && (
        <p className="settings-error" role="alert">
          <AlertIcon />
          <span>{loadError}</span>
        </p>
      )}

      {!interests && !loadError && <p className="onboarding-interests-loading">불러오는 중…</p>}

      {interests && interests.length === 0 && (
        <p className="onboarding-interests-empty">아직 선택한 관심사가 없어요.</p>
      )}

      {interests && interests.length > 0 && (
        <ul className="settings-interest-list">
          {interests.map((ui) => (
            <li key={ui.id} className="settings-interest-list__item">
              <div className="settings-interest-list__main">
                <span className="settings-interest-list__category">
                  {ui.interest_detail.category_name}
                </span>
                <span className="settings-interest-list__name">{ui.interest_detail.name}</span>
              </div>
              <div
                className="onboarding-chip-level"
                role="group"
                aria-label={`${ui.interest_detail.name} 관심도 (1~5)`}
              >
                {LEVELS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="onboarding-chip-level__dot"
                    aria-pressed={ui.level >= n}
                    aria-label={`관심도 ${n}`}
                    onClick={() => handleSetLevel(ui.id, n)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="settings-interest-list__remove"
                onClick={() => handleRemove(ui.id)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {actionError && (
        <p className="settings-error" role="alert">
          <AlertIcon />
          <span>{actionError}</span>
        </p>
      )}

      <div className="settings-interest-add">
        <h3>추가하기</h3>
        <InterestPicker
          selectedLevels={new Map()}
          onToggle={handleAdd}
          onSetLevel={() => {}}
          excludeInterestIds={excludeInterestIds}
        />
      </div>
    </div>
  )
}
