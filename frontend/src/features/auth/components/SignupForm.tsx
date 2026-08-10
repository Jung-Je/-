import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { login, primeCsrf, signup } from '../api/authApi'
import { AuthScreen } from './AuthScreen'

type Status = 'idle' | 'submitting' | 'error'

/**
 * 회원가입은 계정(닉네임/이메일/비밀번호)만 만든다. 이름·관심사·성격 같은
 * 프로필 정보는 다음 단계인 온보딩("내 카드 만들기")에서 따로 받는다 —
 * 백엔드 UserCreateSerializer가 요구하는 필드도 딱 이만큼뿐이다.
 * 가입에 성공하면 같은 자격증명으로 바로 로그인까지 이어서, 사용자가
 * 방금 입력한 비밀번호를 다시 치지 않고 곧장 온보딩으로 넘어가게 한다.
 */
export function SignupForm() {
  const navigate = useNavigate()
  const usernameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const passwordHintId = useId()
  const passwordConfirmId = useId()
  const errorId = useId()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      setStatus('error')
      return
    }

    setStatus('submitting')

    try {
      await primeCsrf()
      await signup({ username, email, password, passwordConfirm })
      await login(email, password)
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
        <h2>회원가입</h2>
        <p>닉네임, 이메일, 비밀번호만 있으면 바로 시작할 수 있어요.</p>
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
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? errorId : undefined}
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
              autoComplete="new-password"
              placeholder="영문·숫자·특수문자 포함 8자 이상"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? errorId : passwordHintId}
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
          <p className="auth-field__hint" id={passwordHintId}>
            영문, 숫자, 특수문자를 모두 포함해 8자 이상으로 만들어주세요.
          </p>
        </div>

        <div className="auth-field">
          <label htmlFor={passwordConfirmId}>비밀번호 확인</label>
          <div className="auth-field__control">
            <input
              id={passwordConfirmId}
              name="password_confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="비밀번호를 한 번 더 입력하세요"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? errorId : undefined}
              disabled={isSubmitting}
              required
              minLength={8}
            />
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
          {isSubmitting ? '가입 중…' : '회원가입'}
        </button>

        <div className="auth-links">
          <Link to="/">이미 계정이 있으신가요? 로그인</Link>
        </div>
      </form>
    </AuthScreen>
  )
}
