import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { getSettings, updateSettings } from '@/lib/repo'
import type { ThemePreference } from '@/lib/types'

export const THEME_STORAGE_KEY = 'ielts-theme'

/** Browser UI color per theme (matches --page). */
export const THEME_COLORS: Record<'light' | 'dark', string> = {
  light: '#F5F1E8',
  dark: '#141319',
}

interface ThemeApi {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (p: ThemePreference) => void
}

const ThemeContext = createContext<ThemeApi | null>(null)

function isPreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark'
}

function readStored(): ThemePreference | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return isPreference(v) ? v : null
  } catch {
    return null
  }
}

function writeStored(p: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, p)
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemIsDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  for (const meta of Array.from(document.querySelectorAll('meta[name="theme-color"]'))) {
    meta.setAttribute('content', THEME_COLORS[resolved])
  }
}

/**
 * Light, dark or system theme. Writes localStorage 'ielts-theme' (read by index.html before first paint),
 * sets <html data-theme>, updates <meta name="theme-color">, and saves the choice in Settings.
 */
export function ThemeProvider(props: { children: React.ReactNode }): React.JSX.Element {
  const [preference, setPref] = useState<ThemePreference>(() => readStored() ?? 'system')
  const [systemDark, setSystemDark] = useState(systemIsDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // No stored choice in this browser (cleared site data): take the one saved in the notebook.
  useEffect(() => {
    if (readStored()) return
    let cancelled = false
    getSettings()
      .then((s) => {
        if (!cancelled && isPreference(s.theme) && s.theme !== 'system' && !readStored()) {
          setPref(s.theme)
          writeStored(s.theme)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const resolved: 'light' | 'dark' = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useLayoutEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p)
    writeStored(p)
    const next = p === 'system' ? (systemIsDark() ? 'dark' : 'light') : p
    applyTheme(next)
    updateSettings({ theme: p }).catch(() => {})
  }, [])

  const api = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])
  return <ThemeContext.Provider value={api}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>.')
  return ctx
}
