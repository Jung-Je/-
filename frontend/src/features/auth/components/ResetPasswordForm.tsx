import { useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { confirmPasswordReset, requestPasswordReset } from '../api/authApi'
import { AuthScreen } from './AuthScreen'

type Status = 'idle' | 'submitting' | 'error' | 'success'

/**
 * 이메일로 오는 재설정 링크(FRONTEND_URL/reset-password?uid=&token=)가 이
 * 화면 하나를 그대로 가리키므로, uid/token 쿼리 파라미터 유무로 "이메일
 * 요청" 단계와 "새 비밀번호 설정" 단계를 한 컴포넌트에서 나눠 그린다.
 */
export function ResetPasswordForm() {
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')

  if (uid && token) {
    return <ConfirmStep uid={uid} token={token} />
  }
  return <RequestStep />
}

function RequestStep() {
  const emailId = useId()
  const errorId = useId()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await requestPasswordReset(email)
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

  if (status === 'success') {
    return (
      <AuthScreen>
        <div className="auth-success">
          <span className="auth-success__badge">메일 발송</span>
          <h2>이메일을 확인해 주세요</h2>
          <p>등록된 이메일이라면 비밀번호 재설정 안내 메일이 발송되었어요.</p>
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <div className="auth-card__heading">
        <h2>비밀번호 재설정</h2>
        <p>가입한 이메일을 입력하면 재설정 링크를 보내드려요.</p>
      </div>

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

        {status === 'error' && (
          <p className="auth-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon />}
          {isSubmitting ? '보내는 중…' : '재설정 링크 보내기'}
        </button>

        <div className="auth-links">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </form>
    </AuthScreen>
  )
}

function ConfirmStep({ uid, token }: { uid: string; token: string }) {
  const passwordId = useId()
  const passwordHintId = useId()
  const passwordConfirmId = useId()
  const errorId = useId()

  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      setStatus('error')
      return
    }

    setStatus('submitting')

    try {
      await confirmPasswordReset({ uid, token, newPassword, newPasswordConfirm })
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

  if (status === 'success') {
    return (
      <AuthScreen>
        <div className="auth-success">
          <span className="auth-success__badge">변경 완료</span>
          <h2>비밀번호가 바뀌었어요</h2>
          <p>새 비밀번호로 다시 로그인해 주세요.</p>
          <Link to="/">로그인하기</Link>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <div className="auth-card__heading">
        <h2>새 비밀번호 설정</h2>
        <p>계정에 사용할 새 비밀번호를 입력하세요.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field auth-field--password">
          <label htmlFor={passwordId}>새 비밀번호</label>
          <div className="auth-field__control">
            <input
              id={passwordId}
              name="new_password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="영문·숫자·특수문자 포함 8자 이상"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
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
          <label htmlFor={passwordConfirmId}>새 비밀번호 확인</label>
          <div className="auth-field__control">
            <input
              id={passwordConfirmId}
              name="new_password_confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="비밀번호를 한 번 더 입력하세요"
              value={newPasswordConfirm}
              onChange={(event) => setNewPasswordConfirm(event.target.value)}
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
          {isSubmitting ? '변경 중…' : '비밀번호 변경'}
        </button>

        <div className="auth-links">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </form>
    </AuthScreen>
  )
}
