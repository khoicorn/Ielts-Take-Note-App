import { fireEvent, renderHook, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTypingTarget, useHotkeys } from './hotkeys'
afterEach(cleanup)

describe('hotkeys', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('H1 "n" fires on body and not while typing in an input or textarea', () => {
    const fn = vi.fn()
    renderHook(() => useHotkeys({ n: fn }))
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(fn).toHaveBeenCalledTimes(1)

    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    document.body.append(input, textarea)
    fireEvent.keyDown(input, { key: 'n' })
    fireEvent.keyDown(textarea, { key: 'n' })
    expect(fn).toHaveBeenCalledTimes(1)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(editable)
    expect(isTypingTarget(input)).toBe(true)
    expect(isTypingTarget(textarea)).toBe(true)
    expect(isTypingTarget(document.body)).toBe(false)
  })

  it('H1 "n" does not fire with Ctrl held, and "mod+n" does', () => {
    const plain = vi.fn()
    const mod = vi.fn()
    renderHook(() => useHotkeys({ n: plain, 'mod+n': mod }))
    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })
    expect(plain).not.toHaveBeenCalled()
    expect(mod).toHaveBeenCalledTimes(1)
  })

  it('H2 "mod+enter" listed in allowInInputs fires inside a textarea', () => {
    const fn = vi.fn()
    const other = vi.fn()
    renderHook(() => useHotkeys({ 'mod+enter': fn, n: other }, { allowInInputs: ['mod+enter'] }))
    const textarea = document.createElement('textarea')
    document.body.append(textarea)
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    fireEvent.keyDown(textarea, { key: 'n' })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
  })

  it('H3 chord "g t" fires within 1200ms and not after 1500ms', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    renderHook(() => useHotkeys({ 'g t': fn }))
    fireEvent.keyDown(document.body, { key: 'g' })
    vi.advanceTimersByTime(400)
    fireEvent.keyDown(document.body, { key: 't' })
    expect(fn).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document.body, { key: 'g' })
    vi.advanceTimersByTime(1500)
    fireEvent.keyDown(document.body, { key: 't' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('H4 "shift+?" fires on "?"', () => {
    const fn = vi.fn()
    renderHook(() => useHotkeys({ 'shift+?': fn }))
    fireEvent.keyDown(document.body, { key: '?', shiftKey: true })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('H4 named keys: "escape", "space", "arrowup" and digits', () => {
    const esc = vi.fn()
    const space = vi.fn()
    const up = vi.fn()
    const one = vi.fn()
    renderHook(() => useHotkeys({ escape: esc, space, arrowup: up, '1': one }))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: ' ' })
    fireEvent.keyDown(document.body, { key: 'ArrowUp' })
    fireEvent.keyDown(document.body, { key: '1' })
    expect([esc, space, up, one].map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 1])
  })

  it('H1 enabled=false turns every binding off', () => {
    const fn = vi.fn()
    renderHook(() => useHotkeys({ n: fn }, { enabled: false }))
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(fn).not.toHaveBeenCalled()
  })
})
