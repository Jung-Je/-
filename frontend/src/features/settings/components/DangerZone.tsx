import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertIcon } from '../../../components/icons'
import { logout } from '../../auth/api/authApi'
import { ApiError } from '../../../lib/apiClient'
import { deleteAccount } from '../api/settingsApi'

const DELETE_CONFIRM_WORD = '탈퇴'

type Props = {
  userId: number
}

export function DangerZone({ userId }: Props) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function handleDelete() {
    setStatus('submitting')
    setErrorMessage('')

    try {
      await deleteAccount(userId)
      navigate('/', { replace: true })
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
    <div className="settings-card settings-card--danger">
      <div className="settings-card__heading">
        <h2>계정</h2>
      </div>

      <button type="button" className="settings-secondary-btn" onClick={handleLogout}>
        로그아웃
      </button>

      {!confirming ? (
        <button type="button" className="settings-danger-btn" onClick={() => setConfirming(true)}>
          회원 탈퇴
        </button>
      ) : (
        <div className="settings-delete-confirm">
          <p>
            탈퇴하면 프로필, 매칭 결과, 연결 기록이 모두 사라지고 되돌릴 수 없어요. 계속하려면
            아래에 "{DELETE_CONFIRM_WORD}"를 입력하세요.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={DELETE_CONFIRM_WORD}
            disabled={status === 'submitting'}
          />
          {status === 'error' && (
            <p className="settings-error" role="alert">
              <AlertIcon />
              <span>{errorMessage}</span>
            </p>
          )}
          <div className="settings-delete-confirm__actions">
            <button
              type="button"
              className="settings-secondary-btn"
              onClick={() => {
                setConfirming(false)
                setConfirmText('')
                setStatus('idle')
              }}
              disabled={status === 'submitting'}
            >
              취소
            </button>
            <button
              type="button"
              className="settings-danger-btn"
              onClick={handleDelete}
              disabled={confirmText !== DELETE_CONFIRM_WORD || status === 'submitting'}
            >
              {status === 'submitting' ? '탈퇴하는 중…' : '탈퇴하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
