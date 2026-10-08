/**
 * Review microcopy (brief §36). Calm and plain, no exclamation marks.
 * Date-based lines take `now` so tests can pin time.
 */
import { daysBetween, formatShortDate, toDayKey, todayKey } from '@/lib/dates'
import type { DueCounts } from '@/lib/hooks'
import type { ISODateTime, Mode, Note } from '@/lib/types'

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export const REVEAL_HINT = 'Say it aloud first, then reveal.'
export const RATE_HINT = 'How well did you recall it?'
export const AGAIN_FEEDBACK = 'Review again soon.'
export const MASTERED_FEEDBACK = 'Marked as mastered.'

export function reviewedLine(n: number): string {
  return `${plural(n, 'note', 'notes')} reviewed.`
}

export function againLine(n: number): string {
  return `${n} to see again soon.`
}

/** "N days of consistent study." Only from 2 days, so one day never reads as a streak. */
export function streakLine(days: number | undefined): string | null {
  return days !== undefined && days >= 2 ? `${days} days of consistent study.` : null
}

/** "tomorrow", "in 3 days", "on 21 Oct". */
export function whenPhrase(next: ISODateTime, now: Date): string {
  const days = daysBetween(todayKey(now), toDayKey(next))
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 14) return `in ${days} days`
  return `on ${formatShortDate(next, now)}`
}

/** Empty state body: "Next review tomorrow · 3 notes", or a plain invitation when nothing is scheduled. */
export function emptyBody(counts: DueCounts | undefined, now: Date): string {
  if (!counts?.nextDueAt) return 'Add notes and they will appear here.'
  return `Next review ${whenPhrase(counts.nextDueAt, now)} · ${plural(counts.nextDueCount, 'note', 'notes')}`
}

/** For a one-mode session with nothing due while the other mode has notes waiting. */
export function otherModeLine(otherLabel: string, count: number): string {
  return `${plural(count, `${otherLabel} note is`, `${otherLabel} notes are`)} waiting.`
}

export function otherMode(mode: Mode): Mode {
  return mode === 'speaking' ? 'writing' : 'speaking'
}

/** "Back tomorrow" when every listed note returns tomorrow. Otherwise nothing. */
export function backLabel(notes: Note[], now: Date): string | null {
  if (notes.length === 0) return null
  const all = notes.every((n) => n.next_review_at !== null && whenPhrase(n.next_review_at, now) === 'tomorrow')
  return all ? 'Back tomorrow' : null
}
