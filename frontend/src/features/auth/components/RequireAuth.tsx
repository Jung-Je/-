import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { SpinnerIcon } from '../../../components/icons'
import { useCurrentUser } from '../hooks/useCurrentUser'
import type { AuthUser } from '../types'

type RequireAuthProps = {
  children: (user: AuthUser) => ReactNode
}

/**
 * 로그인이 필요한 화면을 감싸는 가드. 세션 확인 중에는 스피너만 보여주고,
 * 비로그인이면 로그인 화면으로 돌려보낸다. 로그인된 사용자 정보는
 * render-prop으로 넘겨줘 각 화면이 다시 조회하지 않아도 되게 한다.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const currentUser = useCurrentUser()

  if (currentUser.status === 'loading') {
    return (
      <div className="auth-screen">
        <SpinnerIcon />
      </div>
    )
  }

  if (currentUser.status === 'anonymous') {
    return <Navigate to="/" replace />
  }

  return <>{children(currentUser.user)}</>
}
