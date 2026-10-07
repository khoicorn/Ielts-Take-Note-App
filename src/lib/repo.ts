/**
 * All writes to the notebook. Every write sets updated_at and takes an optional `now` for tests.
 * Multi-row changes run in one Dexie transaction.
 */
import { db, resetDb } from './db'
import { isDayKey, timeOf, todayKey } from './dates'
import { APP_ID, BACKUP_VERSION } from './exporters'
import { newId } from './ids'
import { cleanTags, isRecord, normalizeNote, normalizeParagraph, normalizeReview, normalizeSettings, UNTITLED_PARAGRAPH } from './records'
import { buildExampleData } from './seed'
import { initialSchedule, manualMastery, schedule } from './srs'
import { EXAMPLE_TAG, MODE_LABELS, NOTE_TYPES } from './taxonomy'
import { cleanSentence } from './text'
import type {
  ExportBundle,
  ISODateTime,
  LastStudied,
  MasteryStatus,
  Mode,
  Note,
  NoteContentPatch,
  NoteDraft,
  NoteType,
  Paragraph,
  ParagraphDraft,
  ParagraphPatch,
  Rating,
  Review,
  ReviewStart,
  ReviewType,
  Settings,
  TaskType,
} from './types'

export const META_KEYS = {
  settings: 'settings',
  lastExport: 'last_export_at',
  lastStudied: 'last_studied',
  persistRequested: 'persist_requested',
} as const

const THEME_STORAGE_KEY = 'ielts-theme'
const QUICK_ADD_DRAFT_KEY = 'ielts-quickadd-draft'
const EMPTY_UPGRADE = 'Add the better version first.'
const NOTE_NOT_FOUND = 'Note not found.'
const PARAGRAPH_NOT_FOUND = 'Paragraph not found.'

const MODES: readonly Mode[] = ['speaking', 'writing']
const TASK_TYPES: readonly TaskType[] = ['', 'task1', 'task2']
const NOTE_TYPE_VALUES: readonly NoteType[] = NOTE_TYPES.map((t) => t.value)
const SENTENCE_FIELDS = ['original_text', 'upgraded_text', 'example_sentence', 'reusable_pattern'] as const
const TRIMMED_FIELDS = [
  'topic', 'subtopic', 'task_genre', 'explanation', 'model_paragraph', 'error_type', 'error_pattern', 'fix_pattern', 'recall_prompt',
] as const

/* ------------------------------------------------------------------ */
/* Cleaning                                                            */
/* ------------------------------------------------------------------ */

/**
 * Keeps only owner-editable content fields and cleans them: sentence fields lose one pair of wrapping
 * quotes and extra spaces, other text is trimmed, tags are normalized. Values of the wrong type are dropped.
 */
function cleanContent(input: NoteContentPatch): NoteContentPatch {
  const raw: Record<string, unknown> = { ...input }
  const out: NoteContentPatch = {}
  if (typeof raw.mode === 'string' && (MODES as readonly string[]).includes(raw.mode)) out.mode = raw.mode as Mode
  if (typeof raw.date_created === 'string' && isDayKey(raw.date_created)) out.date_created = raw.date_created
  if (typeof raw.task_type === 'string' && (TASK_TYPES as readonly string[]).includes(raw.task_type)) out.task_type = raw.task_type as TaskType
  if (typeof raw.note_type === 'string' && (NOTE_TYPE_VALUES as readonly string[]).includes(raw.note_type)) out.note_type = raw.note_type as NoteType
  for (const key of SENTENCE_FIELDS) {
    const v = raw[key]
    if (typeof v === 'string') out[key] = cleanSentence(v)
  }
  for (const key of TRIMMED_FIELDS) {
    const v = raw[key]
    if (typeof v === 'string') out[key] = v.trim()
  }
  if (Array.isArray(raw.tags)) out.tags = cleanTags(raw.tags)
  if (typeof raw.difficulty === 'number' && [0, 1, 2, 3].includes(raw.difficulty)) out.difficulty = raw.difficulty as Note['difficulty']
  if (typeof raw.is_favorite === 'boolean') out.is_favorite = raw.is_favorite
  if (raw.source_paragraph_id === null || (typeof raw.source_paragraph_id === 'string' && raw.source_paragraph_id)) {
    out.source_paragraph_id = raw.source_paragraph_id
  }
  return out
}

/** Speaking notes have no task type or chart/essay type. */
function withModeRules(note: Note): Note {
  return note.mode === 'speaking' ? { ...note, task_type: '', task_genre: '' } : note
}

