import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import type { AuthUser } from '../../auth/types'
import { ApiError } from '../../../lib/apiClient'
import { updateProfile } from '../api/settingsApi'
import { GENDER_OPTIONS, type Gender } from '../types'

type Props = {
  user: AuthUser
}

export function ProfileSettingsForm({ user }: Props) {
  const firstNameId = useId()
  const lastNameId = useId()
  const genderId = useId()
  const dateOfBirthId = useId()
  const locationId = useId()
  const bioId = useId()
  const activeId = useId()
  const errorId = useId()

  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const [gender, setGender] = useState<Gender | ''>(user.gender ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(user.date_of_birth ?? '')
  const [location, setLocation] = useState(user.location)
  const [bio, setBio] = useState(user.bio)
  const [isActiveForMatching, setIsActiveForMatching] = useState(user.is_active_for_matching)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await updateProfile(user.id, {
        firstName,
        lastName,
        gender,
        dateOfBirth,
        location,
        bio,
        isActiveForMatching,
      })
      setStatus('success')
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
    <div className="settings-card">
      <div className="settings-card__heading">
        <h2>프로필</h2>
        <p>매칭 상대에게 보이는 정보예요.</p>
      </div>

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <div className="settings-form__grid">
          <div className="settings-field">
            <label htmlFor={lastNameId}>성</label>
            <input
              id={lastNameId}
              type="text"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value)
                setStatus('idle')
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="settings-field">
            <label htmlFor={firstNameId}>이름</label>
            <input
              id={firstNameId}
              type="text"
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value)
                setStatus('idle')
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="settings-field">
            <label htmlFor={genderId}>성별</label>
            <select
              id={genderId}
              value={gender}
              onChange={(event) => {
                setGender(event.target.value as Gender)
                setStatus('idle')
              }}
              disabled={isSubmitting}
            >
              <option value="">선택 안함</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor={dateOfBirthId}>생년월일</label>
            <input
              id={dateOfBirthId}
              type="date"
              value={dateOfBirth}
              onChange={(event) => {
                setDateOfBirth(event.target.value)
                setStatus('idle')
              }}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="settings-field">
          <label htmlFor={locationId}>지역</label>
          <input
            id={locationId}
            type="text"
            placeholder="예: 서울"
            value={location}
            onChange={(event) => {
              setLocation(event.target.value)
              setStatus('idle')
            }}
            disabled={isSubmitting}
          />
        </div>

        <div className="settings-field">
          <label htmlFor={bioId}>자기소개</label>
          <textarea
            id={bioId}
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(event) => {
              setBio(event.target.value)
              setStatus('idle')
            }}
            disabled={isSubmitting}
          />
        </div>

        <label className="settings-checkbox" htmlFor={activeId}>
          <input
            id={activeId}
            type="checkbox"
            checked={isActiveForMatching}
            onChange={(event) => {
              setIsActiveForMatching(event.target.checked)
              setStatus('idle')
            }}
            disabled={isSubmitting}
          />
          매칭 후보로 노출되기
        </label>

        {status === 'error' && (
          <p className="settings-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <div className="settings-actions">
          <button className="settings-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '저장 중…' : '저장'}
          </button>
          {status === 'success' && <span className="settings-success">저장됐어요</span>}
        </div>
      </form>
    </div>
  )
}
