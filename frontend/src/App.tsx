import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './app/login/page'
import { SignupPage } from './app/signup/page'
import { ResetPasswordPage } from './app/reset-password/page'
import { OnboardingPage } from './app/onboarding/page'
import { MatchingPage } from './app/matching/page'
import { ConnectionsPage } from './app/connections/page'
import { SettingsPage } from './app/settings/page'
import { MessagesPage } from './app/messages/page'
import { MessageThreadPage } from './app/messages/thread/page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/matching" element={<MatchingPage />} />
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/:connectionId" element={<MessageThreadPage />} />
    </Routes>
  )
}

export default App
