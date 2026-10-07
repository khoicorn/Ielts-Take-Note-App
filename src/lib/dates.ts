/**
 * Local-time date helpers. Every function works in the browser's time zone,
 * so "today" and due dates match the learner's calendar, not UTC.
 */
import type { DayKey, ISODateTime } from './types'

const DAY_MS = 86_400_000
const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Milliseconds for an ISO date-time; 0 for null or unparseable values. Use for sorting. */
export function timeOf(iso: ISODateTime | null | undefined): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

export function isDayKey(s: string): boolean {
  return DAY_KEY_RE.test(s)
}

/** Accepts a Date, an ISO date-time or a day key. Day keys become local midnight. */
export function toDate(d: Date | ISODateTime | DayKey): Date {
  if (d instanceof Date) return d
  return isDayKey(d) ? dayKeyToDate(d) : new Date(d)
}

export function toDayKey(d: Date | ISODateTime): DayKey {
  if (typeof d === 'string' && isDayKey(d)) return d
  const date = toDate(d)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now)
}

export function dayKeyToDate(k: DayKey): Date {
  const m = DAY_KEY_RE.exec(k)
  if (!m) return new Date(Number.NaN)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/** Moves by calendar days and keeps the wall-clock time, so DST changes do not shift the day. */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime())
  r.setDate(r.getDate() + n)
  return r
}

export function daysBetween(from: DayKey, to: DayKey): number {
  const utc = (k: DayKey) => {
    const d = dayKeyToDate(k)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return Math.round((utc(to) - utc(from)) / DAY_MS)
}

export function formatLongDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatShortDate(d: Date | ISODateTime | DayKey, now: Date = new Date()): string {
  const date = toDate(d)
  const base = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`
}

export function formatRelativeDay(d: Date | ISODateTime | DayKey, now: Date = new Date()): string {
  const diff = daysBetween(toDayKey(toDate(d)), todayKey(now))
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff >= 2 && diff <= 6) return `${diff} days ago`
  return formatShortDate(d, now)
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`
}

export function formatInterval(days: number): string {
  const n = Math.round(days)
  if (n <= 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n < 7) return plural(n, 'day')
  if (n < 30) return plural(Math.round(n / 7), 'week')
  return plural(Math.round(n / 30), 'month')
}

export function formatDue(next: ISODateTime | null, now: Date = new Date()): string {
  if (next === null) return 'Not scheduled'
  const due = new Date(next)
  if (due.getTime() <= endOfDay(now).getTime()) return 'Due today'
  const days = daysBetween(todayKey(now), toDayKey(due))
  if (days === 1) return 'Tomorrow'
  if (days < 14) return `In ${days} days`
  return formatShortDate(due, now)
}
