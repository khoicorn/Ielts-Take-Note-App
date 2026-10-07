/**
 * Live data for screens. Each hook wraps useLiveQuery, so screens update when data changes.
 * `undefined` means "still loading".
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from './db'
import { addDays, startOfDay, todayKey } from './dates'
import { applyFilter, sortNotes } from './filters'
import { getSettings, META_KEYS, readLastStudied } from './repo'
import { computeDueCounts, mergeLabels, studyStreak } from './stats'
import type { DueCounts } from './stats'
import { ERROR_TYPES, SPEAKING_TOPICS, writingTopicsFor } from './taxonomy'
import type { DayKey, ISODateTime, LastStudied, Mode, Note, NoteFilter, Paragraph, Review, Settings, TaskType } from './types'
import { DEFAULT_SETTINGS } from './types'

export type { DueCounts } from './stats'

/**
 * The local day key, updated at midnight and when the tab becomes visible again,
 * so due counts do not go stale when the app stays open overnight.
 */
function useToday(): DayKey {
  const [day, setDay] = useState(() => todayKey())
  useEffect(() => {
    const refresh = () => setDay(todayKey())
    const now = new Date()
    const msToMidnight = startOfDay(addDays(now, 1)).getTime() - now.getTime() + 1000
    const timer = window.setTimeout(refresh, msToMidnight)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [day])
  return day
}

function newestFirst<T extends { created_at: ISODateTime }>(a: T, b: T): number {
  return b.created_at.localeCompare(a.created_at)
}

export function useNotes(filter?: NoteFilter): Note[] | undefined {
  const day = useToday()
  const key = JSON.stringify(filter ?? {})
  return useLiveQuery(async () => {
    const notes = await db.notes.toArray()
    return sortNotes(applyFilter(notes, filter ?? {}, new Date()), 'created_desc')
    // `key` stands in for `filter`, so a new object with the same values does not re-run the query.
  }, [key, day])
}

export function useNote(id: string | undefined): Note | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.notes.get(id)) ?? null) : null), [id])
}

export function useNoteReviews(noteId: string | undefined): Review[] | undefined {
  return useLiveQuery(async () => {
    if (!noteId) return []
    const reviews = await db.reviews.where('note_id').equals(noteId).toArray()
    return reviews.sort(newestFirst)
  }, [noteId])
}

export function useParagraphs(opts?: { archived?: boolean; task_type?: TaskType }): Paragraph[] | undefined {
  const archived = Boolean(opts?.archived)
  const taskType = opts?.task_type
  return useLiveQuery(async () => {
    const all = await db.paragraphs.toArray()
    return all
      .filter((p) => p.is_archived === archived && (taskType === undefined || p.task_type === taskType))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }, [archived, taskType])
}

export function useParagraph(id: string | undefined): Paragraph | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.paragraphs.get(id)) ?? null) : null), [id])
}

export function useNotesFromParagraph(paragraphId: string | undefined): Note[] | undefined {
  return useLiveQuery(async () => {
    if (!paragraphId) return []
    const notes = await db.notes.where('source_paragraph_id').equals(paragraphId).toArray()
    return notes.filter((n) => !n.is_archived).sort(newestFirst)
  }, [paragraphId])
}

export function useDueCounts(): DueCounts | undefined {
  const day = useToday()
  return useLiveQuery(async () => computeDueCounts(await db.notes.toArray(), new Date()), [day])
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, []) ?? DEFAULT_SETTINGS
}

export function useLastStudied(): LastStudied | null | undefined {
  return useLiveQuery(async () => readLastStudied((await db.meta.get(META_KEYS.lastStudied))?.value), [])
}

export function useLastExportAt(): ISODateTime | null | undefined {
  return useLiveQuery(async () => {
    const value = (await db.meta.get(META_KEYS.lastExport))?.value
    return typeof value === 'string' ? value : null
  }, [])
}

/** Reviews with review_date between the two day keys, inclusive, oldest first. */
export function useReviewsBetween(from: DayKey, to: DayKey): Review[] | undefined {
  return useLiveQuery(async () => {
    const reviews = await db.reviews.where('review_date').between(from, to, true, true).toArray()
    return reviews.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [from, to])
}

function sortedLabels(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/** Default topics, then custom ones from Settings, then topics used in notes. Unique, case-insensitive. */
export function useTopics(mode: Mode, taskType?: TaskType): string[] {
  const settings = useSettings()
  const used = useLiveQuery(async () => {
    const notes = await db.notes.where('mode').equals(mode).toArray()
    return notes.filter((n) => !taskType || n.task_type === taskType).map((n) => n.topic)
  }, [mode, taskType])
  return useMemo(() => {
    const defaults = mode === 'speaking' ? SPEAKING_TOPICS : writingTopicsFor(taskType ?? '')
    const custom =
      mode === 'speaking'
        ? settings.custom_speaking_topics
        : taskType === 'task1'
          ? settings.custom_task1_topics
          : taskType === 'task2'
            ? settings.custom_task2_topics
            : [...settings.custom_task1_topics, ...settings.custom_task2_topics]
    return mergeLabels(defaults, custom, sortedLabels(used ?? []))
  }, [mode, taskType, settings, used])
}

/** ERROR_TYPES, then custom error types, then error types used in notes. */
export function useErrorTypes(): string[] {
  const settings = useSettings()
  const used = useLiveQuery(async () => (await db.notes.toArray()).map((n) => n.error_type), [])
  return useMemo(
    () => mergeLabels(ERROR_TYPES, settings.custom_error_types, sortedLabels(used ?? [])),
    [settings.custom_error_types, used],
  )
}

export function useNoteCount(): number | undefined {
  return useLiveQuery(() => db.notes.filter((n) => !n.is_archived).count(), [])
}

/** Consecutive local days, ending today (or yesterday), with at least one review or one note created. */
export function useStudyStreak(now?: Date): number | undefined {
  const today = useToday()
  const nowKey = now ? todayKey(now) : today
  const nowTime = now?.getTime()
  return useLiveQuery(async () => {
    const [reviewDays, noteDays] = await Promise.all([
      db.reviews.orderBy('review_date').uniqueKeys(),
      db.notes.orderBy('date_created').uniqueKeys(),
    ])
    const days = new Set([...reviewDays, ...noteDays].map(String))
    return studyStreak(days, nowTime === undefined ? new Date() : new Date(nowTime))
    // nowKey covers `now`: the streak only changes when the day changes.
  }, [nowKey])
}
