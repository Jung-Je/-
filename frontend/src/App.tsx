import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './app/login/page'
import { SignupPage } from './app/signup/page'
import { KakaoCallbackPage } from './app/auth/kakao/callback/page'
import { ResetPasswordPage } from './app/reset-password/page'
import { OnboardingPage } from './app/onboarding/page'
import { MatchingPage } from './app/matching/page'
import { ConnectionsPage } from './app/connections/page'
import { SettingsPage } from './app/settings/page'
import { MessagesPage } from './app/messages/page'
import { MessageThreadPage } from './app/messages/thread/page'
import { StaffUsersPage } from './app/staff/users/page'
import { StaffConnectionsPage } from './app/staff/connections/page'
import { StaffConnectionDetailPage } from './app/staff/connections/detail/page'
import { StaffInterestsPage } from './app/staff/interests/page'
import { StaffMatchingRequestsPage } from './app/staff/matching-requests/page'
import { StaffMatchingRequestDetailPage } from './app/staff/matching-requests/detail/page'
import { NotFoundPage } from './app/not-found/page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      {/* 로그인 화면의 실제 경로는 "/"지만 "/login"으로 들어오는 링크(북마크,
          공유 링크, 습관적인 타이핑)가 흔해서 조용히 죽게 두지 않고 돌려보낸다. */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/matching" element={<MatchingPage />} />
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/:connectionId" element={<MessageThreadPage />} />
      <Route path="/staff/users" element={<StaffUsersPage />} />
      <Route path="/staff/connections" element={<StaffConnectionsPage />} />
      <Route path="/staff/connections/:connectionId" element={<StaffConnectionDetailPage />} />
      <Route path="/staff/interests" element={<StaffInterestsPage />} />
      <Route path="/staff/matching-requests" element={<StaffMatchingRequestsPage />} />
      <Route
        path="/staff/matching-requests/:requestId"
        element={<StaffMatchingRequestDetailPage />}
      />
      {/* 그 외 안 맞는 경로는 전부 여기로 — 예전엔 빈 화면으로 떨어졌음. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
