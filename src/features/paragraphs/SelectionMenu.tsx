import { X } from 'lucide-react'
import type React from 'react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/components/ui/cn'
import { IconButton } from '@/components/ui/IconButton'
import { Kbd } from '@/components/ui/Kbd'
import { MOBILE_QUERY, useMediaQuery } from '@/components/ui/uiState'
import { NOTE_TYPES, SELECTION_NOTE_TYPES } from '@/lib/taxonomy'
import type { NoteType } from '@/lib/types'
import { rangeRects } from './selectionDom'

const GAP = 8
const MARGIN = 8
const WIDTH = 256

/** Under 640px the menu is a bottom sheet, clear of the browser's own selection handles and callout. */
function useNarrow(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}

const ITEMS = SELECTION_NOTE_TYPES.map((value) => ({
  value,
  label: NOTE_TYPES.find((t) => t.value === value)?.saveAs ?? value,
}))

/**
 * "Create note from selection" (brief §23, mockup 09): the selected words, then the five "Save as" choices
 * with their number keys. Opens just under the selection so the line above stays readable; flips above
 * when there is no room. Mouse-downs inside never clear the selection.
 */
export function SelectionMenu(props: {
  open: boolean
  text: string
  menuRef: React.RefObject<HTMLDivElement | null>
  anchorRange: () => Range | null
  fallbackAnchor: () => HTMLElement | null
  focusOnOpen: boolean
  onFocused: () => void
  onChoose: (type: NoteType) => void
  onDismiss: (refocusBody: boolean) => void
  /** A press inside the layer (touch browsers may clear the text selection before the click). */
  onPress: () => void
}): React.JSX.Element | null {
  const { open, text, menuRef, anchorRange, fallbackAnchor, focusOnOpen, onFocused, onChoose, onDismiss, onPress } =
    props
  const narrow = useNarrow()
  const quoteId = useId()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const scrolledFor = useRef('')

  // Place the popover against the selection's line boxes.
  useLayoutEffect(() => {
    if (!open || narrow) {
      setPos(null)
      return
    }
    const place = () => {
      const layer = menuRef.current
      const h = layer?.offsetHeight || 260
      const rects = rangeRects(anchorRange())
      const box = rects.length ? null : fallbackAnchor()?.getBoundingClientRect()
      const first = rects[0] ?? box
      const last = rects[rects.length - 1] ?? box
      if (!first || !last) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      let top = last.bottom + GAP
      if (top + h > vh - MARGIN && first.top - GAP - h >= MARGIN) top = first.top - GAP - h
      top = Math.max(MARGIN, Math.min(top, vh - MARGIN - h))
      const left = Math.max(MARGIN, Math.min(rects.length > 1 ? last.left : first.left, vw - WIDTH - MARGIN))
      setPos({ top, left })
    }
    place()
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, narrow, text, anchorRange, fallbackAnchor, menuRef])

  // Bottom sheet: scroll a little when the sheet would cover the selected words.
  useLayoutEffect(() => {
    if (!open || !narrow || scrolledFor.current === text) return
    scrolledFor.current = text
    const sheet = menuRef.current
    const rects = rangeRects(anchorRange())
    const last = rects[rects.length - 1]
    if (!sheet || !last) return
    const limit = window.innerHeight - sheet.offsetHeight - 16
    if (last.bottom > limit) window.scrollBy({ top: last.bottom - limit })
  }, [open, narrow, text, anchorRange, menuRef])

  useEffect(() => {
    if (!open) scrolledFor.current = ''
  }, [open])

  // Keyboard: Enter on the paragraph or the toolbar button moves focus to the first choice.
  useEffect(() => {
    if (!open || !focusOnOpen) return
    const raf = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true })
      onFocused()
    })
    return () => cancelAnimationFrame(raf)
  }, [open, focusOnOpen, menuRef, onFocused])

  if (!open) return null

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = items()
    const i = list.indexOf(document.activeElement as HTMLButtonElement)
    const n = /^[1-9]$/.test(e.key) ? Number(e.key) : 0
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
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      onDismiss(true)
    } else if (n >= 1 && n <= ITEMS.length) {
      e.preventDefault()
      onChoose(ITEMS[n - 1].value)
    }
  }

  const layer = (
    <div
      ref={menuRef}
      data-floating=""
      onKeyDown={onKeyDown}
      onPointerDownCapture={onPress}
      // Keep the text selection (and focus) where it is when a choice is clicked.
      onMouseDown={(e) => e.preventDefault()}
      style={
        narrow
          ? undefined
          : pos
            ? { top: pos.top, left: pos.left, width: WIDTH }
            : { top: 0, left: 0, width: WIDTH, opacity: 0 }
      }
      className={cn(
        'fixed z-[60] animate-fade border border-line bg-paper text-ink shadow-float',
        narrow
          ? 'inset-x-0 bottom-0 rounded-t-lg border-b-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))]'
          : 'rounded-md py-1',
      )}
    >
      <div
        className={cn(
          'flex items-start gap-2 border-b border-line',
          narrow ? 'mb-1 py-2 pr-2 pl-4' : 'mb-1 px-3 pt-2 pb-2',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-meta text-graphite">Create note from selection</p>
          <p id={quoteId} className="truncate text-small text-ink">
            “{text}”
          </p>
        </div>
        {narrow ? <IconButton icon={X} label="Close" size="sm" onClick={() => onDismiss(false)} /> : null}
      </div>
      <div role="menu" aria-label="Create note from selection" aria-describedby={quoteId}>
        {ITEMS.map((item, i) => (
          <button
            key={item.value}
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => onChoose(item.value)}
            className={cn(
              'relative flex w-full cursor-pointer items-center gap-3 text-left text-body text-ink transition-colors duration-150',
              'hover:bg-stone/60 focus-visible:bg-stone/60 focus-visible:outline-none',
              'focus-visible:before:absolute focus-visible:before:inset-y-1.5 focus-visible:before:left-0 focus-visible:before:w-0.5 focus-visible:before:bg-indigo',
              narrow ? 'min-h-11 px-4' : 'min-h-9 px-3',
            )}
          >
            <span className="flex-1 truncate">{item.label}</span>
            {narrow ? null : (
              <span aria-hidden="true">
                <Kbd className="h-[18px] min-w-[18px] px-1 tabular-nums">{i + 1}</Kbd>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
  return createPortal(layer, document.body)
}
