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
            <DangerZone userId={user.id} />
          </div>
        </div>
      )}
    </RequireAuth>
  )
}
