import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { isAdultBirthdate, maxAdultBirthDate, MIN_ADULT_AGE } from '../../../lib/age'
import { ApiError } from '../../../lib/apiClient'
import { kakaoLoginRedirectUri } from '../../../lib/kakaoAuth'
import { completeKakaoSignup, kakaoLogin } from '../api/authApi'
import { AuthScreen } from './AuthScreen'

// fatal_error: 콜백 진입 자체가 실패(코드 없음, 카카오 API 오류) — 다시
//   시도할 폼이 없으니 로그인 화면으로 돌려보낸다.
// form_error: signup_form에 진입한 뒤 제출이 실패(중복 닉네임/이메일,
//   최소연령 미달 등) — 폼에 남아서 고쳐 다시 제출할 수 있어야 한다.
type Status = 'checking' | 'signup_form' | 'submitting' | 'form_error' | 'fatal_error'

/**
 * 카카오 소셜 로그인/가입 콜백(/auth/kakao/login) — 성인인증 콜백
 * (KakaoCallbackScreen.tsx, 현재 미사용)과는 완전히 별개 화면이다.
 *
 * 인가코드는 1회용이라 두 번 소비하면 실패한다 — React 18 StrictMode가
 * 개발 모드에서 effect를 두 번 실행하는 것까지 감안해 ref로 가드한다.
 * 이미 연결된 계정이면 그대로 로그인까지 끝나서 온보딩으로 넘어가고,
 * 처음 보는 카카오 계정이면 부족한 정보(닉네임은 항상 직접 입력 —
 * 카카오톡 닉네임과 매칭 서비스 닉네임은 성격이 달라 의도적으로 안
 * 가져옴, 카카오가 안 준 이메일, 카카오로는 절대 못 받는 생년월일)만
 * 마저 받는 폼을 보여준다.
 */
export function KakaoLoginCallbackScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code')

  const usernameId = useId()
  const emailId = useId()
  const dateOfBirthId = useId()
  const errorId = useId()

  const [status, setStatus] = useState<Status>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    if (!code) {
      setErrorMessage('카카오 인증 코드가 없습니다.')
      setStatus('fatal_error')
      return
    }

    kakaoLogin(code, kakaoLoginRedirectUri())
      .then((result) => {
        if (result.status === 'logged_in') {
          navigate('/onboarding', { replace: true })
          return
        }
        setEmail(result.suggested_email ?? '')
        setStatus('signup_form')
      })
      .catch((error: unknown) => {
        const detail =
          error instanceof ApiError
            ? error.detail
            : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        setErrorMessage(detail)
        setStatus('fatal_error')
      })
  }, [code, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!isAdultBirthdate(dateOfBirth)) {
      setErrorMessage(`회원가입은 만 ${MIN_ADULT_AGE}세 이상만 가능합니다.`)
      setStatus('form_error')
      return
    }

    setStatus('submitting')

    try {
      await completeKakaoSignup({ username, email, dateOfBirth })
      navigate('/onboarding', { replace: true })
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      setErrorMessage(detail)
      setStatus('form_error')
    }
  }

  if (status === 'checking') {
    return (
      <AuthScreen>
        <div className="auth-success">
          <SpinnerIcon />
          <p>카카오 인증 확인 중…</p>
        </div>
      </AuthScreen>
    )
  }

  if (status === 'fatal_error') {
    return (
      <AuthScreen>
        <div className="auth-card__heading">
          <h2>카카오 로그인 실패</h2>
        </div>
        <p className="auth-error" role="alert">
          <AlertIcon />
          <span>{errorMessage}</span>
        </p>
        <div className="auth-links">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </AuthScreen>
    )
  }

  const isSubmitting = status === 'submitting'
  const hasFormError = status === 'form_error'

  return (
    <AuthScreen>
      <div className="auth-card__heading">
        <h2>가입 완료하기</h2>
        <p>카카오 인증이 끝났어요. 몇 가지만 더 확인할게요.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor={usernameId}>닉네임</label>
          <div className="auth-field__control">
            <input
              id={usernameId}
              name="username"
              type="text"
              autoComplete="username"
              placeholder="바인더에서 쓸 이름"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={hasFormError}
              aria-describedby={hasFormError ? errorId : undefined}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor={emailId}>이메일</label>
          <div className="auth-field__control">
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={hasFormError}
              aria-describedby={hasFormError ? errorId : undefined}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor={dateOfBirthId}>생년월일</label>
          <div className="auth-field__control">
            <input
              id={dateOfBirthId}
              name="date_of_birth"
              type="date"
              autoComplete="bday"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              aria-invalid={hasFormError}
              aria-describedby={hasFormError ? errorId : undefined}
              disabled={isSubmitting}
              max={maxAdultBirthDate()}
              required
            />
          </div>
          <p className="auth-field__hint">회원가입은 만 {MIN_ADULT_AGE}세 이상만 가능해요.</p>
        </div>

        {hasFormError && (
          <p className="auth-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon />}
          {isSubmitting ? '가입 중…' : '가입 완료'}
        </button>
      </form>
    </AuthScreen>
  )
}
