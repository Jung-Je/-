import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CardStackMark } from '../components/CardStackMark'
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../components/icons'
import { ApiError } from '../api/client'
import { login, primeCsrf, type AuthUser } from '../api/auth'
import './LoginPage.css'

type Status = 'idle' | 'submitting' | 'error' | 'success'

export function LoginPage() {
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await primeCsrf()
      const loggedInUser = await login(email, password)
      setUser(loggedInUser)
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
    <div className="login-screen">
      <div className="login-brand">
        <CardStackMark />
        <h1>매칭</h1>
      </div>

      <div className="login-card">
        {status === 'success' && user ? (
          <div className="login-success">
            <span className="login-success__badge">로그인 완료</span>
            <h2>{user.username}님, 다시 오셨네요</h2>
            <p>
              바인더 화면은 다음 단계에서 이어서 만듭니다. 지금은 로그인 계약이
              정상 동작하는 것까지 확인된 상태예요.
            </p>
          </div>
        ) : (
          <>
            <div className="login-card__heading">
              <h2>로그인</h2>
              <p>바인더로 돌아가려면 이메일과 비밀번호를 입력하세요.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor={emailId}>이메일</label>
                <div className="login-field__control">
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

              <div className="login-field login-field--password">
                <label htmlFor={passwordId}>비밀번호</label>
                <div className="login-field__control">
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
                <p className="login-error" role="alert" id={errorId}>
                  <AlertIcon />
                  <span>{errorMessage}</span>
                </p>
              )}

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting && <SpinnerIcon />}
                {isSubmitting ? '로그인 중…' : '로그인'}
              </button>

              <div className="login-links">
                <Link to="/reset-password">비밀번호를 잊으셨나요?</Link>
                <Link to="/signup">계정이 없으신가요? 회원가입</Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}