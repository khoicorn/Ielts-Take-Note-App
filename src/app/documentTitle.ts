/**
 * The browser tab title (WCAG 2.4.2): "Page · Upgrade Notebook".
 * <DocumentTitle /> names each route. A screen can give a more specific name with useDocumentTitle()
 * (a note, a paragraph, "Session complete"); the newest one wins while it is mounted.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router'

export const APP_TITLE = 'IELTS Upgrade Notebook'
const SUFFIX = 'Upgrade Notebook'
const MAX_TITLE_CHARS = 60

const ROUTE_TITLES: Readonly<Record<string, string>> = {
  '/': 'Today',
  '/review': 'Review',
  '/speaking': 'Speaking',
  '/writing': 'Writing',
  '/mistakes': 'My Mistakes',
  '/must-remember': 'Must Remember',
  '/notes': 'All Notes',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
  '/design': 'Design preview',
}

/** The page name for a router path (without the base path). */
export function routeTitle(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (ROUTE_TITLES[path]) return ROUTE_TITLES[path]
  if (/^\/notes\/[^/]+$/.test(path)) return 'Note'
  if (/^\/writing\/paragraphs\/[^/]+$/.test(path)) return 'Model paragraph'
  return 'Page not found'
}

/** "Page · Upgrade Notebook", with long names cut to one line. */
export function formatDocumentTitle(name: string): string {
  const clean = name.replace(/\s+/g, ' ').trim()
  if (!clean) return APP_TITLE
  const short = clean.length > MAX_TITLE_CHARS ? `${clean.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…` : clean
  return `${short} · ${SUFFIX}`
}

let base = ''
const overrides: { name: string }[] = []

function apply(): void {
  if (typeof document === 'undefined') return
  document.title = formatDocumentTitle(overrides[overrides.length - 1]?.name ?? base)
}

/** A more specific tab title while the calling component is mounted. Empty or null keeps the route's name. */
export function useDocumentTitle(name: string | null | undefined): void {
  useEffect(() => {
    if (!name || !name.trim()) return
    const entry = { name }
    overrides.push(entry)
    apply()
    return () => {
      const i = overrides.indexOf(entry)
      if (i !== -1) overrides.splice(i, 1)
      apply()
    }
  }, [name])
}

/** Names the current route in the tab title. Render once, inside the router. */
export function DocumentTitle(): null {
  const { pathname } = useLocation()
  useEffect(() => {
    base = routeTitle(pathname)
    apply()
  }, [pathname])
  return null
}
