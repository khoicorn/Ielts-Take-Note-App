/**
 * Plain-English lines for the Today screen (brief §5, §36; design §11). Pure, so tests can pin `now`.
 */
import { daysBetween, formatRelativeDay, formatShortDate, toDayKey, todayKey } from '@/lib/dates'
import { MODE_LABELS, taskTypeLabel } from '@/lib/taxonomy'
import type { ISODateTime, LastStudied } from '@/lib/types'

/** Notes needed before Today suggests a backup. */
export const BACKUP_MIN_NOTES = 10
/** Days without an export before Today suggests a backup. */
export const BACKUP_MAX_AGE_DAYS = 14

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "Your notebook has 12 items waiting for review." */
export function dueLine(total: number): string {
  if (total <= 0) return 'Nothing is waiting for review today.'
  return `Your notebook has ${plural(total, 'item', 'items')} waiting for review.`
}

export function notesCount(n: number): string {
  return plural(n, 'note', 'notes')
}

/** Shown in place of Begin Review when nothing is due: "Next review tomorrow · 3 notes". */
export function nextReviewLine(nextDueAt: ISODateTime | null, count: number, now: Date = new Date()): string {
  if (!nextDueAt) return 'No reviews scheduled.'
  const days = daysBetween(todayKey(now), toDayKey(nextDueAt))
  const when =
    days <= 0 ? 'today' : days === 1 ? 'tomorrow' : days < 14 ? `in ${days} days` : `on ${formatShortDate(nextDueAt, now)}`
  return `Next review ${when} · ${notesCount(count)}`
}

/** "Last studied yesterday", "Last studied 3 days ago", "Last studied on 27 Sep". */
export function lastStudiedLine(at: ISODateTime, now: Date = new Date()): string {
  const rel = formatRelativeDay(at, now)
  return /^\d/.test(rel) && !rel.includes('ago') ? `Last studied on ${rel}` : `Last studied ${rel}`
}

/** Where "Continue studying" points, and how it reads: a small kicker, then the topic in serif. */
export function continueTarget(ls: LastStudied): { kicker: string; title: string; to: string } {
  const topic = ls.topic.trim()
  const task = ls.mode === 'writing' ? ls.task_type : ''
  const taskLabel = task ? taskTypeLabel(task) : ''
  const params = new URLSearchParams()
  if (task) params.set('tab', task)
  if (topic) params.set('topic', topic)
  const query = params.toString()
  const to = `/${ls.mode}${query ? `?${query}` : ''}`
  if (topic) return { kicker: taskLabel || MODE_LABELS[ls.mode], title: topic, to }
  return { kicker: MODE_LABELS[ls.mode], title: taskLabel || 'All topics', to }
}

/**
 * The quiet backup reminder (design §11): only with 10+ notes and no export in the last 14 days.
 * The "Export a copy." link is added by the screen. Returns null when no reminder is needed.
 */
export function backupLine(noteCount: number, lastExportAt: ISODateTime | null, now: Date = new Date()): string | null {
  if (noteCount < BACKUP_MIN_NOTES) return null
  if (!lastExportAt) return 'No backup yet.'
  const days = daysBetween(toDayKey(lastExportAt), todayKey(now))
  return days > BACKUP_MAX_AGE_DAYS ? `Last backup ${days} days ago.` : null
}
