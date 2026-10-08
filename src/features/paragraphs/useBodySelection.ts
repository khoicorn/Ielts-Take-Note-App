/**
 * Selection to note (brief §23, "extremely easy"): tracks text selected in the paragraph body by
 * mouse, touch or keyboard, and decides when the "Create note from selection" menu shows.
 *
 * - Mouse: the menu shows when the button is released.
 * - Touch: the menu shows once the selection stops changing (the browser's handles fire no pointer events).
 * - Keyboard (body focused): ← → pick a word, Shift extends, Home/End jump; the menu shows at once.
 *   1–5 save directly, Enter moves focus into the menu, Esc clears.
 */
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SELECTION_NOTE_TYPES } from '@/lib/taxonomy'
import type { NoteType } from '@/lib/types'
import type { TextRange } from './paragraphText'
import { wordRanges } from './paragraphText'
import { clearSelection, liveRange, readSelection, selectOffsets } from './selectionDom'

/** Wait for a touch selection to settle before showing the menu. */
const SETTLE_MS = 280

/** After a press inside the menu, a cleared selection is ignored for this long (iOS clears it on tap). */
const PRESS_GRACE_MS = 800

interface WordSpan {
  anchor: number
  focus: number
}

export interface BodySelectionApi {
  selection: TextRange | null
  menuOpen: boolean
  /** Set when the menu should take focus on its next render. */
  focusMenu: boolean
  menuRef: React.RefObject<HTMLDivElement | null>
  /** The DOM range the menu is placed against. */
  anchorRange: () => Range | null
  openMenu: () => void
  /** Hides the menu. Keeps the selection so it can be copied. */
  dismiss: (refocusBody: boolean) => void
  choose: (type: NoteType) => void
  bodyHandlers: {
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  }
  menuFocused: () => void
  /** Call on pointer down inside the menu. */
  menuPressed: () => void
}

function sameRange(a: TextRange | null, b: TextRange | null): boolean {
  return !!a && !!b && a.start === b.start && a.end === b.end
}

