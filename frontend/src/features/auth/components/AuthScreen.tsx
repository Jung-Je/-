import type { ReactNode } from 'react'
import { CardStackMark } from '../../../components/CardStackMark'
import './AuthScreen.css'

type AuthScreenProps = {
  children: ReactNode
}

/**
 * 로그인/회원가입/비밀번호 재설정처럼 "카드 한 장짜리 폼" 화면들이 공유하는
 * 바깥 크롬(브랜드 헤더 + 카드 컨테이너). 카드 안쪽 내용(폼/성공 상태)은
 * 화면마다 다르므로 children으로 받는다.
 */
export function AuthScreen({ children }: AuthScreenProps) {
  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <CardStackMark />
        <h1>매칭</h1>
      </div>

      <div className="auth-card">{children}</div>
    </div>
  )
}
