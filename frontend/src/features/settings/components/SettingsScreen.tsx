import { Link } from 'react-router-dom'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { DangerZone } from './DangerZone'
import { PasswordSettingsForm } from './PasswordSettingsForm'
import { ProfileSettingsForm } from './ProfileSettingsForm'
import './SettingsScreen.css'

export function SettingsScreen() {
  return (
    <RequireAuth>
      {(user) => (
        <div className="settings-screen">
          <div className="settings-header">
            <div className="settings-brand">
              <CardStackMark />
              <h1>매칭</h1>
            </div>
            <AppNav />
          </div>

          <div className="settings-content">
            <ProfileSettingsForm user={user} />
            <PasswordSettingsForm />

            <div className="settings-card">
              <div className="settings-card__heading">
                <h2>도움이 필요하신가요?</h2>
                <p>신고·문의·건의를 운영진에게 남길 수 있어요.</p>
              </div>
              <Link to="/support" className="settings-secondary-btn">
                문의하기
              </Link>
            </div>

            <DangerZone userId={user.id} />
          </div>
        </div>
      )}
    </RequireAuth>
  )
}
