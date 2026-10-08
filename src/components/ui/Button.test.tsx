import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Button, ButtonLink, buttonClass } from './Button'

const classes = (el: Element) => Array.from(el.classList)

describe('Button (design v1.2)', () => {
  it('B1 primary uses the indigo-fill token with cream text, never bg-indigo', () => {
    render(<Button variant="primary">Begin Review</Button>)
    const button = screen.getByRole('button', { name: 'Begin Review' })
    expect(button).toHaveClass('bg-indigo-fill', 'text-on-accent')
    // In dark mode indigo is a light link color: cream text on it would be unreadable.
    expect(classes(button).filter((c) => /^(hover:|active:)?bg-indigo(\/|$)/.test(c))).toEqual([])
  })

  it('B2 primary has the gilt hairline 3px inside the edge and no outer shadow', () => {
    render(<Button variant="primary">Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveClass('relative', 'before:inset-[3px]', 'before:border', 'before:border-gold/70', 'dark:before:border-gold/75')
    expect(classes(button).some((c) => c.startsWith('shadow'))).toBe(false)
  })

  it('B3 the key hint inside a primary button uses the on-accent tone', () => {
    render(
      <Button variant="primary" kbd="N">
        Add first note
      </Button>,
    )
    const kbd = screen.getByRole('button').querySelector('kbd') as HTMLElement
    expect(kbd).toHaveClass('text-on-accent/85')
  })

  it('B4 ButtonLink and buttonClass share the primary look', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/review" variant="primary">
          Begin Review
        </ButtonLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Begin Review' })).toHaveClass('bg-indigo-fill', 'before:border-gold/70')
    expect(buttonClass('primary')).toContain('bg-indigo-fill')
    expect(buttonClass('secondary')).not.toContain('bg-indigo-fill')
  })
})
