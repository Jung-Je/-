import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ComingSoonPage } from './pages/ComingSoonPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
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
