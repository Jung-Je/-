import { useEffect, useState } from 'react'
import { getCurrentUser } from '../api/authApi'
import type { AuthUser } from '../types'

type CurrentUserState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'anonymous' }

/**
 * 세션 쿠키만으로는 브라우저가 로그인 여부를 알 수 없어서, 마운트 시
 * GET /api/v1/users/users/me/ 로 실제 로그인 상태를 확인한다.
 * 실패 사유(비로그인 403, 네트워크 오류 등)를 구분하지 않고 모두
 * "비로그인"으로 취급한다 — 어차피 취할 조치는 로그인 화면으로
 * 돌려보내는 것 하나뿐이라, 구분해도 화면이 달라지지 않는다.
 */
export function useCurrentUser(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    getCurrentUser()
      .then((user) => {
        if (!cancelled) setState({ status: 'authenticated', user })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'anonymous' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
