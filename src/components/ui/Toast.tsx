import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'
import { focusableIn, useTopDialogLayer } from './Dialog'

interface ToastOptions {
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: number
  message: string
  leaving: boolean
}

interface ToastApi {
  show: (message: string, opts?: ToastOptions) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DEFAULT_MS = 4000
const MAX = 3
const FADE_MS = 180

function ToastView(props: { item: ToastItem; onDismiss: (id: number) => void }): React.JSX.Element {
  const { item, onDismiss } = props
  const [shown, setShown] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const remaining = useRef(item.duration ?? DEFAULT_MS)
  const startedAt = useRef(0)
  // The timer pauses while the pointer is over the toast or keyboard focus is inside it (Undo stays reachable).
  const held = useRef({ hover: false, focus: false })

  const start = useCallback(() => {
    if (timer.current !== undefined) return
    startedAt.current = Date.now()
    timer.current = setTimeout(() => onDismiss(item.id), remaining.current)
  }, [item.id, onDismiss])

  const pause = useCallback(() => {
    if (timer.current === undefined) return
    clearTimeout(timer.current)
    timer.current = undefined
    remaining.current = Math.max(1200, remaining.current - (Date.now() - startedAt.current))
  }, [])

  const hold = (kind: 'hover' | 'focus', on: boolean) => {
    held.current[kind] = on
    if (held.current.hover || held.current.focus) pause()
    else start()
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    start()
    return () => {
      cancelAnimationFrame(raf)
      if (timer.current !== undefined) clearTimeout(timer.current)
      timer.current = undefined
    }
  }, [start])

  return (
    <div
      onMouseEnter={() => hold('hover', true)}
      onMouseLeave={() => hold('hover', false)}
      onFocus={() => hold('focus', true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hold('focus', false)
      }}
      className={cn(
        'pointer-events-auto flex min-h-11 max-w-[min(440px,100%)] items-center gap-4 rounded-md border border-line bg-paper py-2 pr-2 pl-4',
        'text-small text-ink shadow-float transition-[opacity,transform] duration-180 ease-quiet',
        shown && !item.leaving ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
      )}
    >
      <span className="min-w-0 flex-1 py-1">{item.message}</span>
      {item.action ? (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick()
            onDismiss(item.id)
          }}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-sm px-3 text-small font-medium text-indigo hover:bg-indigo/[0.07] max-sm:min-h-11"
        >
          {item.action.label}
        </button>
      ) : (
        <span className="w-2" aria-hidden="true" />
      )}
    </div>
  )
}

/**
 * Quiet messages at the bottom center (above the mobile bottom bar).
 * aria-live polite, 4s by default (paused on hover), at most 3 at once.
 */
export function ToastProvider(props: { children: React.ReactNode }): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), FADE_MS)
  }, [])

  const show = useCallback((message: string, opts?: ToastOptions) => {
    const id = nextId.current++
    setItems((list) => [...list.filter((t) => !t.leaving), { id, message, leaving: false, ...opts }].slice(-MAX))
  }, [])

  const api = useMemo(() => ({ show }), [show])
  // While a dialog is open, toasts live inside its layer: Tab reaches their buttons and aria-modal does not hide them.
  const layer = useTopDialogLayer()

  // The toasts come last in the dialog layer. Tab from the last toast button goes back to the dialog's first control.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || e.shiftKey || !layer) return
    const items = focusableIn(layer)
    if (items.length > 0 && document.activeElement === items[items.length - 1]) {
      e.preventDefault()
      items[0].focus()
    }
  }

  return (
    <ToastContext.Provider value={api}>
      {props.children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              onKeyDown={onKeyDown}
              className={cn(
                'pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6',
                // Phones: above the bottom bar. Inside a full-screen sheet the Save bar sits there, so toasts go to the top.
                layer
                  ? 'max-sm:top-[max(0.75rem,env(safe-area-inset-top))]'
                  : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]',
              )}
            >
              {items.map((t) => (
                <ToastView key={t.id} item={t} onDismiss={dismiss} />
              ))}
            </div>,
            layer ?? document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.')
  return ctx
}
