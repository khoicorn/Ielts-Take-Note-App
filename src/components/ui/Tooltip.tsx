import React, { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

type Side = 'right' | 'top' | 'bottom'

const GAP = 8

/**
 * A small label that appears on hover (after a short pause) or on keyboard focus.
 * Used by the icon rail and icon buttons. Esc hides it.
 */
export function Tooltip(props: { label: string; children: React.ReactElement; side?: Side }): React.JSX.Element {
  const { label, children, side = 'top' } = props
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = undefined
  }
  const show = (delay: number) => {
    clear()
    timer.current = setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    clear()
    setOpen(false)
  }

  useEffect(() => clear, [])

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    if (side === 'right') setPos({ top: r.top + r.height / 2, left: r.right + GAP })
    else if (side === 'bottom') setPos({ top: r.bottom + GAP, left: r.left + r.width / 2 })
    else setPos({ top: r.top - GAP, left: r.left + r.width / 2 })
  }, [open, side])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', hide, true)
    }
  }, [open])

  const childProps = isValidElement(children) ? (children.props as Record<string, unknown>) : {}
  const sameAsName = childProps['aria-label'] === label
  const child = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        'aria-describedby': open && !sameAsName ? id : (childProps['aria-describedby'] as string | undefined),
      })
    : children

  const transform =
    side === 'right' ? 'translate(0, -50%)' : side === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'

  return (
    <span
      ref={wrapRef}
      className="inline-flex"
      onMouseEnter={() => show(350)}
      onMouseLeave={hide}
      onFocus={(e) => {
        // Only keyboard focus shows the tip at once; mouse focus waits for hover.
        let keyboard = false
        try {
          keyboard = (e.target as HTMLElement).matches(':focus-visible')
        } catch {
          keyboard = false
        }
        if (keyboard) show(0)
      }}
      onBlur={hide}
      onPointerDown={hide}
    >
      {child}
      {open && pos
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              style={{ top: pos.top, left: pos.left, transform }}
              className={cn(
                'pointer-events-none fixed z-[80] whitespace-nowrap rounded-xs bg-ink px-2 py-1',
                'text-meta text-page shadow-float',
              )}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
