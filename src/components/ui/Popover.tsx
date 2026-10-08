import React, { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'
import { focusableIn } from './Dialog'
import { useFloatingPosition } from './floating'
import { ICON_STROKE, type IconType } from './icons'

/** Pointer-downs inside any floating layer (a combobox list inside a popover, say) do not count as outside. */
function isInsideFloating(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-floating]')
}

function useOutsidePointer(open: boolean, refs: React.RefObject<HTMLElement | null>[], onOutside: () => void) {
  const cb = useRef(onOutside)
  cb.current = onOutside
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent | MouseEvent) => {
      const t = e.target as Node
      if (refs.some((r) => r.current?.contains(t))) return
      if (isInsideFloating(e.target)) return
      cb.current()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
    // refs are stable objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

type AnyProps = Record<string, unknown>

/**
 * Style for the first frame, before the layer has a position. Opacity, not visibility: with
 * prefers-reduced-motion the global CSS gives every element a 0.01ms transition, so a visibility
 * change is still "hidden" when the next frame moves focus into the layer, and focus() fails.
 */
const UNPLACED: React.CSSProperties = { opacity: 0, pointerEvents: 'none', top: 0, left: 0 }

/** Left-edge bar shown on the focused menu item. The color is set per tone with focus:before:bg-*. */
const OPTION_FOCUS_BAR = 'focus:before:absolute focus:before:inset-y-1.5 focus:before:left-0 focus:before:w-0.5'

function triggerProps(trigger: React.ReactElement): AnyProps {
  return isValidElement(trigger) ? (trigger.props as AnyProps) : {}
}

function focusTriggerIn(wrap: HTMLElement | null) {
  const el = wrap ? focusableIn(wrap)[0] : undefined
  el?.focus()
}

/**
 * A floating panel attached to a trigger (filter drawers, small forms).
 * Closes on outside click and Esc. Focus moves into the panel on open and back to the trigger on Esc.
 */
export function Popover(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  trigger: React.ReactElement
  align?: 'start' | 'end'
  children: React.ReactNode
  className?: string
  /** Name of the panel. Without it, the panel is named by the trigger's text. */
  'aria-label'?: string
}): React.JSX.Element {
  const { open, onOpenChange, trigger, align = 'start', children, className } = props
  const id = useId()
  const autoTriggerId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const pos = useFloatingPosition(wrapRef, open, { align, gap: 6, preferredHeight: 520, layer: layerRef })
  const tp = triggerProps(trigger)

  useOutsidePointer(open, [wrapRef, layerRef], () => onOpenChange(false))

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      const first = focusableIn(layerRef.current)[0]
      ;(first ?? layerRef.current)?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  const close = (refocus: boolean) => {
    onOpenChange(false)
    if (refocus) focusTriggerIn(wrapRef.current)
  }

  const onLayerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close(true)
    } else if (e.key === 'Tab') {
      const items = focusableIn(layerRef.current)
      const first = items[0]
      const last = items[items.length - 1]
      if ((!e.shiftKey && document.activeElement === last) || (e.shiftKey && document.activeElement === first)) {
        e.preventDefault()
        close(true)
      }
    }
  }

  const triggerId = typeof tp.id === 'string' && tp.id ? tp.id : autoTriggerId
  const clone = cloneElement(trigger as React.ReactElement<AnyProps>, {
    id: triggerId,
    'aria-expanded': open,
    'aria-haspopup': 'dialog',
    'aria-controls': open ? id : undefined,
    onClick: (e: React.MouseEvent) => {
      ;(tp.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e)
      onOpenChange(!open)
    },
  })

  return (
    <span
      ref={wrapRef}
      className="inline-flex"
      onKeyDown={(e) => {
        if (open && e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          close(true)
        }
      }}
    >
      {clone}
      {open
        ? createPortal(
            <div
              ref={layerRef}
              id={id}
              role="dialog"
              aria-label={props['aria-label']}
              aria-labelledby={props['aria-label'] ? undefined : triggerId}
              data-floating=""
              tabIndex={-1}
              onKeyDown={onLayerKeyDown}
              style={pos ? { top: pos.top, left: pos.left, maxHeight: pos.maxHeight } : UNPLACED}
              className={cn(
                'fixed z-[60] overflow-y-auto rounded-md border border-line bg-paper text-ink shadow-float outline-none',
                className ?? 'w-72 p-4',
              )}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}

/* ---------- Menu ---------- */

export interface MenuItem {
  label: string
  icon?: IconType
  onSelect: () => void
  tone?: 'default' | 'danger'
  shortcut?: string
  disabled?: boolean
}

/** ARIA menu button: Enter, Space or ↓ opens; ↑↓ Home End move; Enter selects; Esc closes. */
export function Menu(props: {
  trigger: React.ReactElement
  items: (MenuItem | 'separator')[]
  align?: 'start' | 'end'
  'aria-label': string
}): React.JSX.Element {
  const { trigger, items, align = 'end' } = props
  const id = useId()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const pos = useFloatingPosition(wrapRef, open, { align, gap: 6, preferredHeight: 400, layer: layerRef })
  const startAt = useRef<'first' | 'last'>('first')
  const tp = triggerProps(trigger)

  useOutsidePointer(open, [wrapRef, layerRef], () => setOpen(false))

  const menuItems = () =>
    Array.from(layerRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      const list = menuItems()
      ;(startAt.current === 'last' ? list[list.length - 1] : list[0])?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) focusTriggerIn(wrapRef.current)
  }

  const clone = cloneElement(trigger as React.ReactElement<AnyProps>, {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    onClick: (e: React.MouseEvent) => {
      ;(tp.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e)
      startAt.current = 'first'
      setOpen((o) => !o)
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      ;(tp.onKeyDown as ((e: React.KeyboardEvent) => void) | undefined)?.(e)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        startAt.current = e.key === 'ArrowUp' ? 'last' : 'first'
        setOpen(true)
      }
    },
  })

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = menuItems()
    const i = list.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      list[(i + 1) % list.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      list[(i - 1 + list.length) % list.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      list[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      list[list.length - 1]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close(true)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      close(true)
    }
  }

  return (
    <span ref={wrapRef} className="inline-flex">
      {clone}
      {open
        ? createPortal(
            <div
              ref={layerRef}
              id={id}
              role="menu"
              aria-label={props['aria-label']}
              data-floating=""
              onKeyDown={onMenuKeyDown}
              style={pos ? { top: pos.top, left: pos.left, maxHeight: pos.maxHeight } : UNPLACED}
              className="fixed z-[60] min-w-52 overflow-y-auto rounded-md border border-line bg-paper py-1 shadow-float"
            >
              {items.map((item, i) => {
                if (item === 'separator') return <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-line" />
                const Icon = item.icon
                const danger = item.tone === 'danger'
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    disabled={item.disabled}
                    onClick={() => {
                      close(true)
                      item.onSelect()
                    }}
                    onMouseMove={(e) => e.currentTarget.focus({ preventScroll: true })}
                    className={cn(
                      'relative flex min-h-9 w-full cursor-pointer items-center gap-3 px-3 text-left text-body outline-none max-sm:min-h-11',
                      'disabled:cursor-not-allowed disabled:opacity-45',
                      // Focused item: a 2px bar at the left edge (like the active nav item) plus a light tint.
                      OPTION_FOCUS_BAR,
                      danger
                        ? 'text-crimson focus:bg-crimson/[0.07] focus:before:bg-crimson'
                        : 'text-ink focus:bg-stone/60 focus:before:bg-indigo',
                    )}
                  >
                    {Icon ? (
                      <Icon
                        className={cn('size-4 shrink-0', danger ? 'text-crimson' : 'text-graphite')}
                        strokeWidth={ICON_STROKE}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut ? <span className="text-meta text-graphite">{item.shortcut}</span> : null}
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
