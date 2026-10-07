/**
 * Error Ledger (brief §28): repeated habits grouped by error type and pattern.
 */
import { daysBetween, timeOf, todayKey } from './dates'
import { normalizeText } from './text'
import type { ISODateTime, Note } from './types'

export interface LedgerPattern {
  key: string
  error_pattern: string
  fix_pattern: string
  seen: number
  notes: Note[]
  last_seen_at: ISODateTime
}

export interface LedgerGroup {
  error_type: string
  seen: number
  patterns: LedgerPattern[]
  loose: Note[]
}

const OTHER = 'Other'

function newestFirst(a: Note, b: Note): number {
  return timeOf(b.created_at) - timeOf(a.created_at)
}

/** When the habit last showed up: creation, or the last "I made this mistake again" (which updates the note). */
function lastSeen(n: Note): ISODateTime {
  return n.times_seen > 1 && timeOf(n.updated_at) > timeOf(n.created_at) ? n.updated_at : n.created_at
}

function canonicalType(errorType: string, order: readonly string[]): string {
  const t = errorType.trim()
  if (!t) return OTHER
  return order.find((o) => o.toLowerCase() === t.toLowerCase()) ?? t
}

function buildPattern(key: string, notes: Note[]): LedgerPattern {
  const sorted = [...notes].sort(newestFirst)
  const lastSeenAt = sorted.map(lastSeen).reduce((a, b) => (timeOf(b) > timeOf(a) ? b : a))
  return {
    key,
    error_pattern: sorted[0].error_pattern.trim(),
    fix_pattern: sorted.find((n) => n.fix_pattern.trim())?.fix_pattern.trim() ?? '',
    seen: sorted.reduce((sum, n) => sum + n.times_seen, 0),
    notes: sorted,
    last_seen_at: lastSeenAt,
  }
}

function buildGroup(errorType: string, notes: Note[]): LedgerGroup {
  const byPattern = new Map<string, Note[]>()
  const loose: Note[] = []
  for (const n of notes) {
    const key = normalizeText(n.error_pattern)
    if (!key) {
      loose.push(n)
      continue
    }
    const list = byPattern.get(key)
    if (list) list.push(n)
    else byPattern.set(key, [n])
  }
  const patterns = [...byPattern].map(([key, list]) => buildPattern(key, list))
  patterns.sort((a, b) => b.seen - a.seen || timeOf(b.last_seen_at) - timeOf(a.last_seen_at) || a.key.localeCompare(b.key))
  return {
    error_type: errorType,
    seen: notes.reduce((sum, n) => sum + n.times_seen, 0),
    patterns,
    loose: loose.sort(newestFirst),
  }
}

export function buildLedger(notes: Note[], errorTypeOrder: readonly string[]): LedgerGroup[] {
  const byType = new Map<string, Note[]>()
  for (const n of notes) {
    if (n.is_archived || (!n.error_type.trim() && !n.error_pattern.trim())) continue
    const type = canonicalType(n.error_type, errorTypeOrder)
    const list = byType.get(type)
    if (list) list.push(n)
    else byType.set(type, [n])
  }
  const rank = (type: string) => {
    if (type === OTHER) return Number.MAX_SAFE_INTEGER
    const i = errorTypeOrder.indexOf(type)
    return i >= 0 ? i : errorTypeOrder.length
  }
  return [...byType]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([type, list]) => buildGroup(type, list))
}

export function mostRepeatedIssue(notes: Note[], now: Date, days = 7): { error_type: string; count: number } | null {
  const today = todayKey(now)
  const counts = new Map<string, number>()
  for (const n of notes) {
    const type = n.error_type.trim()
    if (n.is_archived || !type) continue
    const age = daysBetween(n.date_created, today)
    if (age < 0 || age >= days) continue
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }
  const top = [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0]
  return top && top[1] >= 2 ? { error_type: top[0], count: top[1] } : null
}

export function errorTypeSlug(errorType: string): string {
  return normalizeText(errorType)
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
