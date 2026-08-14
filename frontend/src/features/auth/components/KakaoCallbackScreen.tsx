import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { kakaoRedirectUri } from '../../../lib/kakaoAuth'
import { verifyKakaoAdult } from '../api/authApi'
import { AuthScreen } from './AuthScreen'

type Status = 'checking' | 'error'

/**
 * 카카오 동의 화면에서 돌아오는 콜백 라우트(/auth/kakao/callback).
 * 인가코드는 1회용이라 두 번 소비하면 두 번째 호출이 실패한다 — React 18
 * StrictMode가 개발 모드에서 effect를 두 번 실행하는 것까지 감안해서
 * ref로 가드해둔다. 성공하면 회원가입 화면으로 돌아가고, 그 화면이
 * GET /api/v1/auth/kakao/verify/로 세션 상태를 다시 확인해 폼을 연다.
 */
export function KakaoCallbackScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code')

  const [status, setStatus] = useState<Status>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    if (!code) {
      setErrorMessage('카카오 인증 코드가 없습니다.')
      setStatus('error')
      return
    }

    verifyKakaoAdult(code, kakaoRedirectUri())
      .then(() => {
        navigate('/signup', { replace: true })
      })
      .catch((error: unknown) => {
        const detail =
          error instanceof ApiError
            ? error.detail
            : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        setErrorMessage(detail)
        setStatus('error')
      })
  }, [code, navigate])

  if (status === 'error') {
    return (
      <AuthScreen>
        <div className="auth-card__heading">
          <h2>성인인증 실패</h2>
        </div>
        <p className="auth-error" role="alert">
          <AlertIcon />
          <span>{errorMessage}</span>
        </p>
        <div className="auth-links">
          <Link to="/signup">회원가입으로 돌아가기</Link>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <div className="auth-success">
        <SpinnerIcon />
        <p>카카오 인증 확인 중…</p>
      </div>
    </AuthScreen>
  )
}
