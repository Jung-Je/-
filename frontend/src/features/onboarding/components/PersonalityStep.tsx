import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { createPersonality } from '../api/onboardingApi'
import { MBTI_TYPES } from '../types'

type Props = {
  onNext: () => void
  onBack: () => void
}

/**
 * 백엔드 UserPersonality 모델은 mbti/가치관을 포함해 모든 필드가 선택값
 * 이라, 아무것도 안 바꾸고 "다음"을 눌러도 그대로 성공한다 — 성격 퀴즈를
 * 건너뛰고 싶은 사용자를 막지 않기 위함이다.
 */
export function PersonalityStep({ onNext, onBack }: Props) {
  const mbtiId = useId()
  const introvertExtrovertId = useId()
  const planningSpontaneousId = useId()
  const activeRelaxedId = useId()
  const valuesId = useId()
  const errorId = useId()

  const [mbti, setMbti] = useState('')
  const [introvertExtrovert, setIntrovertExtrovert] = useState(3)
  const [planningSpontaneous, setPlanningSpontaneous] = useState(3)
  const [activeRelaxed, setActiveRelaxed] = useState(3)
  const [valuesDescription, setValuesDescription] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await createPersonality({
        mbti,
        introvertExtrovert,
        planningSpontaneous,
        activeRelaxed,
        valuesDescription,
      })
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

  return (
    <>
      <div className="onboarding-step__heading">
        <h2>성격</h2>
        <p>취향이 비슷한 사람을 찾는 데 쓰여요. 전부 선택 사항이에요.</p>
      </div>

      <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
        <div className="onboarding-field">
          <label htmlFor={mbtiId}>MBTI</label>
          <select
            id={mbtiId}
            value={mbti}
            onChange={(event) => setMbti(event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">선택 안함</option>
            {MBTI_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="onboarding-slider-field">
          <label htmlFor={introvertExtrovertId}>내향-외향</label>
          <input
            id={introvertExtrovertId}
            type="range"
            min={1}
            max={5}
            value={introvertExtrovert}
            onChange={(event) => setIntrovertExtrovert(Number(event.target.value))}
            disabled={isSubmitting}
          />
          <div className="onboarding-slider-field__labels">
            <span>내향적</span>
            <span>외향적</span>
          </div>
        </div>

        <div className="onboarding-slider-field">
          <label htmlFor={planningSpontaneousId}>계획-즉흥</label>
          <input
            id={planningSpontaneousId}
            type="range"
            min={1}
            max={5}
            value={planningSpontaneous}
            onChange={(event) => setPlanningSpontaneous(Number(event.target.value))}
            disabled={isSubmitting}
          />
          <div className="onboarding-slider-field__labels">
            <span>계획적</span>
            <span>즉흥적</span>
          </div>
        </div>

        <div className="onboarding-slider-field">
          <label htmlFor={activeRelaxedId}>활동적-여유로운</label>
          <input
            id={activeRelaxedId}
            type="range"
            min={1}
            max={5}
            value={activeRelaxed}
            onChange={(event) => setActiveRelaxed(Number(event.target.value))}
            disabled={isSubmitting}
          />
          <div className="onboarding-slider-field__labels">
            <span>활동적</span>
            <span>여유로운</span>
          </div>
        </div>

        <div className="onboarding-field">
          <label htmlFor={valuesId}>가치관</label>
          <textarea
            id={valuesId}
            rows={3}
            maxLength={500}
            placeholder="중요하게 생각하는 가치관을 자유롭게 적어주세요"
            value={valuesDescription}
            onChange={(event) => setValuesDescription(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {status === 'error' && (
          <p className="onboarding-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <div className="onboarding-actions">
          <button
            type="button"
            className="onboarding-back"
            onClick={onBack}
            disabled={isSubmitting}
          >
            이전
          </button>
          <button className="onboarding-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '저장 중…' : '다음'}
          </button>
        </div>
      </form>
    </>
  )
}
