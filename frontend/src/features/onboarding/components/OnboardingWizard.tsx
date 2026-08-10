import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CardStackMark } from '../../../components/CardStackMark'
import { RequireAuth } from '../../auth/components/RequireAuth'
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
 * 이미 카드가 완성된 사용자라면 마법사를 다시 태우지 않고 바로 완료
 * 화면을 보여준다. 로그인 여부 확인은 RequireAuth에 위임.
 */
export function OnboardingWizard() {
  return (
    <RequireAuth>
      {(user) => <Wizard userId={user.id} alreadyComplete={user.is_profile_complete} />}
    </RequireAuth>
  )
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
            <p>이제 매칭을 시작할 수 있어요. 취향이 비슷한 사람을 찾아드릴게요.</p>
            <Link to="/matching">매칭 시작하기</Link>
          </div>
        )}
      </div>
    </div>
  )
}