function requireUpgrade(note: Note): void {
  if (!note.upgraded_text) throw new Error(EMPTY_UPGRADE)
}

/** A complete new note from cleaned content, with a fresh review state. */
function buildNote(content: NoteContentPatch & { mode: Mode }, start: ReviewStart, now: Date): Note {
  const nowIso = now.toISOString()
  const original = content.original_text ?? ''
  return withModeRules({
    id: newId(),
    mode: content.mode,
    date_created: content.date_created ?? todayKey(now),
    topic: content.topic ?? '',
    subtopic: content.subtopic ?? '',
    task_type: content.task_type ?? '',
    task_genre: content.task_genre ?? '',
    original_text: original,
    upgraded_text: content.upgraded_text ?? '',
    explanation: content.explanation ?? '',
    example_sentence: content.example_sentence ?? '',
    reusable_pattern: content.reusable_pattern ?? '',
    model_paragraph: content.model_paragraph ?? '',
    note_type: content.note_type ?? (original ? 'correction' : 'useful_expression'),
    error_type: content.error_type ?? '',
    error_pattern: content.error_pattern ?? '',
    fix_pattern: content.fix_pattern ?? '',
    recall_prompt: content.recall_prompt ?? '',
    tags: content.tags ?? [],
    difficulty: content.difficulty ?? 0,
    is_favorite: content.is_favorite ?? false,
    ...initialSchedule(start, now),
    last_reviewed_at: null,
    times_reviewed: 0,
    times_seen: 1,
    source_paragraph_id: content.source_paragraph_id ?? null,
    is_archived: false,
    archived_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  })
}

/** Reads a note, applies `change`, and writes it back in one transaction. */
async function changeNote(id: string, change: (note: Note) => Note): Promise<Note> {
  return db.transaction('rw', db.notes, async () => {
    const note = await db.notes.get(id)
    if (!note) throw new Error(NOTE_NOT_FOUND)
    const next = change(note)
    await db.notes.put(next)
    return next
  })
}

async function changeParagraph(id: string, change: (p: Paragraph) => Paragraph): Promise<Paragraph> {
  return db.transaction('rw', db.paragraphs, async () => {
    const paragraph = await db.paragraphs.get(id)
    if (!paragraph) throw new Error(PARAGRAPH_NOT_FOUND)
    const next = change(paragraph)
    await db.paragraphs.put(next)
    return next
  })
}

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

export async function createNote(draft: NoteDraft, opts?: { start?: ReviewStart; now?: Date }): Promise<Note> {
  const now = opts?.now ?? new Date()
  const content = cleanContent(draft)
  const note = buildNote({ ...content, mode: content.mode ?? 'speaking' }, opts?.start ?? 'today', now)
  requireUpgrade(note)
  await db.notes.add(note)
  await requestPersistenceOnce()
  return note
}

export async function updateNote(id: string, patch: NoteContentPatch, now: Date = new Date()): Promise<Note> {
  const content = cleanContent(patch)
  return changeNote(id, (note) => {
    const next = withModeRules({ ...note, ...content, updated_at: now.toISOString() })
    requireUpgrade(next)
    return next
  })
}

export async function duplicateNote(id: string, now: Date = new Date()): Promise<Note> {
  return db.transaction('rw', db.notes, async () => {
    const source = await db.notes.get(id)
    if (!source) throw new Error(NOTE_NOT_FOUND)
    const copy = buildNote({ ...cleanContent(source), mode: source.mode, is_favorite: false }, 'today', now)
    await db.notes.add(copy)
    return copy
  })
}

export async function archiveNote(id: string, now: Date = new Date()): Promise<void> {
  const nowIso = now.toISOString()
  await changeNote(id, (note) => ({ ...note, is_archived: true, archived_at: nowIso, updated_at: nowIso }))
}

export async function restoreNote(id: string, now: Date = new Date()): Promise<void> {
  await changeNote(id, (note) => ({ ...note, is_archived: false, archived_at: null, updated_at: now.toISOString() }))
}

export async function deleteNote(id: string): Promise<void> {
  await db.transaction('rw', db.notes, db.reviews, async () => {
    await db.reviews.where('note_id').equals(id).delete()
    await db.notes.delete(id)
  })
}

export async function toggleFavorite(id: string, now: Date = new Date()): Promise<boolean> {
  const note = await changeNote(id, (n) => ({ ...n, is_favorite: !n.is_favorite, updated_at: now.toISOString() }))
  return note.is_favorite
}

