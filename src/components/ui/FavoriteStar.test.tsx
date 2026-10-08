import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { FavoriteStar, MustRememberMark } from './FavoriteStar'

function Toggle(props: { initial: boolean; label?: string }) {
  const [on, setOn] = useState(props.initial)
  return <FavoriteStar active={on} onToggle={() => setOn(!on)} label={props.label} />
}

const ribbonOf = (el: HTMLElement) => el.querySelector('svg') as SVGElement

describe('FavoriteStar (Must Remember ribbon, design v1.2)', () => {
  it('R1 off: an outline ribbon, aria-pressed false, no garnet and no drop', () => {
    render(<Toggle initial={false} />)
    const button = screen.getByRole('button', { name: 'Must Remember' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    const svg = ribbonOf(button)
    expect(svg).toHaveAttribute('data-ribbon', 'off')
    expect(svg).toHaveClass('fill-transparent')
    expect(svg).not.toHaveClass('fill-garnet')
    expect(svg).not.toHaveClass('animate-ribbon')
  })

  it('R2 marking it fills the ribbon garnet (gilt edge at night) and plays the 2px drop once', () => {
    render(<Toggle initial={false} label="Must Remember" />)
    const button = screen.getByRole('button', { name: 'Must Remember' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    const svg = ribbonOf(button)
    expect(svg).toHaveAttribute('data-ribbon', 'on')
    expect(svg).toHaveClass('fill-garnet', 'text-garnet', 'dark:text-gold', 'animate-ribbon')
    expect(svg).not.toHaveClass('text-gold')

    // Unmarked: back to the outline, the drop class is removed so the next mark plays it again.
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(ribbonOf(button)).not.toHaveClass('animate-ribbon')
    fireEvent.click(button)
    expect(ribbonOf(button)).toHaveClass('animate-ribbon')
  })

  it('R3 a ribbon that is already on when it mounts does not drop', () => {
    render(<Toggle initial={true} />)
    const svg = ribbonOf(screen.getByRole('button', { name: 'Must Remember' }))
    expect(svg).toHaveClass('fill-garnet')
    expect(svg).not.toHaveClass('animate-ribbon')
  })

  it('R4 static marks are garnet ribbons with the words "Must Remember"', () => {
    render(
      <>
        <FavoriteStar active />
        <FavoriteStar active={false} />
        <MustRememberMark />
      </>,
    )
    const img = screen.getByRole('img', { name: 'Must Remember' })
    expect(ribbonOf(img)).toHaveClass('fill-garnet', 'text-garnet', 'dark:text-gold')
    expect(screen.getAllByRole('img')).toHaveLength(1)
    const mark = screen.getByText('Must Remember')
    expect(ribbonOf(mark)).toHaveClass('fill-garnet')
  })
})
