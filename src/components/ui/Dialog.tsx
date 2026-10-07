import { X } from 'lucide-react'
import React, { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'
import { IconButton } from './IconButton'

/* ---------- open-dialog registry (GlobalHotkeys pauses while any dialog is open) ---------- */

const stack: string[] = []
const subscribers = new Set<() => void>()
function emit() {
  for (const fn of subscribers) fn()
}
function pushDialog(id: string) {
  if (!stack.includes(id)) stack.push(id)
  emit()
}
function removeDialog(id: string) {
  const i = stack.indexOf(id)
  if (i !== -1) stack.splice(i, 1)
  emit()
}

/** True while any Dialog is open. Read at event time by global shortcuts. */
export function isAnyDialogOpen(): boolean {
  return stack.length > 0
}

/** React hook form of isAnyDialogOpen(). */
export function useAnyDialogOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => stack.length > 0,
    () => false,
  )
}

/* ---------- scroll lock ---------- */

let locks = 0
let saved: { overflow: string; paddingRight: string } | null = null
function lockScroll() {
  if (locks++ > 0 || typeof document === 'undefined') return
  const body = document.body
  const gap = window.innerWidth - document.documentElement.clientWidth
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
  body.style.overflow = 'hidden'
  if (gap > 0) body.style.paddingRight = `${gap}px`
}
function unlockScroll() {
  if (--locks > 0 || !saved) return
  document.body.style.overflow = saved.overflow
  document.body.style.paddingRight = saved.paddingRight
  saved = null
}

/* ---------- focus helpers ---------- */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

export function focusableIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert],[aria-hidden="true"]') && el.tabIndex !== -1,
  )
}

const FADE_MS = 180

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  /** Hide the header. The title still names the dialog for screen readers. Add your own close control for mobile sheets. */
  hideTitle?: boolean
  description?: string
  /** sm 420px, md 640px, lg 720px. Under 640px wide, md and lg become full-screen sheets. */
  size?: 'sm' | 'md' | 'lg'
  placement?: 'center' | 'top'
  initialFocusRef?: React.RefObject<HTMLElement | null>
  footer?: React.ReactNode
  children: React.ReactNode
  /** Extra classes for the panel. */
  className?: string
  /** Extra classes for the scrolling body (default padding px-6 py-5). */
  bodyClassName?: string
}

export function Dialog(props: DialogProps): React.JSX.Element | null {
  const {
    open,
    title,
    hideTitle = false,
    description,
    size = 'md',
    placement = 'center',
    initialFocusRef,
    footer,
    children,
    className,
    bodyClassName,
  } = props
  const id = useId()
  const titleId = `${id}-title`
  const descId = `${id}-desc`
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const downOnBackdrop = useRef(false)
  const onCloseRef = useRef(props.onClose)
  onCloseRef.current = props.onClose
  const openRef = useRef(open)
  openRef.current = open

  // A parent may unmount the dialog while it is open (screens that return null when closed).
  // Focus still goes back to the opener.
  useEffect(
    () => () => {
      const opener = openerRef.current
      if (openRef.current && opener && opener !== document.body && document.contains(opener)) {
        setTimeout(() => {
          if (!document.querySelector('[role="dialog"]')?.contains(document.activeElement)) opener.focus({ preventScroll: true })
        }, 0)
      }
    },
    [],
  )

  // Mount on open; fade; return focus and unmount after the fade on close.
  useLayoutEffect(() => {
    if (open) {
      if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const opener = openerRef.current
    openerRef.current = null
    if (opener && opener !== document.body && document.contains(opener)) opener.focus({ preventScroll: true })
    const t = setTimeout(() => setMounted(false), FADE_MS)
    return () => clearTimeout(t)
  }, [open])

  // Register, lock scroll, and move focus inside.
  useEffect(() => {
    if (!open || !mounted) return
    pushDialog(id)
    lockScroll()
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      const target =
        initialFocusRef?.current ?? focusableIn(bodyRef.current)[0] ?? focusableIn(footerRef.current)[0] ?? panel
      target.focus({ preventScroll: true })
    }
    return () => {
      removeDialog(id)
      unlockScroll()
    }
    // initialFocusRef is read once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted, id])

  if (!mounted) return null

  const isTop = () => stack[stack.length - 1] === id

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') {
      if (!isTop()) return
      e.stopPropagation()
      e.preventDefault()
      onCloseRef.current()
      return
    }
    if (e.key === 'Tab') {
      const items = focusableIn(panelRef.current)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const sheet = size !== 'sm'

  return createPortal(
    <div
      data-dialog-backdrop=""
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-scrim/75 dark:bg-scrim transition-opacity duration-180 ease-quiet',
        visible && open ? 'opacity-100' : 'pointer-events-none opacity-0',
        placement === 'top' ? 'items-start p-4 sm:pt-[12vh]' : 'items-center p-4',
        sheet && 'max-sm:items-stretch max-sm:p-0',
      )}
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (open && downOnBackdrop.current && e.target === e.currentTarget) onCloseRef.current()
        downOnBackdrop.current = false
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col overflow-hidden rounded-lg border border-line bg-paper text-ink shadow-float outline-none',
          'transition-[opacity,transform] duration-180 ease-quiet',
          visible && open ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
          size === 'sm' && 'max-w-[420px]',
          size === 'md' && 'sm:max-w-[640px]',
          size === 'lg' && 'sm:max-w-[720px]',
          placement === 'top' ? 'max-h-[calc(100dvh-2rem)] sm:max-h-[76dvh]' : 'max-h-[calc(100dvh-2rem)]',
          sheet && 'max-sm:h-full max-sm:max-h-none max-sm:rounded-none max-sm:border-0',
          className,
        )}
      >
        {hideTitle ? (
          <>
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="sr-only">
                {description}
              </p>
            ) : null}
          </>
        ) : (
          <header
            className={cn(
              'flex shrink-0 items-start justify-between gap-4 px-6 pt-5 pb-1',
              sheet && 'max-sm:px-4 max-sm:pt-[max(1rem,env(safe-area-inset-top))]',
            )}
          >
            <div className="min-w-0 pt-0.5">
              <h2 id={titleId} className="font-serif text-section font-normal text-ink">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-small text-graphite">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton icon={X} label="Close" size="sm" className="-mr-2" onClick={() => onCloseRef.current()} />
          </header>
        )}
        <div
          ref={bodyRef}
          className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-5', sheet && 'max-sm:px-4', bodyClassName)}
        >
          {children}
        </div>
        {footer ? (
          <div
            ref={footerRef}
            className={cn(
              'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-3.5',
              sheet && 'max-sm:px-4 max-sm:pb-[max(0.875rem,env(safe-area-inset-bottom))]',
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
