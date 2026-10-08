/**
 * Quick Add memory in localStorage: the unsent draft, the last mode used, and whether "More details" is open.
 * Storage can be blocked (private mode, strict settings), so every call is wrapped and fails quietly.
 */
import { isDayKey, todayKey } from '@/lib/dates'
import type { Mode } from '@/lib/types'
import { emptyValues, mergeValues, type FormValues, type WritingTask } from './form'

/** Also cleared by deleteAllData() in lib/repo. */
export const DRAFT_KEY = 'ielts-quickadd-draft'
export const LAST_KEY = 'ielts-quickadd-last'
export const MORE_KEY = 'ielts-quickadd-more'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage is blocked or full. Quick Add still works; it just forgets.
  }
}

function parse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const isMode = (v: unknown): v is Mode => v === 'speaking' || v === 'writing'

/* ---------- draft ---------- */

interface StoredDraft {
  v: 1
  mode: Mode
  values: FormValues
  saved_at: string
}

export interface Draft {
  mode: Mode
  values: FormValues
}

export function readDraft(now: Date): Draft | null {
  const data = parse(read(DRAFT_KEY)) as Partial<StoredDraft> | null
  if (!data || typeof data !== 'object' || !isMode(data.mode)) return null
  const values = mergeValues(emptyValues(now), data.values)
  // A date the learner never changed was "today" when the draft was written. Today is the right default now.
  const savedDay = typeof data.saved_at === 'string' && !Number.isNaN(Date.parse(data.saved_at)) ? todayKey(new Date(data.saved_at)) : null
  if (savedDay && values.date_created === savedDay) values.date_created = todayKey(now)
  if (!isDayKey(values.date_created)) values.date_created = todayKey(now)
  return { mode: data.mode, values }
}

export function writeDraft(mode: Mode, values: FormValues, now: Date = new Date()): void {
  const data: StoredDraft = { v: 1, mode, values, saved_at: now.toISOString() }
  write(DRAFT_KEY, JSON.stringify(data))
}

export function clearDraft(): void {
  write(DRAFT_KEY, null)
}

/* ---------- last used mode ---------- */

export interface LastUsed {
  mode: Mode
  task_type: WritingTask
}

export function readLastUsed(): LastUsed | null {
  const data = parse(read(LAST_KEY)) as Partial<LastUsed> | null
  if (!data || typeof data !== 'object' || !isMode(data.mode)) return null
  return { mode: data.mode, task_type: data.task_type === 'task2' ? 'task2' : 'task1' }
}

export function writeLastUsed(v: LastUsed): void {
  write(LAST_KEY, JSON.stringify(v))
}

/* ---------- More details open ---------- */

export function readMoreOpen(): boolean {
  return read(MORE_KEY) === '1'
}

export function writeMoreOpen(open: boolean): void {
  write(MORE_KEY, open ? '1' : '0')
}
