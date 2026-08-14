import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../../../components/icons'
import { isAdultBirthdate, maxAdultBirthDate, MIN_ADULT_AGE } from '../../../lib/age'
import { ApiError } from '../../../lib/apiClient'
import { buildKakaoAuthorizeUrl, isKakaoConfigured, kakaoLoginRedirectUri } from '../../../lib/kakaoAuth'
import { login, primeCsrf, signup } from '../api/authApi'
import { AuthScreen } from './AuthScreen'

type Status = 'idle' | 'submitting' | 'error'

/**
 * 회원가입은 계정(닉네임/이메일/비밀번호) + 생년월일만 받는다. 이름·관심사
 * 등 나머지 프로필은 다음 단계인 온보딩("내 카드 만들기")에서 따로 받는다.
 * 가입에 성공하면 같은 자격증명으로 바로 로그인까지 이어서, 사용자가
 * 방금 입력한 비밀번호를 다시 치지 않고 곧장 온보딩으로 넘어가게 한다.
 *
 * 회원가입은 만 19세 이상만 가능 — 원래는 카카오 로그인 age_range
 * 동의항목으로 실제 신원인증을 붙이려 했으나(연동 코드는
 * lib/kakaoAuth.ts·features/auth/components/KakaoCallbackScreen.tsx에
 * 남아있음), 그 동의항목이 "비즈니스 앱" 전환 + 사업자등록번호를 요구해서
 * 이 프로젝트 규모에서는 막힘 — 자기신고 생년월일 + 최소연령 검증으로
 * 전환했다. 진짜 신원 확인은 아니지만(마음만 먹으면 속일 수 있음)
 * 검증이 전혀 없던 것보다는 실질적 방어. 진짜 방어선은 서버
 * (UserCreateSerializer.validate_date_of_birth) — 여기 클라이언트 체크는
 * 빠른 피드백일 뿐.
 */
export function SignupForm() {
  const navigate = useNavigate()
  const usernameId = useId()
  const emailId = useId()
  const dateOfBirthId = useId()
  const passwordId = useId()
  const passwordHintId = useId()
  const passwordConfirmId = useId()
  const errorId = useId()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!isAdultBirthdate(dateOfBirth)) {
      setErrorMessage(`회원가입은 만 ${MIN_ADULT_AGE}세 이상만 가능합니다.`)
      setStatus('error')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      setStatus('error')
      return
    }

    setStatus('submitting')

    try {
      await primeCsrf()
      await signup({ username, email, dateOfBirth, password, passwordConfirm })
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
        <p>닉네임, 이메일, 생년월일, 비밀번호만 있으면 바로 시작할 수 있어요.</p>
      </div>

      {isKakaoConfigured() && (
        <>
          <button
            type="button"
            className="auth-kakao-button"
            onClick={() => {
              // scope 없이 요청 — profile_nickname/account_email까지
              // 요청했더니 그 동의항목들이 카카오 콘솔에서 "설정"되어
              // 있지 않아 인가 요청 자체가 KOE205로 거부되는 걸 실제로
              // 확인했다(age_range와 같은 증상). 콘솔에서 그 항목들을
              // 켜기 전까지는 최소 범위(카카오 식별만)로 요청해야 버튼이
              // 동작한다 — 닉네임/이메일이 없어도
              // KakaoLoginCallbackScreen이 수동 입력으로 안전하게
              // 폴백하므로 기능 자체는 그대로 동작한다. 콘솔에서 두
              // 항목을 켠 뒤에는 scope: 'profile_nickname,account_email'
              // 을 다시 넣어주면 prefill이 살아난다.
              window.location.href = buildKakaoAuthorizeUrl({
                redirectUri: kakaoLoginRedirectUri(),
              })
            }}
          >
            카카오로 3초 가입하기
          </button>
          <p className="auth-divider">또는</p>
        </>
      )}

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
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? errorId : undefined}
              disabled={isSubmitting}
              max={maxAdultBirthDate()}
              required
            />
          </div>
          <p className="auth-field__hint">회원가입은 만 {MIN_ADULT_AGE}세 이상만 가능해요.</p>
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
