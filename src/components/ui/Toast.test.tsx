import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Trigger(props: { onUndo: () => void }) {
  const toast = useToast()
  return (
    <button type="button" onClick={() => toast.show('Note archived.', { action: { label: 'Undo', onClick: props.onUndo } })}>
      Archive
    </button>
  )
}

function setup() {
  const onUndo = vi.fn()
  render(
    <ToastProvider>
      <Trigger onUndo={onUndo} />
    </ToastProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
  return { onUndo }
}

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('O1 closes after 4s when nothing holds it', () => {
    vi.useFakeTimers()
    setup()
    expect(screen.getByText('Note archived.')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4500))
    expect(screen.queryByText('Note archived.')).toBeNull()
  })

  it('O2 stays open while keyboard focus is on its action, and closes after focus leaves', () => {
    vi.useFakeTimers()
    const { onUndo } = setup()
    const undo = screen.getByRole('button', { name: 'Undo' })
    act(() => undo.focus())
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('Note archived.')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Archive' }).focus())
    act(() => vi.advanceTimersByTime(4500))
    expect(screen.queryByText('Note archived.')).toBeNull()
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('O3 stays open while hovered even if focus leaves, and Undo still works', () => {
    vi.useFakeTimers()
    const { onUndo } = setup()
    const undo = screen.getByRole('button', { name: 'Undo' })
    const toast = undo.parentElement as HTMLElement
    fireEvent.mouseEnter(toast)
    act(() => undo.focus())
    act(() => screen.getByRole('button', { name: 'Archive' }).focus())
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('Note archived.')).toBeInTheDocument()
    fireEvent.click(undo)
    expect(onUndo).toHaveBeenCalledTimes(1)
  })
})
