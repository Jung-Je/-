import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CardStackMark } from '../../../components/CardStackMark'
import { SpinnerIcon } from '../../../components/icons'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'
import { InterestsStep } from './InterestsStep'
import { PersonalityStep } from './PersonalityStep'
import { ProfileStep } from './ProfileStep'
import './OnboardingWizard.css'

type Step = 'profile' | 'personality' | 'interests' | 'done'

const STEPS: { key: Step; label: string }[] = [
  { key: 'profile', label: '프로필' },
  { key: 'personality', label: '성격' },
  { key: 'interests', label: '관심사' },
]

/**
 * 로그인 세션이 있는지부터 확인한 뒤(비로그인이면 로그인 화면으로),
 * 이미 카드가 완성된 사용자라면 마법사를 다시 태우지 않고 바로 완료
 * 화면을 보여준다.
 */
export function OnboardingWizard() {
  const currentUser = useCurrentUser()

  if (currentUser.status === 'loading') {
    return (
      <div className="onboarding-screen">
        <SpinnerIcon />
      </div>
    )
  }

  if (currentUser.status === 'anonymous') {
    return <Navigate to="/" replace />
  }

  return <Wizard userId={currentUser.user.id} alreadyComplete={currentUser.user.is_profile_complete} />
}

function Wizard({ userId, alreadyComplete }: { userId: number; alreadyComplete: boolean }) {
  const [step, setStep] = useState<Step>(alreadyComplete ? 'done' : 'profile')

  const activeIndex = STEPS.findIndex((s) => s.key === step)
  const cardModifier = step === 'done' ? '' : ` onboarding-card--${step}`

  return (
    <div className="onboarding-screen">
      <div className="onboarding-brand">
        <CardStackMark />
        <h1>매칭</h1>
      </div>

      {step !== 'done' && (
        <ol className="onboarding-progress">
          {STEPS.map((s, index) => (
            <li key={s.key} className="onboarding-progress__item">
              {index > 0 && <span className="onboarding-progress__rule" aria-hidden="true" />}
              <span
                className={
                  'onboarding-progress__step' +
                  (index < activeIndex
                    ? ' onboarding-progress__step--done'
                    : index === activeIndex
                      ? ' onboarding-progress__step--active'
                      : '')
                }
              >
                <span className="onboarding-progress__dot">
                  {index < activeIndex ? '✓' : index + 1}
                </span>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className={`onboarding-card${cardModifier}`}>
        {step === 'profile' && (
          <ProfileStep userId={userId} onNext={() => setStep('personality')} />
        )}
        {step === 'personality' && (
          <PersonalityStep onNext={() => setStep('interests')} onBack={() => setStep('profile')} />
        )}
        {step === 'interests' && (
          <InterestsStep onNext={() => setStep('done')} onBack={() => setStep('personality')} />
        )}
        {step === 'done' && (
          <div className="onboarding-done">
            <span className="onboarding-done__badge">카드 완성</span>
            <h2>카드가 완성됐어요</h2>
            <p>
              매칭 요청·결과 화면은 다음 단계에서 이어서 만듭니다. 지금은 온보딩 계약이 정상
              동작하는 것까지 확인된 상태예요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
