/**
 * Edit mode state for Note Detail, and the unsaved-edits draft kept in localStorage.
 *
 * BrowserRouter cannot block navigation, so leaving edit mode by the sidebar, a search result or the
 * browser's Back button cannot ask first. Instead the edits are kept, keyed by note id, and edit mode
 * opens with them the next time the note opens ("Draft restored · Discard"), as Quick Add does.
 * Storage can be blocked (private mode, strict settings), so every call fails quietly.
 */
import { NOTE_TYPES } from '@/lib/taxonomy'
import type { DayKey, Mode, Note, NoteContentPatch, NoteType, TaskType } from '@/lib/types'
import { isDayKey } from '@/lib/dates'

/** The owner-written fields the edit form changes. Review fields are never touched (brief §41). */
export interface FormState {
  mode: Mode
  task_type: TaskType
  topic: string
  subtopic: string
  task_genre: string
  original_text: string
  upgraded_text: string
  explanation: string
  example_sentence: string
  reusable_pattern: string
  model_paragraph: string
  recall_prompt: string
  note_type: NoteType
  error_type: string
  error_pattern: string
  fix_pattern: string
  tags: string[]
  date_created: DayKey
}

const STRING_KEYS = [
  'topic',
  'subtopic',
  'task_genre',
  'original_text',
  'upgraded_text',
  'explanation',
  'example_sentence',
  'reusable_pattern',
  'model_paragraph',
  'recall_prompt',
  'error_type',
  'error_pattern',
  'fix_pattern',
  'date_created',
] as const

const NOTE_TYPE_VALUES: readonly string[] = NOTE_TYPES.map((t) => t.value)

export function fromNote(n: Note): FormState {
  return {
    mode: n.mode,
    task_type: n.task_type,
    topic: n.topic,
    subtopic: n.subtopic,
    task_genre: n.task_genre,
    original_text: n.original_text,
    upgraded_text: n.upgraded_text,
    explanation: n.explanation,
    example_sentence: n.example_sentence,
    reusable_pattern: n.reusable_pattern,
    model_paragraph: n.model_paragraph,
    recall_prompt: n.recall_prompt,
    note_type: n.note_type,
    error_type: n.error_type,
    error_pattern: n.error_pattern,
    fix_pattern: n.fix_pattern,
    tags: [...n.tags],
    date_created: n.date_created,
  }
}

export function toPatch(s: FormState): NoteContentPatch {
  const { date_created, ...rest } = s
  const patch: NoteContentPatch = { ...rest }
  if (isDayKey(date_created)) patch.date_created = date_created
  if (s.mode === 'speaking') {
    patch.task_type = ''
    patch.task_genre = ''
  }
  return patch
}

/**
 * Switching the notebook (brief §41). Speaking topics and Writing language topics are different lists,
 * so the topic, subtopic, task genre and the Writing-only recall prompt are cleared, as in Quick Add.
 * Switching back to the note's own notebook brings its own values back.
 */
export function withMode(s: FormState, mode: Mode, initial: FormState): FormState {
  if (mode === s.mode) return s
  if (mode === initial.mode) {
    const { task_type, topic, subtopic, task_genre, recall_prompt } = initial
    return { ...s, mode, task_type: mode === 'writing' ? task_type || 'task1' : '', topic, subtopic, task_genre, recall_prompt }
  }
  return {
    ...s,
    mode,
    // A Writing note always belongs to a task. Speaking notes have none.
    task_type: mode === 'writing' ? s.task_type || 'task1' : '',
    topic: '',
    subtopic: '',
    task_genre: '',
    recall_prompt: mode === 'speaking' ? '' : s.recall_prompt,
  }
}

/** Copies the values of a stored draft that have the right type onto the note's own values. */
export function mergeDraft(base: FormState, raw: unknown): FormState {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const out: FormState = { ...base, tags: [...base.tags] }
  for (const key of STRING_KEYS) {
    const v = r[key]
    if (typeof v === 'string') out[key] = v
  }
  if (r.mode === 'speaking' || r.mode === 'writing') out.mode = r.mode
  if (r.task_type === '' || r.task_type === 'task1' || r.task_type === 'task2') out.task_type = r.task_type
  if (typeof r.note_type === 'string' && NOTE_TYPE_VALUES.includes(r.note_type)) out.note_type = r.note_type as NoteType
  if (Array.isArray(r.tags)) out.tags = r.tags.filter((t): t is string => typeof t === 'string')
  return out
}

/* ---------- storage ---------- */

/** Also worth clearing with "Delete all data" (lib/repo). */
export const EDIT_DRAFTS_KEY = 'ielts-note-edit-drafts'
const MAX_AGE_MS = 60 * 24 * 3_600_000

interface StoredDraft {
  v: 1
  state: FormState
  saved_at: string
}

function readAll(): Record<string, StoredDraft> {
  try {
    const raw = localStorage.getItem(EDIT_DRAFTS_KEY)
    const data: unknown = raw ? JSON.parse(raw) : null
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, StoredDraft>) : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, StoredDraft>): void {
  try {
    if (Object.keys(all).length === 0) localStorage.removeItem(EDIT_DRAFTS_KEY)
    else localStorage.setItem(EDIT_DRAFTS_KEY, JSON.stringify(all))
  } catch {
    // Storage is blocked or full. Editing still works; leaving just forgets the edits.
  }
}

/** The unsaved edits of one note, or null. */
export function readEditDraft(id: string): unknown {
  const entry = readAll()[id]
  return entry && typeof entry === 'object' && entry.v === 1 && entry.state ? entry.state : null
}

export function writeEditDraft(id: string, state: FormState, now: Date = new Date()): void {
  const all = readAll()
  // Old drafts of notes never opened again are dropped.
  for (const [key, entry] of Object.entries(all)) {
    const at = Date.parse(entry?.saved_at ?? '')
    if (Number.isNaN(at) || now.getTime() - at > MAX_AGE_MS) delete all[key]
  }
  all[id] = { v: 1, state, saved_at: now.toISOString() }
  writeAll(all)
}

export function clearEditDraft(id: string): void {
  const all = readAll()
  if (!(id in all)) return
  delete all[id]
  writeAll(all)
}
