/**
 * Pure aggregates behind the live hooks: due counts, study streak, label lists.
 */
import { addDays, timeOf, toDayKey, todayKey } from './dates'
import { isDue } from './srs'
import type { DayKey, ISODateTime, Note } from './types'

export interface DueCounts {
  total: number
  speaking: number
  writing: number
  /** Earliest review after today, among notes that are not due yet. */
  nextDueAt: ISODateTime | null
  /** Notes due on the same local day as nextDueAt. */
  nextDueCount: number
}

export function computeDueCounts(notes: Note[], now: Date): DueCounts {
  const counts: DueCounts = { total: 0, speaking: 0, writing: 0, nextDueAt: null, nextDueCount: 0 }
  const later: Note[] = []
  for (const n of notes) {
    if (n.is_archived || n.next_review_at === null) continue
    if (isDue(n, now)) {
      counts.total += 1
      counts[n.mode] += 1
    } else {
      later.push(n)
    }
  }
  if (later.length > 0) {
    const first = later.reduce((a, b) => (timeOf(b.next_review_at) < timeOf(a.next_review_at) ? b : a))
    const day = toDayKey(first.next_review_at as ISODateTime)
    counts.nextDueAt = first.next_review_at
    counts.nextDueCount = later.filter((n) => toDayKey(n.next_review_at as ISODateTime) === day).length
  }
  return counts
}

/** Consecutive local days with activity, ending today, or yesterday when nothing happened yet today. */
export function studyStreak(activeDays: ReadonlySet<DayKey>, now: Date): number {
  let day = now
  if (!activeDays.has(todayKey(day))) day = addDays(day, -1)
  let streak = 0
  while (activeDays.has(toDayKey(day))) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

/** Joins label lists in order, trimmed, skipping empty values and case-insensitive repeats (first spelling wins). */
export function mergeLabels(...lists: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const raw of list) {
      const label = raw.trim()
      const key = label.toLowerCase()
      if (!label || seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
  }
  return out
}
