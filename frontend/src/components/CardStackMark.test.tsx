import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardStackMark } from './CardStackMark'

describe('CardStackMark', () => {
  it('접근성 라벨과 함께 렌더링된다', () => {
    render(<CardStackMark />)

    expect(screen.getByRole('img', { name: '매칭 카드 스택 로고' })).toBeInTheDocument()
  })

  it('size prop으로 크기를 조절할 수 있다', () => {
    render(<CardStackMark size={64} />)

    const svg = screen.getByRole('img', { name: '매칭 카드 스택 로고' })
    expect(svg).toHaveAttribute('width', '64')
    expect(svg).toHaveAttribute('height', '64')
  })
})
