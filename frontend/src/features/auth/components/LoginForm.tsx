import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { buildKakaoAuthorizeUrl, isKakaoConfigured, kakaoLoginRedirectUri } from '../../../lib/kakaoAuth'
import { login, primeCsrf } from '../api/authApi'
import { AuthScreen } from './AuthScreen'

type Status = 'idle' | 'submitting' | 'error'

export function LoginForm() {
  const navigate = useNavigate()
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await primeCsrf()
      await login(email, password)
      // 카드(프로필/관심사/성격)가 이미 완성된 사용자인지는 온보딩 화면
      // 자신이 판단한다 — 완성돼 있으면 거기서 바로 안내하고 끝낸다.
      navigate('/onboarding', { replace: true })
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
    <AuthScreen>
      <div className="auth-card__heading">
        <h2>로그인</h2>
        <p>바인더로 돌아가려면 이메일과 비밀번호를 입력하세요.</p>
      </div>

      {isKakaoConfigured() && (
        <>
          <button
            type="button"
            className="auth-kakao-button"
            onClick={() => {
              // scope 없이 요청하는 이유는 SignupForm.tsx의 같은 버튼
              // 주석 참고 — profile_nickname/account_email이 카카오
              // 콘솔에서 아직 설정 안 돼 있으면 인가 요청 자체가
              // KOE205로 거부된다.
              window.location.href = buildKakaoAuthorizeUrl({
                redirectUri: kakaoLoginRedirectUri(),
              })
            }}
          >
            카카오로 계속하기
          </button>
          <p className="auth-divider">또는</p>
        </>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? errorId : undefined}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <div className="auth-field auth-field--password">
          <label htmlFor={passwordId}>비밀번호</label>
          <div className="auth-field__control">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? errorId : undefined}
              disabled={isSubmitting}
              required
              minLength={8}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {status === 'error' && (
          <p className="auth-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon />}
          {isSubmitting ? '로그인 중…' : '로그인'}
        </button>

        <div className="auth-links">
          <Link to="/reset-password">비밀번호를 잊으셨나요?</Link>
          <Link to="/signup">계정이 없으신가요? 회원가입</Link>
        </div>
      </form>
    </AuthScreen>
  )
}
