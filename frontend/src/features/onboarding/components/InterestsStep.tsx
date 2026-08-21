import { useState } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { addUserInterest } from '../api/onboardingApi'
import { InterestPicker } from './InterestPicker'

type Props = {
  onNext: () => void
}

const DEFAULT_LEVEL = 3

// 마법사의 첫 단계(관심사=코랄, 매칭 가중치 50%)라 이전 단계로 돌아갈
// 곳이 없다 — 뒤로가기 버튼은 여기 없다.
export function InterestsStep({ onNext }: Props) {
  // interestId -> 관심도(1~5). 선택 즉시 DEFAULT_LEVEL로 들어가고, 칩 아래
  // 점 5개로 직접 조절할 수 있다 — 예전엔 이 값을 조절할 UI가 아예 없어서
  // 항상 3으로만 저장됐음(매칭 알고리즘이 실제로 쓰는 값인데도).
  const [levels, setLevels] = useState<Map<number, number>>(new Map())
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

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

      <InterestPicker
        selectedLevels={levels}
        onToggle={toggleInterest}
        onSetLevel={setLevel}
        disabled={isSubmitting}
      />

      {status === 'error' && (
        <p className="onboarding-error" role="alert">
          <AlertIcon />
          <span>{errorMessage}</span>
        </p>
      )}

      <div className="onboarding-actions">
        <button
          type="button"
          className="onboarding-submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting && <SpinnerIcon />}
          {isSubmitting ? '저장 중…' : '다음'}
        </button>
      </div>
    </>
  )
}
