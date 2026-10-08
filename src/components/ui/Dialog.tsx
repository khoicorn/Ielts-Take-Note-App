import { X } from 'lucide-react'
import React, { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { BRASS_BORDER, SMALL_CAPS_QUIET } from './candlelit'
import { cn } from './cn'
import { IconButton } from './IconButton'

/** The brass hairline color on a ::before line (gold 55% by day, 38% by night). */
const BRASS_RULE_BEFORE = 'before:bg-gold/55 dark:before:bg-gold/38'

/* ---------- open-dialog registry (GlobalHotkeys pauses while any dialog is open) ---------- */

const stack: string[] = []
/** Each open dialog's backdrop: the layer toasts move into while it is on top. */
const layers = new Map<string, HTMLElement>()
const subscribers = new Set<() => void>()
function emit() {
  for (const fn of subscribers) fn()
}
function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}
function pushDialog(id: string, layer: HTMLElement | null) {
  if (!stack.includes(id)) stack.push(id)
  if (layer) layers.set(id, layer)
  emit()
}
function removeDialog(id: string) {
  const i = stack.indexOf(id)
  if (i !== -1) stack.splice(i, 1)
  layers.delete(id)
  emit()
}

/**
 * The backdrop element of the top open dialog, or null. Toasts render inside it while a dialog is open,
 * so their buttons (Undo, View) stay in the dialog's Tab cycle and are not hidden by aria-modal.
 */
export function useTopDialogLayer(): HTMLElement | null {
  const top = useSyncExternalStore(
    subscribe,
    () => stack[stack.length - 1] ?? null,
    () => null,
  )
  return top ? (layers.get(top) ?? null) : null
}

/** True while any Dialog is open. Read at event time by global shortcuts. */
export function isAnyDialogOpen(): boolean {
  return stack.length > 0
}

/** React hook form of isAnyDialogOpen(). */
export function useAnyDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, () => stack.length > 0, () => false)
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

/**
 * Keeps the page behind still while `active` (dialogs, the paragraph focus editor). Locks are counted,
 * so nested overlays restore the page only when the last one closes.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    lockScroll()
    return unlockScroll
  }, [active])
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

/**
 * False for controls that are not drawn (display: none, as with `sm:hidden`, or visibility: hidden).
 * Tab skips them, so a focus trap must skip them too, or it never sees its real first and last stop.
 */
function isRendered(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === 'function') return el.checkVisibility({ visibilityProperty: true })
  const style = getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/** The Tab stops inside `root`, in DOM order. Hidden, inert and aria-hidden controls are left out. */
export function focusableIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert],[aria-hidden="true"]') && el.tabIndex !== -1 && isRendered(el),
  )
}

/** The Tab stop that comes after (or before) `from` in DOM order, wrapping at the ends. */
function nextStop(items: HTMLElement[], from: Element | null, backwards: boolean): HTMLElement | undefined {
  if (!from) return backwards ? items[items.length - 1] : items[0]
  if (backwards) {
    const before = items.filter((el) => from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING && !el.contains(from))
    return before[before.length - 1] ?? items[items.length - 1]
  }
  return items.find((el) => from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) ?? items[0]
}

/** Popovers, menus and listboxes portal to <body>. They handle their own keys and may hold focus. */
function inFloatingLayer(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-floating]') !== null
}

const FADE_MS = 180

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  /** Hide the header. The title still names the dialog for screen readers. Add your own close control for mobile sheets. */
  hideTitle?: boolean
  description?: string
  /** "smallcaps": the description as a quiet italic small-caps eyebrow (design v1.2 rule 3, Quick Add). Default "plain". */
  descriptionStyle?: 'plain' | 'smallcaps'
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
    descriptionStyle = 'plain',
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
  const backdropRef = useRef<HTMLDivElement>(null)
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
    pushDialog(id, backdropRef.current)
    lockScroll()
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      const target =
        initialFocusRef?.current ?? focusableIn(bodyRef.current)[0] ?? focusableIn(footerRef.current)[0] ?? panel
      target.focus({ preventScroll: true })
    }
    // Safety net while this dialog is on top: focus that leaves it (a removed control, a click on the page
    // behind) comes back, and Esc still closes it when focus is outside.
    const onTop = () => openRef.current && stack[stack.length - 1] === id
    const outside = (t: EventTarget | null) => {
      const backdrop = backdropRef.current
      return !!backdrop && t instanceof Node && !backdrop.contains(t) && !inFloatingLayer(t)
    }
    const onFocusIn = (e: FocusEvent) => {
      if (!onTop() || !outside(e.target)) return
      const target = focusableIn(bodyRef.current)[0] ?? focusableIn(backdropRef.current)[0] ?? panelRef.current
      target?.focus({ preventScroll: true })
    }
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (!onTop() || e.defaultPrevented || !outside(e.target)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        const items = focusableIn(backdropRef.current)
        ;(e.shiftKey ? items[items.length - 1] : items[0])?.focus()
      }
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onDocKeyDown)
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
      // React bubbles keys from portaled children (a popover or a dialog opened from this one) up to here.
      // They manage their own Tab order.
      if (e.defaultPrevented || !isTop() || !backdropRef.current?.contains(e.target as Node)) return
      // The backdrop holds the panel and, while this dialog is on top, the toasts (their Undo stays reachable).
      const items = focusableIn(backdropRef.current)
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
      } else if (!items.includes(active as HTMLElement)) {
        // Focus sits on something that is not a Tab stop (the panel, a list option). Pick the next stop here,
        // so the browser never moves it out of the dialog.
        e.preventDefault()
        nextStop(items, active, e.shiftKey)?.focus()
      }
    }
  }

  const sheet = size !== 'sm'

  return createPortal(
    <div
      ref={backdropRef}
      data-dialog-backdrop=""
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-scrim transition-opacity duration-180 ease-quiet',
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
          'relative flex w-full flex-col overflow-hidden rounded-lg border border-line-strong bg-paper text-ink shadow-float outline-none',
          'transition-[opacity,transform] duration-180 ease-quiet',
          visible && open ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
          size === 'sm' && 'max-w-[420px]',
          size === 'md' && 'sm:max-w-[640px]',
          size === 'lg' && 'sm:max-w-[720px]',
          // Top-placed dialogs start at 12vh and may use the space down to 1rem above the bottom edge.
          placement === 'top' ? 'max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-12vh-1rem)]' : 'max-h-[calc(100dvh-2rem)]',
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
                <p
                  id={descId}
                  className={descriptionStyle === 'smallcaps' ? cn('mt-0.5', SMALL_CAPS_QUIET) : 'mt-1 text-small text-graphite'}
                >
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
              'relative flex shrink-0 flex-wrap items-center justify-end gap-2 px-6 py-3.5',
              // The footer's brass line stops at the bookplate frame (7px from each edge) instead of crossing it.
              'before:pointer-events-none before:absolute before:inset-x-[7px] before:top-0 before:h-px',
              BRASS_RULE_BEFORE,
              sheet && 'max-sm:px-4 max-sm:pb-[max(0.875rem,env(safe-area-inset-bottom))] max-sm:before:inset-x-0',
            )}
          >
            {footer}
          </div>
        ) : null}
        {/* The bookplate (design v1.2 rule 6): a brass hairline frame 6px inside the edge. Decorative only.
            Full-screen sheets on phones have no plate edge, so the frame is hidden there. */}
        <div
          aria-hidden="true"
          data-bookplate=""
          className={cn('pointer-events-none absolute inset-1.5 rounded-sm border', BRASS_BORDER, sheet && 'max-sm:hidden')}
        />
      </div>
    </div>,
    document.body,
  )
}
