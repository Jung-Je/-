import { Link } from 'react-router-dom'
import './ComingSoonPage.css'

type ComingSoonPageProps = {
  title: string
  description: string
}

/**
 * 회원가입 / 비밀번호 재설정처럼 이번 빌드 범위 밖의 화면을 위한 자리표시.
 * 죽은 링크로 보이지 않도록, 다음 단계에서 만들 예정임을 정직하게 알린다.
 */
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="coming-soon">
      <div className="coming-soon__card">
        <h2>{title}</h2>
        <p>{description}</p>
        <Link to="/">로그인으로 돌아가기</Link>
      </div>
    </div>
  )
}
