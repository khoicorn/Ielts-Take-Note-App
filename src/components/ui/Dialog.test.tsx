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
