/**
 * Small helpers for the Note Detail screen: the router state it reads, the back link label, and date text.
 */
import { formatShortDate, toDate } from '@/lib/dates'
import type { DayKey } from '@/lib/types'

/**
 * What a list passes in `location.state` when it opens a note.
 * from: where the back link goes. ids: the list order, for ‹ › and the [ ] keys.
 */
export interface DetailState {
  from?: string
  fromLabel?: string
  ids?: string[]
}

export function readDetailState(state: unknown): DetailState {
  if (!state || typeof state !== 'object') return {}
  const raw = state as Record<string, unknown>
  const out: DetailState = {}
  if (typeof raw.from === 'string' && raw.from.startsWith('/')) out.from = raw.from
  if (typeof raw.fromLabel === 'string' && raw.fromLabel.trim()) out.fromLabel = raw.fromLabel.trim()
  if (Array.isArray(raw.ids) && raw.ids.every((v) => typeof v === 'string')) out.ids = raw.ids as string[]
  return out
}

/** Longest prefix first, so /writing/paragraphs wins over /writing. */
const BACK_LABELS: readonly [string, string][] = [
  ['/writing/paragraphs/', 'Model paragraph'],
  ['/must-remember', 'Must Remember'],
  ['/mistakes', 'My Mistakes'],
  ['/speaking', 'Speaking'],
  ['/writing', 'Writing'],
  ['/calendar', 'Calendar'],
  ['/review', 'Review'],
  ['/notes/', 'Back'],
  // Page names, as in the navigation ("All Notes", "My Mistakes").
  ['/notes', 'All Notes'],
]

/** The toast after "I made this mistake again". */
export const SEEN_AGAIN = 'Marked as seen again. It is back in today’s review.'

/** "All Notes", "Speaking", "Today"… for the back link. */
export function backLabel(state: DetailState): string {
  if (state.fromLabel) return state.fromLabel
  const path = (state.from ?? '/notes').split(/[?#]/)[0]
  if (path === '/' || path === '') return 'Today'
  return BACK_LABELS.find(([prefix]) => path.startsWith(prefix))?.[1] ?? 'Back'
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Tue 6 Oct" (or "Tue 6 Oct 2025" in another year). */
export function formatDayWithWeekday(day: DayKey, now: Date = new Date()): string {
  const d = toDate(day)
  if (Number.isNaN(d.getTime())) return day
  return `${WEEKDAYS_SHORT[d.getDay()]} ${formatShortDate(d, now)}`
}

/** "1 time", "4 times". */
export function times(n: number): string {
  return `${n} ${n === 1 ? 'time' : 'times'}`
}
