import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ComingSoonPage } from './pages/ComingSoonPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/signup"
        element={
          <ComingSoonPage
            title="회원가입"
            description="내 카드 만들기 온보딩 화면은 다음 단계에서 만듭니다."
          />
        }
      />
      <Route
        path="/reset-password"
        element={
          <ComingSoonPage
            title="비밀번호 재설정"
            description="비밀번호 재설정 화면은 다음 단계에서 만듭니다."
          />
        }
      />
    </Routes>
  )
}

export default App