/** Manual mastery change: first stage of that level, rescheduled. Writes no review row. */
export async function setMastery(id: string, m: MasteryStatus, now: Date = new Date()): Promise<Note> {
  return changeNote(id, (note) => ({ ...note, ...manualMastery(m, now), updated_at: now.toISOString() }))
}

/** "I made this mistake again": seen once more, back to stage 1, due now. */
export async function markSeenAgain(id: string, now: Date = new Date()): Promise<Note> {
  const nowIso = now.toISOString()
  return changeNote(id, (note) => ({
    ...note,
    times_seen: note.times_seen + 1,
    review_stage: 1,
    mastery_status: 'learning',
    next_review_at: nowIso,
    updated_at: nowIso,
  }))
}

export async function rateNote(
  id: string,
  rating: Rating,
  reviewType: ReviewType,
  now: Date = new Date(),
): Promise<{ note: Note; review: Review; requeue: boolean }> {
  const nowIso = now.toISOString()
  return db.transaction('rw', db.notes, db.reviews, db.meta, async () => {
    const note = await db.notes.get(id)
    if (!note) throw new Error(NOTE_NOT_FOUND)
    const r = schedule(note, rating, now)
    const updated: Note = {
      ...note,
      review_stage: r.review_stage,
      mastery_status: r.mastery_status,
      next_review_at: r.next_review_at,
      last_reviewed_at: nowIso,
      times_reviewed: note.times_reviewed + 1,
      updated_at: nowIso,
    }
    const review: Review = {
      id: newId(),
      note_id: id,
      review_date: todayKey(now),
      rating,
      review_type: reviewType,
      previous_stage: note.review_stage,
      new_stage: r.review_stage,
      previous_interval: r.previous_interval,
      new_interval: r.new_interval,
      created_at: nowIso,
    }
    await db.notes.put(updated)
    await db.reviews.add(review)
    await setLastStudied({ mode: note.mode, task_type: note.task_type, topic: note.topic }, now)
    return { note: updated, review, requeue: r.requeue }
  })
}

/* ------------------------------------------------------------------ */
/* Model paragraphs                                                    */
/* ------------------------------------------------------------------ */

function cleanParagraphPatch(input: ParagraphPatch): ParagraphPatch {
  const raw: Record<string, unknown> = { ...input }
  const out: ParagraphPatch = {}
  if (typeof raw.title === 'string') out.title = raw.title.trim()
  if (typeof raw.body === 'string') out.body = raw.body
  if (typeof raw.task_type === 'string' && (TASK_TYPES as readonly string[]).includes(raw.task_type)) out.task_type = raw.task_type as TaskType
  if (typeof raw.task_genre === 'string') out.task_genre = raw.task_genre.trim()
  if (typeof raw.topic === 'string') out.topic = raw.topic.trim()
  if (Array.isArray(raw.tags)) out.tags = cleanTags(raw.tags)
  if (typeof raw.is_favorite === 'boolean') out.is_favorite = raw.is_favorite
  return out
}

export async function createParagraph(d: ParagraphDraft, now: Date = new Date()): Promise<Paragraph> {
  const content = cleanParagraphPatch(d)
  const nowIso = now.toISOString()
  const paragraph: Paragraph = {
    id: newId(),
    title: content.title || UNTITLED_PARAGRAPH,
    task_type: content.task_type ?? '',
    task_genre: content.task_genre ?? '',
    topic: content.topic ?? '',
    body: content.body ?? '',
    tags: content.tags ?? [],
    is_favorite: content.is_favorite ?? false,
    is_archived: false,
    created_at: nowIso,
    updated_at: nowIso,
  }
  await db.paragraphs.add(paragraph)
  return paragraph
}

/** The title may be empty while the owner edits; screens show "Untitled paragraph" for it. */
export async function updateParagraph(id: string, patch: ParagraphPatch, now: Date = new Date()): Promise<Paragraph> {
  const content = cleanParagraphPatch(patch)
  return changeParagraph(id, (p) => ({ ...p, ...content, updated_at: now.toISOString() }))
}

export async function archiveParagraph(id: string, now: Date = new Date()): Promise<void> {
  await changeParagraph(id, (p) => ({ ...p, is_archived: true, updated_at: now.toISOString() }))
}

export async function restoreParagraph(id: string, now: Date = new Date()): Promise<void> {
  await changeParagraph(id, (p) => ({ ...p, is_archived: false, updated_at: now.toISOString() }))
}

