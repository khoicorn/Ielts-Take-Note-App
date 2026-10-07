import { useEffect, useRef } from 'react'

/**
 * Keyboard shortcuts.
 * Key syntax: 'n', 'shift+?', 'mod+k' (mod = Ctrl on Windows/Linux, Cmd on macOS), 'mod+enter',
 * 'mod+shift+enter', 'escape', 'space', '1', 'arrowup', and two-key chords 'g t'.
 * Single keys never fire while typing in a field, unless listed in allowInInputs.
 */

const CHORD_MS = 1200

const NON_TYPING_INPUTS = new Set(['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file', 'image'])

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false
  const el = target as HTMLElement
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') return !NON_TYPING_INPUTS.has(((el as HTMLInputElement).type || 'text').toLowerCase())
  if (el.isContentEditable) return true
  const editable = el.closest('[contenteditable]')
  return !!editable && editable.getAttribute('contenteditable') !== 'false'
}

interface Combo {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

const KEY_ALIASES: Record<string, string> = {
  ' ': 'space',
  spacebar: 'space',
  esc: 'escape',
  return: 'enter',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
}

function normalizeKeyName(k: string): string {
  const lower = k.toLowerCase()
  return KEY_ALIASES[lower] ?? lower
}

function parseCombo(s: string): Combo {
  const parts = s.toLowerCase().split('+')
  // A trailing '+' means the plus key itself ('shift++').
  let key = parts.pop() ?? ''
  if (key === '' && s.endsWith('+')) {
    key = '+'
    parts.pop()
  }
  return {
    mod: parts.includes('mod') || parts.includes('ctrl') || parts.includes('meta') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    key: normalizeKeyName(key),
  }
}

/** The key name of an event, using the physical key for letters on non-Latin layouts. */
function eventKey(e: KeyboardEvent): string {
  const k = normalizeKeyName(e.key ?? '')
  if (k.length === 1 && /[a-z]/.test(k)) return k
  if (k.length === 1 && e.code && /^Key[A-Z]$/.test(e.code) && !/[0-9\p{P}\p{S}]/u.test(k)) {
    return e.code.slice(3).toLowerCase()
  }
  return k
}

function matches(c: Combo, e: KeyboardEvent): boolean {
  const key = eventKey(e)
  if (key !== c.key) return false
  const mod = e.ctrlKey || e.metaKey
  if (mod !== c.mod) return false
  if (e.altKey !== c.alt) return false
  // Symbols like '?' already imply Shift on most layouts, so Shift is only checked for letters and named keys.
  const isSymbol = c.key.length === 1 && !/[a-z]/.test(c.key)
  if (!isSymbol && e.shiftKey !== c.shift) return false
  return true
}

interface Binding {
  raw: string
  steps: Combo[]
}

function parseBinding(raw: string): Binding {
  // 'g t' is a chord; 'space' is a single key.
  const steps = raw.trim().split(/\s+/).map(parseCombo)
  return { raw, steps }
}

export function useHotkeys(
  bindings: Record<string, (e: KeyboardEvent) => void>,
  opts?: { enabled?: boolean; allowInInputs?: string[] },
): void {
  const enabled = opts?.enabled ?? true
  const bindingsRef = useRef(bindings)
  const allowRef = useRef(opts?.allowInInputs ?? [])
  bindingsRef.current = bindings
  allowRef.current = opts?.allowInInputs ?? []

  useEffect(() => {
    if (!enabled) return
    let pending: { first: Combo; at: number } | null = null

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return
      const typing = isTypingTarget(e.target)
      const allowed = new Set(allowRef.current)
      const parsed = Object.keys(bindingsRef.current).map(parseBinding)
      const now = Date.now()

      // Second key of a chord.
      if (pending && now - pending.at <= CHORD_MS) {
        const first = pending.first
        pending = null
        for (const b of parsed) {
          if (b.steps.length !== 2) continue
          const [a, second] = b.steps
          if (a.key === first.key && a.mod === first.mod && matches(second, e)) {
            if (typing && !allowed.has(b.raw)) return
            e.preventDefault()
            bindingsRef.current[b.raw]?.(e)
            return
          }
        }
      }
      pending = null

      for (const b of parsed) {
        if (b.steps.length !== 1 || !matches(b.steps[0], e)) continue
        if (typing && !allowed.has(b.raw)) continue
        e.preventDefault()
        bindingsRef.current[b.raw]?.(e)
        return
      }

      // First key of a chord.
      if (!typing && !e.repeat) {
        const starts = parsed.find((b) => b.steps.length === 2 && matches(b.steps[0], e))
        if (starts) pending = { first: starts.steps[0], at: now }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
