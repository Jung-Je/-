import { useId, useState, type FormEvent } from 'react'
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'
import { changePassword } from '../api/settingsApi'

export function PasswordSettingsForm() {
  const oldPasswordId = useId()
  const newPasswordId = useId()
  const newPasswordConfirmId = useId()
  const errorId = useId()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('새 비밀번호가 일치하지 않습니다.')
      setStatus('error')
      return
    }

    setStatus('submitting')

    try {
      await changePassword({ oldPassword, newPassword, newPasswordConfirm })
      setOldPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      setStatus('success')
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.detail
          : '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      setErrorMessage(detail)
      setStatus('error')
    }
  }

  return (
    <div className="settings-card">
      <div className="settings-card__heading">
        <h2>비밀번호 변경</h2>
      </div>

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <div className="settings-field">
          <label htmlFor={oldPasswordId}>현재 비밀번호</label>
          <input
            id={oldPasswordId}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={oldPassword}
            onChange={(event) => {
              setOldPassword(event.target.value)
              setStatus('idle')
            }}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="settings-form__grid">
          <div className="settings-field">
            <label htmlFor={newPasswordId}>새 비밀번호</label>
            <input
              id={newPasswordId}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value)
                setStatus('idle')
              }}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="settings-field">
            <label htmlFor={newPasswordConfirmId}>새 비밀번호 확인</label>
            <input
              id={newPasswordConfirmId}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              value={newPasswordConfirm}
              onChange={(event) => {
                setNewPasswordConfirm(event.target.value)
                setStatus('idle')
              }}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          비밀번호 표시
          {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </label>

        {status === 'error' && (
          <p className="settings-error" role="alert" id={errorId}>
            <AlertIcon />
            <span>{errorMessage}</span>
          </p>
        )}

        <div className="settings-actions">
          <button className="settings-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon />}
            {isSubmitting ? '변경 중…' : '변경'}
          </button>
          {status === 'success' && <span className="settings-success">변경됐어요</span>}
        </div>
      </form>
    </div>
  )
}