/** Deletes the paragraph. Notes made from it are kept and lose the link. */
export async function deleteParagraph(id: string): Promise<void> {
  const nowIso = new Date().toISOString()
  await db.transaction('rw', db.paragraphs, db.notes, async () => {
    await db.notes.where('source_paragraph_id').equals(id).modify({ source_paragraph_id: null, updated_at: nowIso })
    await db.paragraphs.delete(id)
  })
}

/* ------------------------------------------------------------------ */
/* Settings and meta                                                   */
/* ------------------------------------------------------------------ */

function writeThemeMirror(theme: Settings['theme']): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be blocked (private mode). The theme still applies for this session.
  }
}

export async function getSettings(): Promise<Settings> {
  const row = await db.meta.get(META_KEYS.settings)
  return normalizeSettings(row?.value)
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
  const next = await db.transaction('rw', db.meta, async () => {
    const merged = normalizeSettings({ ...(await getSettings()), ...defined })
    await db.meta.put({ key: META_KEYS.settings, value: merged })
    return merged
  })
  if (patch.theme !== undefined) writeThemeMirror(next.theme)
  return next
}

export async function setLastStudied(v: Omit<LastStudied, 'at'>, now: Date = new Date()): Promise<void> {
  const value: LastStudied = { mode: v.mode, task_type: v.task_type, topic: v.topic, at: now.toISOString() }
  await db.meta.put({ key: META_KEYS.lastStudied, value })
}

export async function markExported(now: Date = new Date()): Promise<void> {
  await db.meta.put({ key: META_KEYS.lastExport, value: now.toISOString() })
}

/** Reads a stored LastStudied, or null when missing or malformed. */
export function readLastStudied(value: unknown): LastStudied | null {
  if (!isRecord(value)) return null
  const { mode, task_type, topic, at } = value
  if (typeof mode !== 'string' || !(mode in MODE_LABELS) || typeof at !== 'string') return null
  return {
    mode: mode as Mode,
    task_type: typeof task_type === 'string' && (TASK_TYPES as readonly string[]).includes(task_type) ? (task_type as TaskType) : '',
    topic: typeof topic === 'string' ? topic : '',
    at,
  }
}

/* ------------------------------------------------------------------ */
/* Export and import                                                   */
/* ------------------------------------------------------------------ */

export async function exportBundle(now: Date = new Date()): Promise<ExportBundle> {
  return db.transaction('r', db.notes, db.reviews, db.paragraphs, db.meta, async () => {
    const [notes, reviews, paragraphs, settings] = await Promise.all([
      db.notes.toArray(),
      db.reviews.toArray(),
      db.paragraphs.toArray(),
      getSettings(),
    ])
    return { app: APP_ID, version: BACKUP_VERSION, exported_at: now.toISOString(), notes, reviews, paragraphs, settings }
  })
}

export interface ImportSummary {
  notesAdded: number
  notesUpdated: number
  notesSkipped: number
  reviewsAdded: number
  paragraphsAdded: number
  paragraphsUpdated: number
}

/** Splits incoming rows into new ones and ones newer than what is stored. Equal or older rows are skipped. */
function mergePlan<T extends { id: string; updated_at: ISODateTime }>(incoming: T[], existing: (T | undefined)[]) {
  const added: T[] = []
  const updated: T[] = []
  incoming.forEach((row, i) => {
    const current = existing[i]
    if (!current) added.push(row)
    else if (timeOf(row.updated_at) > timeOf(current.updated_at)) updated.push(row)
  })
  return { added, updated, skipped: incoming.length - added.length - updated.length }
}

function uniqueById<T extends { id: string; updated_at?: ISODateTime }>(rows: T[]): T[] {
  const byId = new Map<string, T>()
  for (const row of rows) {
    const current = byId.get(row.id)
    if (!current || timeOf(row.updated_at) > timeOf(current.updated_at)) byId.set(row.id, row)
  }
  return [...byId.values()]
}

