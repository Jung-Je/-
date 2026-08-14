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
  // alreadyComplete는 마운트 시점 상태라 "방금 3단계를 막 끝냈는지"와
  // "원래 완성돼 있던 카드를 다시 보러 왔는지"를 구분 못 한다 — 예전엔
  // 두 경우가 완전히 같은 화면으로 떨어져서, 정작 축하해야 할 첫 완성
  // 순간이 재방문자용 상태 화면과 똑같이 밋밋했다.
  const [justCompleted, setJustCompleted] = useState(false)

  const activeIndex = STEPS.findIndex((s) => s.key === step)
  const cardModifier =
    step === 'done'
      ? justCompleted
        ? ' onboarding-card--celebrate'
        : ''
      : ` onboarding-card--${step}`

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
          <InterestsStep
            onNext={() => {
              setJustCompleted(true)
              setStep('done')
            }}
            onBack={() => setStep('personality')}
          />
        )}
        {step === 'done' && (
          <div className={'onboarding-done' + (justCompleted ? ' onboarding-done--celebrate' : '')}>
            <span
              className={
                'onboarding-done__badge' + (justCompleted ? ' onboarding-done__badge--celebrate' : '')
              }
            >
              {justCompleted ? '카드 완성!' : '카드 완성'}
            </span>
            <h2>
              {justCompleted ? '첫 카드가 완성됐어요' : '카드가 완성됐어요'}
            </h2>
            <p>이제 매칭을 시작할 수 있어요. 취향이 비슷한 사람을 찾아드릴게요.</p>
            <Link to="/matching">매칭 시작하기</Link>
          </div>
        )}
      </div>
    </div>
  )
}
