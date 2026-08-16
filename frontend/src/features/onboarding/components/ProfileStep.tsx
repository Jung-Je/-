import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { updateProfile } from '../api/onboardingApi'
import { GENDER_OPTIONS, type Gender } from '../types'

type Props = {
  userId: number
  onNext: () => void
}

export function ProfileStep({ userId, onNext }: Props) {
  const genderId = useId()
  const dateOfBirthId = useId()
  const locationId = useId()
  const bioId = useId()
  const errorId = useId()

  const [gender, setGender] = useState<Gender | ''>('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // <form noValidate>라 required 속성만으로는 실제로 막히지 않는다
    // (커스텀 에러 UI를 쓰려고 브라우저 기본 검증 팝업은 꺼둔 상태) —
    // 성별·생년월일은 매칭에 반드시 필요한 값이라 직접 막는다.
    if (!gender || !dateOfBirth) {
      setErrorMessage('성별과 생년월일은 필수로 선택해야 해요.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      await updateProfile(userId, { gender, dateOfBirth, location, bio })
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
        <h2>프로필</h2>
        <p>매칭에 쓰일 기본 정보예요. 다른 사용자에게도 보여요.</p>
      </div>

      <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
        <div className="onboarding-field">
          <label htmlFor={genderId}>성별</label>
          <select
            id={genderId}
            value={gender}
            onChange={(event) => setGender(event.target.value as Gender)}
            disabled={isSubmitting}
            required
          >
            <option value="" disabled>
              선택하세요
            </option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="onboarding-field">
          <label htmlFor={dateOfBirthId}>생년월일</label>
          <input
            id={dateOfBirthId}
            name="date_of_birth"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            disabled={isSubmitting}
            // 네이티브 날짜 선택기에서 미래 날짜를 아예 못 고르게 —
            // 서버(validate_date_of_birth)에서도 다시 막지만, 실수로
            // 연도를 잘못 눌러도 여기서 먼저 막히는 게 훨씬 자연스럽다.
            max={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>

        <div className="onboarding-field">
          <label htmlFor={locationId}>지역</label>
          <input
            id={locationId}
            name="location"
            type="text"
            placeholder="예: 서울"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="onboarding-field">
          <label htmlFor={bioId}>자기소개</label>
          <textarea
            id={bioId}
            name="bio"
            rows={4}
            maxLength={500}
            placeholder="나를 소개하는 짧은 글을 남겨주세요"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        {status === 'error' && (
          <p className="onboarding-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <div className="onboarding-actions">
          <button className="onboarding-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '저장 중…' : '다음'}
          </button>
        </div>
      </form>
    </>
  )
}
