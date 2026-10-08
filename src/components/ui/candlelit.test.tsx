import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CandleLight } from './CandleLight'
import { Dialog } from './Dialog'
import { PageHeader } from './PageHeader'
import { UnderlineTabs } from './Tabs'

describe('design v1.2 shared pieces', () => {
  it('V1 the candle layer is fixed, behind content, hidden from assistive tech and never catches clicks', () => {
    const { container } = render(<CandleLight />)
    const layer = container.querySelector('[data-candle-light]') as HTMLElement
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer).toHaveClass('pointer-events-none', 'fixed', 'inset-0', '-z-10', 'overflow-hidden')
    expect(layer.style.backgroundImage).toContain('var(--vignette)')
    expect((layer.firstElementChild as HTMLElement).style.backgroundImage).toContain('var(--glow)')
  })

  it('V2 the page title has the rubric initial (garnet by day, brass by night)', () => {
    render(<PageHeader title="My Mistakes" />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'My Mistakes' })
    expect(h1).toHaveClass('text-title', 'first-letter:text-garnet', 'dark:first-letter:text-brass', 'first-letter:text-[1.22em]')
    expect(h1).not.toHaveClass('dark:first-letter:text-garnet')
  })

  it('V3 the dialog has a decorative bookplate frame 6px inside the edge', () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="New Speaking note"
        description="What I Said → Native Upgrade"
        descriptionStyle="smallcaps"
        size="sm"
        footer={<button type="button">Save</button>}
      >
        <p>Body</p>
      </Dialog>,
    )
    const panel = screen.getByRole('dialog')
    const frame = panel.querySelector('[data-bookplate]') as HTMLElement
    expect(frame).toHaveAttribute('aria-hidden', 'true')
    expect(frame).toHaveClass('pointer-events-none', 'absolute', 'inset-1.5', 'border-gold/55', 'dark:border-gold/38')
    // Quick Add's description as a quiet small-caps eyebrow (rule 3).
    expect(screen.getByText('What I Said → Native Upgrade')).toHaveClass('font-smallcaps', '[font-variant-caps:small-caps]', 'text-graphite')
    // The footer line stops at the frame.
    expect(screen.getByRole('button', { name: 'Save' }).parentElement).toHaveClass('before:inset-x-[7px]')
  })

  it('V4 the active tab underline is 2px brass and draws in again when another tab becomes active', () => {
    function Tabs() {
      const [v, setV] = useState('a')
      return (
        <UnderlineTabs
          aria-label="Task"
          value={v}
          onChange={setV}
          items={[
            { value: 'a', label: 'Task 1' },
            { value: 'b', label: 'Task 2' },
          ]}
        />
      )
    }
    const { container } = render(<Tabs />)
    const first = container.querySelector('[data-tab-underline]') as HTMLElement
    expect(first).toHaveClass('h-0.5', 'bg-brass', 'animate-draw', 'origin-left')
    expect(first).not.toHaveClass('bg-indigo')
    fireEvent.click(screen.getByRole('tab', { name: 'Task 2' }))
    const second = container.querySelector('[data-tab-underline]') as HTMLElement
    expect(second).not.toBe(first)
    expect(second).toHaveClass('animate-draw')
  })
})
