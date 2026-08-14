import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { SpinnerIcon } from '../../../components/icons'
import { useCurrentUser } from '../hooks/useCurrentUser'
import type { AuthUser } from '../types'

type RequireStaffProps = {
  children: (user: AuthUser) => ReactNode
}

/**
 * 스태프 전용 화면을 감싸는 가드. RequireAuth와 골격은 같고, 로그인은
 * 했지만 스태프가 아닌 경우를 하나 더 구분한다 — 그 경우 로그인 화면이
 * 아니라 이미 로그인된 자기 홈(/matching)으로 돌려보낸다.
 */
export function RequireStaff({ children }: RequireStaffProps) {
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

  if (!currentUser.user.is_staff) {
    return <Navigate to="/matching" replace />
  }

  return <>{children(currentUser.user)}</>
}
