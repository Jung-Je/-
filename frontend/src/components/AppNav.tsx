import { NavLink } from 'react-router-dom'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { useNotificationSummary } from '../lib/useNotificationSummary'
import './AppNav.css'

/**
 * 로그인 이후 화면들(매칭/연결/설정) 사이를 오갈 방법이 URL을 직접 치는
 * 것 말고는 없었다 — 그 자리를 메우는 최소한의 공용 내비게이션.
 *
 * 매칭/연결/메시지 탭의 배지는 각각 "안 본 매칭 결과 수"/"응답 안 한 받은
 * 연결 요청 수"/"안 읽은 메시지 수"를 보여준다 — 전부 이미 있던
 * is_viewed/PENDING/read_at 상태를 그대로 반영하는 것이라, 결과를
 * 펼치거나(매칭) 요청에 응답하면(연결) 스레드를 열면(메시지) 자연히
 * 줄어든다.
 *
 * 스태프 계정에만 "관리자" 탭이 붙는다 — useCurrentUser를 여기서 직접
 * 호출해서 화면마다 prop을 넘길 필요가 없게 했다(이미 로그인 상태에서만
 * 렌더되는 컴포넌트라 /users/me/ 중복 호출은 감수).
 */
export function AppNav() {
  const { unviewed_matching_results, pending_connection_requests, unread_messages } =
    useNotificationSummary()
  const currentUser = useCurrentUser()
  const isStaff = currentUser.status === 'authenticated' && currentUser.user.is_staff

  const links = [
    { to: '/matching', label: '매칭', badge: unviewed_matching_results },
    { to: '/connections', label: '연결', badge: pending_connection_requests },
    { to: '/messages', label: '메시지', badge: unread_messages },
    { to: '/board', label: '게시판', badge: 0 },
    { to: '/settings', label: '설정', badge: 0 },
    ...(isStaff ? [{ to: '/staff/users', label: '관리자', badge: 0 }] : []),
  ]

  return (
    <nav className="app-nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => 'app-nav__link' + (isActive ? ' app-nav__link--active' : '')}
        >
          {link.label}
          {link.badge > 0 && (
            <span className="app-nav__badge" aria-label={`읽지 않은 알림 ${link.badge}개`}>
              {link.badge > 9 ? '9+' : link.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
