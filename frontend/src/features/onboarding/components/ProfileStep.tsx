import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { checkProfileCompletion, updateProfile } from '../api/onboardingApi'
import { GENDER_OPTIONS, type Gender } from '../types'

type Props = {
  userId: number
  // 가입 시(회원가입 또는 카카오 가입 완료 폼) 이미 받아 검증까지 끝난
  // 값 — 여기서 다시 입력받지 않고 확인용으로만 보여준다. null이면
  // (이론상 있으면 안 되지만) 아예 숨긴다.
  dateOfBirth: string | null
  onNext: () => void
  onBack: () => void
}

export function ProfileStep({ userId, dateOfBirth, onNext, onBack }: Props) {
  const genderId = useId()
  const dateOfBirthId = useId()
  const locationId = useId()
  const bioId = useId()
  const errorId = useId()

  const [gender, setGender] = useState<Gender | ''>('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // <form noValidate>라 required 속성만으로는 실제로 막히지 않는다
    // (커스텀 에러 UI를 쓰려고 브라우저 기본 검증 팝업은 꺼둔 상태) —
    // 성별은 매칭에 반드시 필요한 값이라 직접 막는다. 생년월일은 가입
    // 시 이미 확정됐으니 여기선 체크할 게 없다.
    if (!gender) {
      setErrorMessage('성별은 필수로 선택해야 해요.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      // date_of_birth는 안 보낸다 — 가입 시 검증한 값을 여기서 다시
      // 입력받아 덮어쓸 수 있게 하면, 다른(그러나 여전히 성인인) 값으로
      // 조용히 바꿔서 가입 시 검증을 무의미하게 만들 수 있었다(백엔드도
      // UserUpdateSerializer에서 이 필드를 read_only로 잠가뒀지만,
      // 애초에 프론트에서 입력받지 않는 게 더 명확하다).
      await updateProfile(userId, { gender, location, bio })
      // 온보딩 마지막 단계라, 서버의 is_profile_complete를 여기서
      // 갱신해줘야 이후 "카드가 이미 완성됐다" 판단이 맞는다.
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

        {dateOfBirth && (
          <div className="onboarding-field">
            <label htmlFor={dateOfBirthId}>생년월일</label>
            {/* 가입 시 이미 검증받은 값을 보여주기만 한다 — 여기서 다시
                입력받으면 가입 때와 다른 값으로 바꿔서 검증을 무의미하게
                만들 수 있다(백엔드도 read_only로 잠가둠). */}
            <input id={dateOfBirthId} type="date" value={dateOfBirth} disabled readOnly />
            <span className="onboarding-field__hint">가입할 때 입력한 값이라 수정할 수 없어요.</span>
          </div>
        )}

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
          <button type="button" className="onboarding-back" onClick={onBack} disabled={isSubmitting}>
            이전
          </button>
          <button className="onboarding-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '저장 중…' : '완료'}
          </button>
        </div>
      </form>
    </>
  )
}
