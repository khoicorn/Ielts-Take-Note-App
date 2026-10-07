/**
 * All Notes filters and sorting (brief §31). Filters live in the URL query.
 */
import { endOfDay, isDayKey, timeOf } from './dates'
import { isDue } from './srs'
import { MASTERY_ORDER, NOTE_TYPES } from './taxonomy'
import type { MasteryStatus, Mode, Note, NoteFilter, NoteType, ReviewStatusFilter, TaskType } from './types'

export type SortKey = 'created_desc' | 'created_asc' | 'next_review' | 'topic' | 'mastery'

const MODES: readonly Mode[] = ['speaking', 'writing']
const TASKS: readonly Exclude<TaskType, ''>[] = ['task1', 'task2']
const NOTE_TYPE_VALUES: readonly NoteType[] = NOTE_TYPES.map((t) => t.value)
const STATUSES: readonly ReviewStatusFilter[] = ['due', 'scheduled', 'unscheduled', 'new']

/** URL keys owned by the filter. Other keys in the query are left alone. */
const KEYS = ['mode', 'topic', 'task', 'error', 'type', 'mastery', 'status', 'fav', 'from', 'to', 'archived'] as const

function lower(s: string): string {
  return s.trim().toLowerCase()
}

function matchesReviewStatus(n: Note, status: ReviewStatusFilter, now: Date): boolean {
  switch (status) {
    case 'due':
      return isDue(n, now)
    case 'new':
      return n.times_reviewed === 0
    case 'scheduled':
      return n.next_review_at !== null && timeOf(n.next_review_at) > endOfDay(now).getTime()
    case 'unscheduled':
      return n.next_review_at === null
  }
}

export function applyFilter(notes: Note[], f: NoteFilter, now: Date): Note[] {
  const topics = f.topics?.length ? new Set(f.topics.map(lower)) : null
  const errors = f.error_types?.length ? new Set(f.error_types.map(lower)) : null
  const types = f.note_types?.length ? new Set(f.note_types) : null
  const mastery = f.mastery?.length ? new Set(f.mastery) : null
  return notes.filter(
    (n) =>
      n.is_archived === Boolean(f.archived) &&
      (!f.mode || n.mode === f.mode) &&
      (!topics || topics.has(lower(n.topic))) &&
      (!f.task_type || n.task_type === f.task_type) &&
      (!errors || errors.has(lower(n.error_type))) &&
      (!types || types.has(n.note_type)) &&
      (!mastery || mastery.has(n.mastery_status)) &&
      (!f.review_status || matchesReviewStatus(n, f.review_status, now)) &&
      (!f.favorite || n.is_favorite) &&
      (!f.date_from || n.date_created >= f.date_from) &&
      (!f.date_to || n.date_created <= f.date_to),
  )
}

function newestFirst(a: Note, b: Note): number {
  return b.date_created.localeCompare(a.date_created) || timeOf(b.created_at) - timeOf(a.created_at)
}

const COMPARATORS: Readonly<Record<SortKey, (a: Note, b: Note) => number>> = {
  created_desc: newestFirst,
  created_asc: (a, b) => -newestFirst(a, b),
  next_review: (a, b) => {
    if (a.next_review_at === null || b.next_review_at === null) {
      return Number(a.next_review_at === null) - Number(b.next_review_at === null) || newestFirst(a, b)
    }
    return timeOf(a.next_review_at) - timeOf(b.next_review_at) || timeOf(a.created_at) - timeOf(b.created_at)
  },
  topic: (a, b) => {
    const empty = Number(!a.topic.trim()) - Number(!b.topic.trim())
    return empty || a.topic.localeCompare(b.topic, undefined, { sensitivity: 'base' }) || newestFirst(a, b)
  },
  mastery: (a, b) => MASTERY_ORDER.indexOf(a.mastery_status) - MASTERY_ORDER.indexOf(b.mastery_status) || newestFirst(a, b),
}

export function sortNotes(notes: Note[], key: SortKey): Note[] {
  return [...notes].sort(COMPARATORS[key])
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

function manyOf<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v))
}

function nonEmpty(values: string[]): string[] {
  return values.map((v) => v.trim()).filter(Boolean)
}

export function filterFromSearchParams(sp: URLSearchParams): NoteFilter {
  const f: NoteFilter = {}
  const mode = oneOf(sp.get('mode'), MODES)
  if (mode) f.mode = mode
  const topics = nonEmpty(sp.getAll('topic'))
  if (topics.length) f.topics = topics
  const task = oneOf(sp.get('task'), TASKS)
  if (task) f.task_type = task
  const errors = nonEmpty(sp.getAll('error'))
  if (errors.length) f.error_types = errors
  const types = manyOf(sp.getAll('type'), NOTE_TYPE_VALUES)
  if (types.length) f.note_types = types
  const mastery = manyOf<MasteryStatus>(sp.getAll('mastery'), MASTERY_ORDER)
  if (mastery.length) f.mastery = mastery
  const status = oneOf(sp.get('status'), STATUSES)
  if (status) f.review_status = status
  if (sp.get('fav') === '1') f.favorite = true
  const from = sp.get('from')
  if (from && isDayKey(from)) f.date_from = from
  const to = sp.get('to')
  if (to && isDayKey(to)) f.date_to = to
  if (sp.get('archived') === '1') f.archived = true
  return f
}

export function filterToSearchParams(f: NoteFilter, base?: URLSearchParams): URLSearchParams {
  const sp = new URLSearchParams(base)
  for (const key of KEYS) sp.delete(key)
  if (f.mode) sp.set('mode', f.mode)
  for (const t of f.topics ?? []) sp.append('topic', t)
  if (f.task_type) sp.set('task', f.task_type)
  for (const e of f.error_types ?? []) sp.append('error', e)
  for (const t of f.note_types ?? []) sp.append('type', t)
  for (const m of f.mastery ?? []) sp.append('mastery', m)
  if (f.review_status) sp.set('status', f.review_status)
  if (f.favorite) sp.set('fav', '1')
  if (f.date_from) sp.set('from', f.date_from)
  if (f.date_to) sp.set('to', f.date_to)
  if (f.archived) sp.set('archived', '1')
  return sp
}

/** One count per filter control (a date range counts once). Archived is a view, not a filter. */
export function countActiveFilters(f: NoteFilter): number {
  return [
    Boolean(f.mode),
    Boolean(f.topics?.length),
    Boolean(f.task_type),
    Boolean(f.error_types?.length),
    Boolean(f.note_types?.length),
    Boolean(f.mastery?.length),
    Boolean(f.review_status),
    Boolean(f.favorite),
    Boolean(f.date_from || f.date_to),
  ].filter(Boolean).length
}
