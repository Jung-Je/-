import { useState } from 'react'
import { AlertIcon, SpinnerIcon } from '../../../components/icons'
import { ApiError } from '../../../lib/apiClient'

type Props = {
  label: string
  confirmLabel?: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  onConfirm: () => Promise<void> | void
}

/**
 * 스태프 화면의 정지/해제/메시지 삭제/상태 변경 같은 되돌릴 수 있는(또는
 * 자주 쓰는) 액션용 2클릭 확인 버튼. 설정 화면 DangerZone의 타이핑 확인은
 * 드물고 치명적인 본인 계정 탈퇴용이라 여기엔 과함 — 1차 클릭에서
 * "정말요? 확인"으로 라벨이 바뀌고, 2차 클릭에서 실제로 실행한다.
 * 새 의존성 없이 로컬 state만으로 구현.
 *
 * onConfirm 실패 처리(코드 리뷰로 발견) — 예전엔 try/finally만 있고
 * catch가 없어서 액션이 실패해도(403/네트워크 오류 등) 버튼이 조용히
 * idle 상태로 되돌아가기만 하고 아무 피드백이 없었다. 이 컴포넌트가
 * 스태프 화면 6곳(정지·삭제·상태 변경 등 거의 모든 파괴적 액션)에서
 * 재사용되므로 여기 한 곳에서 잡아서 인라인 에러로 보여준다 — 호출부
 * 각각에 에러 상태를 중복 구현하지 않아도 됨. 실패 시엔 idle로 안
 * 되돌리고 확인/취소 버튼과 에러 메시지를 같이 보여줘서 바로 재시도할
 * 수 있게 한다.
 */
export function ConfirmButton({
  label,
  confirmLabel = '정말요? 확인',
  variant = 'default',
  disabled = false,
  onConfirm,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmClick() {
    setSubmitting(true)
    setError('')
    try {
      await onConfirm()
      setConfirming(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : '요청을 처리하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className={`staff-confirm-btn staff-confirm-btn--${variant}`}
        onClick={() => setConfirming(true)}
        disabled={disabled}
      >
        {label}
      </button>
    )
  }

  return (
    <span className="staff-confirm-wrap">
      <span className="staff-confirm-group">
        <button
          type="button"
          className={`staff-confirm-btn staff-confirm-btn--${variant}`}
          onClick={handleConfirmClick}
          disabled={submitting}
        >
          {submitting && <SpinnerIcon size={14} />}
          {submitting ? '처리 중…' : confirmLabel}
        </button>
        <button
          type="button"
          className="staff-confirm-cancel"
          onClick={() => {
            setConfirming(false)
            setError('')
          }}
          disabled={submitting}
        >
          취소
        </button>
      </span>
      {error && (
        <span className="staff-confirm-error" role="alert">
          <AlertIcon size={12} />
          {error}
        </span>
      )}
    </span>
  )
}
