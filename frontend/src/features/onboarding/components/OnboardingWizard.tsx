import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
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
 * has_completed_onboarding(한 번이라도 온보딩을 끝냈는지 — 이후 무슨
 * 이유로든 프로필이 다시 미완성이 돼도 안 풀리는 한 방향 래치, 자세한
 * 이유는 apps.users.views.user.UserViewSet.check_profile_completion
 * 참고)이 true면 마법사를 아예 안 태우고 바로 매칭 화면으로 보낸다 —
 * 누락된 항목(관심사 등)은 설정 화면에서 고치면 된다. 로그인 여부
 * 확인은 RequireAuth에 위임.
 */
export function OnboardingWizard() {
  return (
    <RequireAuth>
      {(user) =>
        user.has_completed_onboarding ? (
          <Navigate to="/matching" replace />
        ) : (
          <Wizard userId={user.id} />
        )
      }
    </RequireAuth>
  )
}

function Wizard({ userId }: { userId: number }) {
  // 이 컴포넌트에 도달했다는 것 자체가 "아직 한 번도 온보딩을 끝내지
  // 않았다"는 뜻이라(has_completed_onboarding=false), 'done' 단계는
  // 항상 방금 막 완료한 축하 상태 하나뿐이다 — 예전엔 "이미 완성된
  // 카드를 재방문"과 "방금 완성"을 여기서 구분해야 했지만, 그 구분은
  // 이제 라우팅(has_completed_onboarding)에서 이미 끝난 뒤라 필요 없다.
  const [step, setStep] = useState<Step>('profile')

  const activeIndex = STEPS.findIndex((s) => s.key === step)
  const cardModifier = step === 'done' ? ' onboarding-card--celebrate' : ` onboarding-card--${step}`

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
          <div className="onboarding-done onboarding-done--celebrate">
            <span className="onboarding-done__badge onboarding-done__badge--celebrate">
              카드 완성!
            </span>
            <h2>첫 카드가 완성됐어요</h2>
            <p>이제 매칭을 시작할 수 있어요. 취향이 비슷한 사람을 찾아드릴게요.</p>
            <Link to="/matching">매칭 시작하기</Link>
          </div>
        )}
      </div>
    </div>
  )
}
