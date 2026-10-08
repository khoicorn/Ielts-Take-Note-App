/**
 * The active filters of All Notes as removable tags ("Mode: Writing", "Error: Prepositions").
 */
import { formatShortDate } from '@/lib/dates'
import type { SortKey } from '@/lib/filters'
import { MASTERY, MODE_LABELS, noteTypeLabel, taskTypeLabel } from '@/lib/taxonomy'
import type { NoteFilter, ReviewStatusFilter } from '@/lib/types'

export interface FilterTag {
  key: string
  /** Shown in graphite before the value, e.g. "Mode". Empty for self-explaining tags ("Must Remember"). */
  prefix: string
  value: string
  remove: (f: NoteFilter) => NoteFilter
}

export const REVIEW_STATUS_LABELS: Readonly<Record<ReviewStatusFilter, string>> = {
  due: 'Due now',
  new: 'New',
  scheduled: 'Scheduled later',
  unscheduled: 'Not scheduled',
}

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'created_desc', label: 'Newest' },
  { value: 'created_asc', label: 'Oldest' },
  { value: 'next_review', label: 'Next review' },
  { value: 'topic', label: 'Topic' },
  { value: 'mastery', label: 'Mastery' },
]

export function parseSort(v: string | null): SortKey {
  return SORT_OPTIONS.find((o) => o.value === v)?.value ?? 'created_desc'
}

function without<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = (list ?? []).filter((v) => v !== value)
  return next.length ? next : undefined
}

export function filterTags(f: NoteFilter): FilterTag[] {
  const tags: FilterTag[] = []
  if (f.mode) tags.push({ key: 'mode', prefix: 'Mode', value: MODE_LABELS[f.mode], remove: (x) => ({ ...x, mode: undefined }) })
  for (const t of f.topics ?? []) {
    tags.push({ key: `topic-${t}`, prefix: 'Topic', value: t, remove: (x) => ({ ...x, topics: without(x.topics, t) }) })
  }
  if (f.task_type) {
    tags.push({ key: 'task', prefix: 'Task', value: taskTypeLabel(f.task_type), remove: (x) => ({ ...x, task_type: undefined }) })
  }
  for (const e of f.error_types ?? []) {
    tags.push({ key: `error-${e}`, prefix: 'Error', value: e, remove: (x) => ({ ...x, error_types: without(x.error_types, e) }) })
  }
  for (const t of f.note_types ?? []) {
    tags.push({ key: `type-${t}`, prefix: 'Type', value: noteTypeLabel(t), remove: (x) => ({ ...x, note_types: without(x.note_types, t) }) })
  }
  for (const m of f.mastery ?? []) {
    tags.push({ key: `mastery-${m}`, prefix: 'Mastery', value: MASTERY[m].label, remove: (x) => ({ ...x, mastery: without(x.mastery, m) }) })
  }
  if (f.review_status) {
    tags.push({
      key: 'status',
      prefix: 'Review',
      value: REVIEW_STATUS_LABELS[f.review_status],
      remove: (x) => ({ ...x, review_status: undefined }),
    })
  }
  if (f.favorite) tags.push({ key: 'fav', prefix: '', value: 'Must Remember', remove: (x) => ({ ...x, favorite: undefined }) })
  if (f.date_from) {
    tags.push({ key: 'from', prefix: 'From', value: formatShortDate(f.date_from), remove: (x) => ({ ...x, date_from: undefined }) })
  }
  if (f.date_to) {
    tags.push({ key: 'to', prefix: 'To', value: formatShortDate(f.date_to), remove: (x) => ({ ...x, date_to: undefined }) })
  }
  return tags
}

/** Every filter cleared. The archived view stays as it is. */
export function clearFilters(f: NoteFilter): NoteFilter {
  return f.archived ? { archived: true } : {}
}