/** Merges a backup by id: new rows are added, newer rows replace older ones. Settings are not imported. */
export async function importBundle(b: ExportBundle): Promise<ImportSummary> {
  const fallback = typeof b.exported_at === 'string' ? b.exported_at : new Date().toISOString()
  const notes = uniqueById((b.notes ?? []).flatMap((n) => normalizeNote(n, fallback) ?? []))
  const reviews = uniqueById((b.reviews ?? []).flatMap((r) => normalizeReview(r, fallback) ?? []))
  const paragraphs = uniqueById((b.paragraphs ?? []).flatMap((p) => normalizeParagraph(p, fallback) ?? []))

  return db.transaction('rw', db.notes, db.reviews, db.paragraphs, async () => {
    const notePlan = mergePlan(notes, await db.notes.bulkGet(notes.map((n) => n.id)))
    const paragraphPlan = mergePlan(paragraphs, await db.paragraphs.bulkGet(paragraphs.map((p) => p.id)))
    await db.notes.bulkPut([...notePlan.added, ...notePlan.updated])
    await db.paragraphs.bulkPut([...paragraphPlan.added, ...paragraphPlan.updated])

    // Reviews are history: add the ones we do not have, and only for notes that exist.
    const storedReviews = await db.reviews.bulkGet(reviews.map((r) => r.id))
    const fresh = reviews.filter((_, i) => !storedReviews[i])
    const noteIds = [...new Set(fresh.map((r) => r.note_id))]
    const known = await db.notes.bulkGet(noteIds)
    const knownIds = new Set(noteIds.filter((_, i) => known[i]))
    const reviewsToAdd = fresh.filter((r) => knownIds.has(r.note_id))
    await db.reviews.bulkAdd(reviewsToAdd)

    return {
      notesAdded: notePlan.added.length,
      notesUpdated: notePlan.updated.length,
      notesSkipped: notePlan.skipped,
      reviewsAdded: reviewsToAdd.length,
      paragraphsAdded: paragraphPlan.added.length,
      paragraphsUpdated: paragraphPlan.updated.length,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Example data, deletion, storage                                     */
/* ------------------------------------------------------------------ */

/** Adds the example notebook once. Does nothing while any example note exists. */
export async function loadExampleData(now: Date = new Date()): Promise<{ notes: number; paragraphs: number }> {
  return db.transaction('rw', db.notes, db.reviews, db.paragraphs, db.meta, async () => {
    if ((await db.notes.where('tags').equals(EXAMPLE_TAG).count()) > 0) return { notes: 0, paragraphs: 0 }
    const existingParagraphs = (await db.paragraphs.toArray()).filter((p) => p.tags.includes(EXAMPLE_TAG))
    const data = buildExampleData(now, existingParagraphs)
    await db.paragraphs.bulkAdd(data.paragraphs)
    await db.notes.bulkAdd(data.notes)
    await db.reviews.bulkAdd(data.reviews)
    if (!(await db.meta.get(META_KEYS.lastStudied))) {
      await db.meta.put({ key: META_KEYS.lastStudied, value: data.lastStudied })
    }
    return { notes: data.notes.length, paragraphs: data.paragraphs.length }
  })
}

/** Removes example notes (with their reviews) and example paragraphs. Returns the number of notes removed. */
export async function removeExampleData(): Promise<number> {
  const nowIso = new Date().toISOString()
  return db.transaction('rw', db.notes, db.reviews, db.paragraphs, async () => {
    const noteIds = (await db.notes.where('tags').equals(EXAMPLE_TAG).primaryKeys()) as string[]
    const paragraphIds = (await db.paragraphs.toArray()).filter((p) => p.tags.includes(EXAMPLE_TAG)).map((p) => p.id)
    await db.reviews.where('note_id').anyOf(noteIds).delete()
    await db.notes.bulkDelete(noteIds)
    if (paragraphIds.length > 0) {
      await db.notes.where('source_paragraph_id').anyOf(paragraphIds).modify({ source_paragraph_id: null, updated_at: nowIso })
      await db.paragraphs.bulkDelete(paragraphIds)
    }
    return noteIds.length
  })
}

/** Clears every table and the unsent Quick Add draft. */
export async function deleteAllData(): Promise<void> {
  await resetDb()
  try {
    localStorage.removeItem(QUICK_ADD_DRAFT_KEY)
  } catch {
    // Storage can be blocked; nothing to remove then.
  }
}

/** Asks the browser not to evict this site's data. Never throws. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (!storage?.persist) return false
    if (storage.persisted && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}

/** Requests persistent storage after the first saved note. Not awaited: some browsers show a prompt. */
async function requestPersistenceOnce(): Promise<void> {
  try {
    if (await db.meta.get(META_KEYS.persistRequested)) return
    await db.meta.put({ key: META_KEYS.persistRequested, value: true })
    void requestPersistentStorage()
  } catch {
    // Never block a save on this.
  }
}
