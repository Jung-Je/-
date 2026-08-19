import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmButton } from './ConfirmButton'
import { ApiError } from '../../../lib/apiClient'

describe('ConfirmButton', () => {
  it('onConfirm이 실패하면 에러 메시지를 보여주고 확인 상태를 유지한다', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new ApiError(403, '권한이 없습니다.'))
    render(<ConfirmButton label="정지" onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: '정지' }))
    fireEvent.click(screen.getByRole('button', { name: '정말요? 확인' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('권한이 없습니다.'))
    // 실패 시 idle로 되돌리지 않고 재시도할 수 있게 확인/취소 버튼을 유지
    expect(screen.getByRole('button', { name: '정말요? 확인' })).toBeInTheDocument()
  })

  it('onConfirm이 성공하면 idle 상태로 되돌아가고 에러가 없다', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<ConfirmButton label="정지" onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: '정지' }))
    fireEvent.click(screen.getByRole('button', { name: '정말요? 확인' }))

    await waitFor(() => expect(screen.getByRole('button', { name: '정지' })).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
