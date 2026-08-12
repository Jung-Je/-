import { Link } from 'react-router-dom'
import { AuthScreen } from '../../features/auth/components/AuthScreen'

/**
 * 안 맞는 경로(오타 URL, 오래된 북마크·공유 링크)로 들어왔을 때 보여주는
 * 화면. 이전엔 캐치올 라우트가 없어서 완전히 빈 화면(펄 그레이 배경만)으로
 * 떨어졌다 — 돌아갈 수단이 전혀 없는 진짜 막다른 길이었음.
 */
export function NotFoundPage() {
  return (
    <AuthScreen>
      <div className="auth-card__heading">
        <h2>페이지를 찾을 수 없어요</h2>
        <p>주소가 바뀌었거나, 잘못된 링크로 들어오신 것 같아요.</p>
      </div>

      <Link className="auth-submit" to="/">
        처음 화면으로
      </Link>
    </AuthScreen>
  )
}
