import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Menu, Popover } from './Popover'

function FilterPopover(props: { label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen} aria-label={props.label} trigger={<button type="button">Filter · 2</button>}>
      <button type="button">Clear</button>
    </Popover>
  )
}

describe('Popover and Menu', () => {
  it('K1 the popover panel is a dialog named by its trigger, or by aria-label', () => {
    const { unmount } = render(<FilterPopover />)
    const trigger = screen.getByRole('button', { name: 'Filter · 2' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(trigger)
    const panel = screen.getByRole('dialog', { name: 'Filter · 2' })
    expect(trigger).toHaveAttribute('aria-controls', panel.id)
    unmount()

    render(<FilterPopover label="Filter notes" />)
    fireEvent.click(screen.getByRole('button', { name: 'Filter · 2' }))
    expect(screen.getByRole('dialog', { name: 'Filter notes' })).toBeInTheDocument()
  })

  it('K2 a focused menu item shows a left bar, not only a faint tint', () => {
    render(
      <Menu
        aria-label="Note actions"
        trigger={<button type="button">More</button>}
        items={[
          { label: 'Duplicate', onSelect: () => {} },
          { label: 'Delete', tone: 'danger', onSelect: () => {} },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const duplicate = screen.getByRole('menuitem', { name: 'Duplicate' })
    const remove = screen.getByRole('menuitem', { name: 'Delete' })
    for (const cls of ['relative', 'focus:before:absolute', 'focus:before:w-0.5']) expect(duplicate).toHaveClass(cls)
    expect(duplicate).toHaveClass('focus:before:bg-indigo')
    expect(remove).toHaveClass('focus:before:bg-crimson')
  })
})
