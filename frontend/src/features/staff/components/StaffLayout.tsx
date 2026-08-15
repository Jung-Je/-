import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './StaffLayout.css'

const TABS = [
  { to: '/staff/users', label: '유저 관리' },
  { to: '/staff/connections', label: '연결·메시지 관리' },
  { to: '/staff/interests', label: '관심사 관리' },
  { to: '/staff/matching-requests', label: '매칭 현황' },
  { to: '/staff/inquiries', label: '문의/신고' },
]

type Props = { children: ReactNode }

/**
 * 스태프 화면 전용 셸 — 소비자용 AppNav(코랄 필 탭, 워드마크)는 안 쓴다.
 * DESIGN.md의 "조용한 화면" 규칙상 관리자 화면이 이 앱에서 가장 조용해야
 * 한다: 플랫한 표면, 활성 탭 밑줄에만 코랄.
 */
export function StaffLayout({ children }: Props) {
  const location = useLocation()

  return (
    <div className="staff-screen">
      <div className="staff-header">
        <div className="staff-header__top">
          <h1>관리자</h1>
          <Link to="/matching" className="staff-header__back">
            서비스로 돌아가기
          </Link>
        </div>
        <nav className="staff-tabs">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={
                'staff-tabs__link' +
                (location.pathname.startsWith(tab.to) ? ' staff-tabs__link--active' : '')
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="staff-content">{children}</div>
    </div>
  )
}
