import { NavLink } from 'react-router-dom'
import './AppNav.css'

const LINKS = [
  { to: '/matching', label: '매칭' },
  { to: '/connections', label: '연결' },
  { to: '/settings', label: '설정' },
]

/**
 * 로그인 이후 화면들(매칭/연결/설정) 사이를 오갈 방법이 URL을 직접 치는
 * 것 말고는 없었다 — 그 자리를 메우는 최소한의 공용 내비게이션.
 */
export function AppNav() {
  return (
    <nav className="app-nav">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => 'app-nav__link' + (isActive ? ' app-nav__link--active' : '')}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
