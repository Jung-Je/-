import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './app/login/page'
import { SignupPage } from './app/signup/page'
import { ResetPasswordPage } from './app/reset-password/page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  )
}

export default App