export function useBodySelection(opts: {
  rootRef: React.RefObject<HTMLElement | null>
  text: string
  onChoose: (sel: TextRange, type: NoteType) => void
}): BodySelectionApi {
  const { rootRef, text, onChoose } = opts
  const [selection, setSelection] = useState<TextRange | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusMenu, setFocusMenu] = useState(false)
  const selRef = useRef<TextRange | null>(null)
  const openRef = useRef(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const savedRange = useRef<Range | null>(null)
  const mouseDown = useRef(false)
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const keyboardSpan = useRef<WordSpan | null>(null)
  const pressedAt = useRef(0)
  const chooseRef = useRef(onChoose)
  chooseRef.current = onChoose
  const words = useMemo(() => wordRanges(text), [text])

  const apply = useCallback((sel: TextRange | null, open: boolean) => {
    selRef.current = sel
    openRef.current = open && !!sel
    setSelection(sel)
    setMenuOpen(open && !!sel)
  }, [])

  const stopSettle = () => {
    if (settle.current !== undefined) clearTimeout(settle.current)
    settle.current = undefined
  }

  /** Reads the DOM selection. `how` says what caused the change. */
  const sync = useCallback(
    (how: 'keyboard' | 'pointer-up' | 'event') => {
      const root = rootRef.current
      if (!root) return
      const next = readSelection(root, text)
      if (!next) {
        // Focus moved into the menu (keyboard), or a tap on it cleared the selection (touch):
        // keep the selection the menu acts on.
        if (menuRef.current?.contains(document.activeElement)) return
        if (Date.now() - pressedAt.current < PRESS_GRACE_MS) return
        stopSettle()
        keyboardSpan.current = null
        if (selRef.current) apply(null, false)
        return
      }
      savedRange.current = liveRange(root)?.cloneRange() ?? savedRange.current
      const changed = !sameRange(selRef.current, next)
      if (how === 'keyboard' || how === 'pointer-up') {
        stopSettle()
        apply(next, true)
        return
      }
      if (!changed) return
      if (mouseDown.current) {
        // Mouse drag in progress: show the menu on release.
        apply(next, false)
        return
      }
      // Touch handles, Shift+click, select-all: wait until the selection settles.
      apply(next, openRef.current)
      stopSettle()
      settle.current = setTimeout(() => {
        settle.current = undefined
        if (selRef.current) apply(selRef.current, true)
      }, SETTLE_MS)
    },
    [apply, rootRef, text],
  )

  useEffect(() => {
    const onChange = () => sync('event')
    const onUp = () => {
      if (!mouseDown.current) return
      mouseDown.current = false
      // Some browsers update the selection just after mouseup.
      setTimeout(() => sync('pointer-up'), 0)
    }
    document.addEventListener('selectionchange', onChange)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('selectionchange', onChange)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      stopSettle()
    }
  }, [sync])

  const anchorRange = useCallback(() => {
    const root = rootRef.current
    return (root ? liveRange(root) : null) ?? savedRange.current
  }, [rootRef])

  const openMenu = useCallback(() => {
    if (!selRef.current) return
    stopSettle()
    apply(selRef.current, true)
    setFocusMenu(true)
  }, [apply])

  const dismiss = useCallback(
    (refocusBody: boolean) => {
      stopSettle()
      openRef.current = false
      setMenuOpen(false)
      setFocusMenu(false)
      if (refocusBody) rootRef.current?.focus({ preventScroll: true })
    },
    [rootRef],
  )

  const clear = useCallback(() => {
    stopSettle()
    pressedAt.current = 0
    keyboardSpan.current = null
    clearSelection()
    apply(null, false)
    setFocusMenu(false)
  }, [apply])

  const choose = useCallback(
    (type: NoteType) => {
      const sel = selRef.current
      if (!sel) return
      // Quick Add returns focus to its opener when it closes: make that the paragraph, not the menu.
      rootRef.current?.focus({ preventScroll: true })
      clear()
      chooseRef.current(sel, type)
    },
    [clear, rootRef],
  )

  /** The word span covering the current selection (keyboard model). */
  const currentSpan = (): WordSpan | null => {
    const sel = selRef.current
    if (!sel || words.length === 0) return null
    const kb = keyboardSpan.current
    if (kb) {
      const lo = Math.min(kb.anchor, kb.focus)
      const hi = Math.max(kb.anchor, kb.focus)
      if (words[lo]?.[0] === sel.start && words[hi]?.[1] === sel.end) return kb
    }
    const first = words.findIndex(([, e]) => e > sel.start)
    let last = -1
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i][0] < sel.end) {
        last = i
        break
      }
    }
    if (first < 0 || last < first) return null
    return { anchor: first, focus: last }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const root = rootRef.current
    const k = e.key
    if (root && (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End')) {
      if (words.length === 0) return
      e.preventDefault()
      const last = words.length - 1
      const cur = currentSpan()
      let next: WordSpan
      if (!cur) {
        const i = k === 'ArrowLeft' || k === 'End' ? last : 0
        next = { anchor: i, focus: i }
      } else if (e.shiftKey) {
        const f =
          k === 'ArrowRight' ? Math.min(cur.focus + 1, last) : k === 'ArrowLeft' ? Math.max(cur.focus - 1, 0) : k === 'Home' ? 0 : last
        next = { anchor: cur.anchor, focus: f }
      } else {
        const hi = Math.max(cur.anchor, cur.focus)
        const lo = Math.min(cur.anchor, cur.focus)
        const i = k === 'ArrowRight' ? Math.min(hi + 1, last) : k === 'ArrowLeft' ? Math.max(lo - 1, 0) : k === 'Home' ? 0 : last
        next = { anchor: i, focus: i }
      }
      keyboardSpan.current = next
      const lo = Math.min(next.anchor, next.focus)
      const hi = Math.max(next.anchor, next.focus)
      selectOffsets(root, words[lo][0], words[hi][1])
      sync('keyboard')
      keyboardSpan.current = next
      return
    }
    if (!selRef.current) return
    const n = /^[1-9]$/.test(k) ? Number(k) : 0
    if (n >= 1 && n <= SELECTION_NOTE_TYPES.length && !e.shiftKey) {
      e.preventDefault()
      choose(SELECTION_NOTE_TYPES[n - 1])
    } else if (k === 'Enter') {
      e.preventDefault()
      openMenu()
    } else if (k === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      clear()
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button === 0) {
      mouseDown.current = true
      stopSettle()
    }
  }

  const menuFocused = useCallback(() => setFocusMenu(false), [])
  const menuPressed = useCallback(() => {
    pressedAt.current = Date.now()
  }, [])

  return {
    selection,
    menuOpen,
    focusMenu,
    menuRef,
    anchorRange,
    openMenu,
    dismiss,
    choose,
    bodyHandlers: { onKeyDown, onPointerDown },
    menuFocused,
    menuPressed,
  }
}
