import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../../../components/icons'
import { isAdultBirthdate, maxAdultBirthDate, MIN_ADULT_AGE } from '../../../lib/age'
import { ApiError } from '../../../lib/apiClient'
import { buildKakaoAuthorizeUrl, isKakaoConfigured, kakaoLoginRedirectUri } from '../../../lib/kakaoAuth'
import { confirmEmailVerification, login, primeCsrf, requestEmailVerification, signup } from '../api/authApi'
import { AuthScreen } from './AuthScreen'

type Status = 'idle' | 'submitting' | 'error'
type EmailPhase = 'unverified' | 'sending' | 'code-sent' | 'confirming' | 'verified'

const RESEND_COOLDOWN_SECONDS = 60

function errorDetail(error: unknown): string {
  return error instanceof ApiError
    ? error.detail
    : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}

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
 *
 * 나이 인증과 별개로, 이메일이 실제 사용 중인 주소인지는 무료로 확인할
 * 수 있어서(사용자 확정) 회원가입 자체를 이메일 인증 완료 후로 막는다 —
 * 이메일 입력 → "인증코드 받기" → 받은 6자리 코드 확인이 끝나야 나머지
 * 필드(닉네임/생년월일/비밀번호)가 나타난다. 서버(UserCreateSerializer.
 * validate)도 인증 안 된 이메일이면 어차피 거부하지만, 여기서 순서를
 * 미리 강제해 헛수고 제출을 막는다. 카카오 가입은 이 인증 절차와
 * 무관 — 카카오 OAuth 자체가 이메일 소유를 이미 보증한다.
 */
