/**
 * Pure calendar math (brief §34). Months are 0–11, like Date#getMonth. Every day is a local DayKey.
 */
import { addDays, dayKeyToDate, isDayKey, toDayKey } from '@/lib/dates'
import type { DayKey, Note, Review } from '@/lib/types'

export interface DayStats {
  reviews: number
  notesAdded: number
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function keyOf(year: number, month: number, day: number): DayKey {
  return toDayKey(new Date(year, month, day))
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** First and last day of the month, for range queries. */
export function monthRange(year: number, month: number): { from: DayKey; to: DayKey } {
  return { from: keyOf(year, month, 1), to: keyOf(year, month, daysInMonth(year, month)) }
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/** "October 2026". */
export function monthTitle(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`
}

/** The study day of a note: its date_created, or the local day it was created when that is missing. */
export function noteDay(note: Pick<Note, 'date_created' | 'created_at'>): DayKey | null {
  if (isDayKey(note.date_created)) return note.date_created
  if (!note.created_at) return null
  const key = toDayKey(note.created_at)
  return isDayKey(key) ? key : null
}

/**
 * One entry per day of the month (zeros included). Reviews count by their stored local review_date,
 * notes by their study date. Records outside the month are ignored.
 */
export function aggregateMonth(
  year: number,
  month: number,
  notes: readonly Pick<Note, 'date_created' | 'created_at'>[],
  reviews: readonly Pick<Review, 'review_date'>[],
): Map<DayKey, DayStats> {
  const days = new Map<DayKey, DayStats>()
  for (let d = 1; d <= daysInMonth(year, month); d++) days.set(keyOf(year, month, d), { reviews: 0, notesAdded: 0 })
  for (const r of reviews) {
    const stats = days.get(r.review_date)
    if (stats) stats.reviews += 1
  }
  for (const n of notes) {
    const key = noteDay(n)
    const stats = key ? days.get(key) : undefined
    if (stats) stats.notesAdded += 1
  }
  return days
}

/** Calendar cells, Monday first, padded with null to whole weeks. */
export function monthGrid(year: number, month: number): (DayKey | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const cells: (DayKey | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(keyOf(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** "7 October". */
export function dayMonth(day: DayKey): string {
  const d = dayKeyToDate(day)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "7 October: 12 reviews, 3 notes added". */
export function dayAriaLabel(day: DayKey, stats: DayStats): string {
  if (stats.reviews === 0 && stats.notesAdded === 0) return `${dayMonth(day)}: nothing recorded`
  return `${dayMonth(day)}: ${plural(stats.reviews, 'review', 'reviews')}, ${plural(stats.notesAdded, 'note', 'notes')} added`
}

/** "12 reviews completed · 3 notes added". */
export function daySummary(stats: DayStats): string {
  const parts: string[] = []
  if (stats.reviews > 0) parts.push(`${plural(stats.reviews, 'review', 'reviews')} completed`)
  if (stats.notesAdded > 0) parts.push(`${plural(stats.notesAdded, 'note', 'notes')} added`)
  return parts.length > 0 ? parts.join(' · ') : 'Nothing recorded on this day.'
}

/** "Studied 14 days · 46 notes added · 210 reviews". A studied day has at least one review. */
export function monthSummary(days: ReadonlyMap<DayKey, DayStats>): string {
  let studied = 0
  let notes = 0
  let reviews = 0
  for (const s of days.values()) {
    if (s.reviews > 0) studied += 1
    notes += s.notesAdded
    reviews += s.reviews
  }
  if (studied === 0 && notes === 0) return 'Nothing recorded this month.'
  return `Studied ${plural(studied, 'day', 'days')} · ${plural(notes, 'note', 'notes')} added · ${plural(reviews, 'review', 'reviews')}`
}

/** Moves a day by n days (DST safe). */
export function shiftDay(day: DayKey, n: number): DayKey {
  return toDayKey(addDays(dayKeyToDate(day), n))
}

/** Monday-first weekday index, 0–6. */
export function weekdayIndex(day: DayKey): number {
  return (dayKeyToDate(day).getDay() + 6) % 7
}
