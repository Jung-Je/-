import { useState } from 'react'
import { SpinnerIcon } from '../../../components/icons'

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

  async function handleConfirmClick() {
    setSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setSubmitting(false)
      setConfirming(false)
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
        onClick={() => setConfirming(false)}
        disabled={submitting}
      >
        취소
      </button>
    </span>
  )
}