export function SignupForm() {
  const navigate = useNavigate()
  const usernameId = useId()
  const emailId = useId()
  const codeId = useId()
  const dateOfBirthId = useId()
  const passwordId = useId()
  const passwordHintId = useId()
  const passwordConfirmId = useId()
  const errorId = useId()
  // 2단계 폼 재구성 중 발견(코드 리뷰) — errorId는 원래 이메일 인증
  // 에러 <p>(emailError가 있을 때만 렌더링)에만 쓰였는데, 아래 필드들도
  // 같은 id를 aria-describedby로 참조하고 있었다. emailPhase가
  // 'verified'가 되면 emailError는 항상 ''라 그 <p>가 안 그려지므로,
  // 회원가입 제출 실패 시(status==='error') 이 필드들의 aria-describedby가
  // DOM에 없는 id를 가리켜 스크린리더가 에러를 못 찾는 회귀였음 — 폼
  // 에러 전용 id를 따로 둬서 분리한다.
  const formErrorId = useId()

  const [email, setEmail] = useState('')
  const [emailPhase, setEmailPhase] = useState<EmailPhase>('unverified')
  const [emailError, setEmailError] = useState('')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'
  const emailLocked = emailPhase !== 'unverified' && emailPhase !== 'sending'

  // 재전송 쿨다운 카운트다운 — 매초 1씩 줄이다 0이 되면 "재전송" 버튼이
  // 다시 눌리게 둔다. 서버도 60초 안에 재요청하면 429로 막지만, 눌러보고야
  // 아는 것보다 버튼 자체를 잠깐 비활성화해두는 게 자연스럽다.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleRequestCode() {
    setEmailError('')
    setEmailPhase('sending')
    try {
      await requestEmailVerification(email)
      setEmailPhase('code-sent')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setEmailError(errorDetail(error))
      setEmailPhase('unverified')
    }
  }

  async function handleResendCode() {
    setEmailError('')
    setCode('')
    try {
      await requestEmailVerification(email)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setEmailError(errorDetail(error))
    }
  }

  async function handleConfirmCode() {
    setEmailError('')
    setEmailPhase('confirming')
    try {
      await confirmEmailVerification(email, code)
      setEmailPhase('verified')
    } catch (error) {
      setEmailError(errorDetail(error))
      setEmailPhase('code-sent')
    }
  }

  function handleChangeEmail() {
    setEmailPhase('unverified')
    setCode('')
    setEmailError('')
    setCooldown(0)
  }

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
      setErrorMessage(errorDetail(error))
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
              // account_email만 요청한다 — 닉네임은 카카오와 무관하게
              // 항상 사이트에서 직접 입력받기로 해서(사용자 확정)
              // profile_nickname 동의항목 자체를 요청하지 않는다. 이메일도
              // 카카오 동의항목 상태에 따라 안 올 수 있어
              // KakaoLoginCallbackScreen이 수동 입력으로 폴백한다.
              window.location.href = buildKakaoAuthorizeUrl({
                redirectUri: kakaoLoginRedirectUri(),
                scope: 'account_email',
              })
            }}
          >
            카카오로 3초 가입하기
          </button>
          <p className="auth-divider">또는</p>
        </>
      )}

      {/* 이메일 인증은 별도 폼으로 분리 — 아직 계정 생성에 쓸 나머지
          필드(닉네임 등)가 안 나온 상태에서 Enter 키가 아래 회원가입
          폼의 submit으로 잘못 이어지는 걸 막기 위함. */}
      <div className="auth-form">
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
              aria-invalid={!!emailError}
              aria-describedby={emailError ? errorId : undefined}
              disabled={emailLocked}
              required
            />
          </div>

          {emailPhase === 'verified' ? (
            <div className="auth-email-verify__row">
              <span className="auth-success__badge">인증 완료</span>
              <button type="button" className="auth-field__link-btn" onClick={handleChangeEmail}>
                다른 이메일 쓰기
              </button>
            </div>
          ) : emailPhase === 'code-sent' || emailPhase === 'confirming' ? (
            <div className="auth-email-verify__row">
              <input
                id={codeId}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6자리 코드"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                disabled={emailPhase === 'confirming'}
                className="auth-email-verify__code-input"
              />
              <button
                type="button"
                className="auth-secondary-btn"
                onClick={handleConfirmCode}
                disabled={emailPhase === 'confirming' || code.length !== 6}
              >
                {emailPhase === 'confirming' ? '확인 중…' : '확인'}
              </button>
              <button
                type="button"
                className="auth-field__link-btn"
                onClick={handleResendCode}
                disabled={cooldown > 0}
              >
                {cooldown > 0 ? `재전송 (${cooldown}초)` : '재전송'}
              </button>
              <button type="button" className="auth-field__link-btn" onClick={handleChangeEmail}>
                다른 이메일 쓰기
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="auth-secondary-btn"
              onClick={handleRequestCode}
              disabled={emailPhase === 'sending' || !email.trim()}
            >
              {emailPhase === 'sending' ? '전송 중…' : '인증코드 받기'}
            </button>
          )}

          {emailError && (
            <p className="auth-field__hint auth-field__hint--error" id={errorId} role="alert">
              {emailError}
            </p>
          )}
          {emailPhase === 'code-sent' && !emailError && (
            <p className="auth-field__hint">이메일로 받은 6자리 코드를 입력해주세요.</p>
          )}
        </div>
      </div>

      {emailPhase === 'verified' && (
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
                aria-describedby={status === 'error' ? formErrorId : undefined}
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
                aria-describedby={status === 'error' ? formErrorId : undefined}
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
                aria-describedby={status === 'error' ? formErrorId : passwordHintId}
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
                aria-describedby={status === 'error' ? formErrorId : undefined}
                disabled={isSubmitting}
                required
                minLength={8}
              />
            </div>
          </div>

          {status === 'error' && (
            <p className="auth-error" id={formErrorId} role="alert">
              <AlertIcon />
              <span>{errorMessage}</span>
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '가입 중…' : '회원가입'}
          </button>
        </form>
      )}

      <div className="auth-links">
        <Link to="/">이미 계정이 있으신가요? 로그인</Link>
      </div>
    </AuthScreen>
  )
}
