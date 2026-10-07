import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

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

  const start = useCallback(() => {
    startedAt.current = Date.now()
    timer.current = setTimeout(() => onDismiss(item.id), remaining.current)
  }, [item.id, onDismiss])

  const pause = () => {
    if (timer.current) clearTimeout(timer.current)
    remaining.current = Math.max(1200, remaining.current - (Date.now() - startedAt.current))
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    start()
    return () => {
      cancelAnimationFrame(raf)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [start])

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={start}
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

  return (
    <ToastContext.Provider value={api}>
      {props.children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4',
                'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6',
              )}
            >
              {items.map((t) => (
                <ToastView key={t.id} item={t} onDismiss={dismiss} />
              ))}
            </div>,
            document.body,
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
