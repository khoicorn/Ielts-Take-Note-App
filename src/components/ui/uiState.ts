/**
 * Small UI-state hooks shared by screens: media queries for the breakpoints, and choices remembered per browser.
 */
import { useCallback, useState, useSyncExternalStore } from 'react'

/** True while the media query matches. Reads synchronously on first render, so the layout does not flash. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
    },
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

/** ≥1024px: sidebar layout, tables and the sticky topic index. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
/** <640px: bottom bar, full-screen sheets. */
export const MOBILE_QUERY = '(max-width: 639px)'

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * A string choice remembered in localStorage (a per-browser convenience, like the list view).
 * Storage errors (private windows, blocked storage) fall back to the default without breaking the page.
 */
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, allowed, fallback))
  const set = useCallback(
    (v: T) => {
      setValue(v)
      try {
        localStorage.setItem(key, v)
      } catch {
        /* storage unavailable: keep the choice for this visit only */
      }
    },
    [key],
  )
  return [value, set]
}

