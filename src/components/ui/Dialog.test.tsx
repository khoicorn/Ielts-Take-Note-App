import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { Dialog } from './Dialog'
afterEach(cleanup)

function Harness(props: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Dialog
        open={open}
        title="New note"
        onClose={() => {
          props.onClose?.()
          setOpen(false)
        }}
        footer={<button type="button">Save</button>}
      >
        <input aria-label="First field" />
        <input aria-label="Second field" />
      </Dialog>
    </div>
  )
}

describe('Dialog', { timeout: 15_000 }, () => {
  it('G1 Esc calls onClose; focus moves inside on open and returns to the opener on close', async () => {
    const user = userEvent.setup({ delay: null })
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'New note' })
    expect(dialog).toBeInTheDocument()
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(screen.getByLabelText('First field'))

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(opener)
  })

  it('G2 Tab cycles inside the panel', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    const dialog = screen.getByRole('dialog')
    const first = screen.getByLabelText('First field')
    expect(document.activeElement).toBe(first)

    // First field → Second field → Save → Close → back to First field.
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    // Shift+Tab from the first focusable wraps to the last one.
    first.focus()
    await user.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(first)
  })

  it('G2b a hidden last control does not break the Tab cycle; escaped focus comes back and Esc still closes', async () => {
    const user = userEvent.setup({ delay: null })
    const onClose = vi.fn()
    render(
      <div>
        <button type="button">Behind</button>
        <Dialog open title="Search notes" hideTitle onClose={onClose}>
          <input aria-label="Search" />
          {/* Like the mobile-only Close button (sm:hidden) on desktop. */}
          <button type="button" style={{ display: 'none' }}>
            Hidden close
          </button>
        </Dialog>
      </div>,
    )
    const input = screen.getByLabelText('Search')
    expect(document.activeElement).toBe(input)
    // The input is the only Tab stop: Tab and Shift+Tab stay on it.
    await user.tab()
    expect(document.activeElement).toBe(input)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(input)

    // Focus pushed to the page behind returns to the dialog.
    screen.getByRole('button', { name: 'Behind' }).focus()
    expect(document.activeElement).toBe(input)

    // Focus lost to the body (a removed control): Esc still closes the dialog.
    input.blur()
    expect(document.activeElement).toBe(document.body)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('G1 clicking the backdrop closes; clicking inside does not', async () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Delete this note?" onClose={onClose}>
        <p>Body text</p>
      </Dialog>,
    )
    fireEvent.mouseDown(screen.getByText('Body text'))
    fireEvent.click(screen.getByText('Body text'))
    expect(onClose).not.toHaveBeenCalled()
    const backdrop = document.querySelector('[data-dialog-backdrop]') as HTMLElement
    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
