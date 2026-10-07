/**
 * Turns unknown input (old or partial backups, stored rows) into complete records.
 * Valid values pass through unchanged; missing or invalid ones get defaults.
 */
import { dayKeyToDate, isDayKey, toDayKey } from './dates'
import { masteryForStage } from './srs'
import { MAX_STAGE, NOTE_TYPES } from './taxonomy'
import { normalizeTag } from './text'
import type {
  DayKey,
  ISODateTime,
  MasteryStatus,
  Mode,
  Note,
  NoteType,
  Paragraph,
  Rating,
  Review,
  ReviewStage,
  ReviewStyle,
  ReviewType,
  Settings,
  TaskType,
  ThemePreference,
} from './types'
import { DEFAULT_SETTINGS } from './types'

type Raw = Record<string, unknown>

const MODES: readonly Mode[] = ['speaking', 'writing']
const TASK_TYPES: readonly TaskType[] = ['', 'task1', 'task2']
const NOTE_TYPE_VALUES: readonly NoteType[] = NOTE_TYPES.map((t) => t.value)
const MASTERY: readonly MasteryStatus[] = ['new', 'learning', 'familiar', 'mastered']
const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy']
const REVIEW_TYPES: readonly ReviewType[] = ['upgrade', 'phrase_to_sentence', 'fill_blank', 'pattern_recall']
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark']
const REVIEW_STYLES: readonly ReviewStyle[] = ['mixed', 'upgrade_only']

export const UNTITLED_PARAGRAPH = 'Untitled paragraph'

/** Every Note field, in types.ts order. Used for the CSV header. */
export const NOTE_FIELDS: readonly (keyof Note)[] = [
  'id', 'mode', 'date_created', 'topic', 'subtopic', 'task_type', 'task_genre', 'original_text', 'upgraded_text',
  'explanation', 'example_sentence', 'reusable_pattern', 'model_paragraph', 'note_type', 'error_type', 'error_pattern',
  'fix_pattern', 'recall_prompt', 'tags', 'difficulty', 'is_favorite', 'mastery_status', 'review_stage',
  'last_reviewed_at', 'next_review_at', 'times_reviewed', 'times_seen', 'source_paragraph_id', 'is_archived',
  'archived_at', 'created_at', 'updated_at',
]

export function isRecord(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function int(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback
}

function nonNegative(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

function iso(v: unknown): ISODateTime | null {
  return typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Date.parse(v)) ? v : null
}

function dayKey(v: unknown): DayKey | null {
  return typeof v === 'string' && isDayKey(v) ? v : null
}

function id(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

export function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const t of v) {
    if (typeof t !== 'string') continue
    const tag = normalizeTag(t)
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out
}

function labelList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    const s = typeof item === 'string' ? item.trim() : ''
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s)
  }
  return out
}

/** Returns null for rows without an id or without upgraded_text. */
export function normalizeNote(raw: unknown, fallbackTime: ISODateTime): Note | null {
  if (!isRecord(raw)) return null
  const noteId = id(raw.id)
  const upgraded = str(raw.upgraded_text)
  if (!noteId || !upgraded.trim()) return null
  const taskType = oneOf(raw.task_type, TASK_TYPES, '')
  const mode = oneOf(raw.mode, MODES, taskType ? 'writing' : 'speaking')
  const stage = int(raw.review_stage, 0, MAX_STAGE, 0) as ReviewStage
  const dateCreated = dayKey(raw.date_created)
  const createdAt = iso(raw.created_at) ?? (dateCreated ? dayKeyToDate(dateCreated).toISOString() : fallbackTime)
  const original = str(raw.original_text)
  return {
    id: noteId,
    mode,
    date_created: dateCreated ?? toDayKey(createdAt),
    topic: str(raw.topic),
    subtopic: str(raw.subtopic),
    task_type: mode === 'speaking' ? '' : taskType,
    task_genre: mode === 'speaking' ? '' : str(raw.task_genre),
    original_text: original,
    upgraded_text: upgraded,
    explanation: str(raw.explanation),
    example_sentence: str(raw.example_sentence),
    reusable_pattern: str(raw.reusable_pattern),
    model_paragraph: str(raw.model_paragraph),
    note_type: oneOf(raw.note_type, NOTE_TYPE_VALUES, original.trim() ? 'correction' : 'useful_expression'),
    error_type: str(raw.error_type),
    error_pattern: str(raw.error_pattern),
    fix_pattern: str(raw.fix_pattern),
    recall_prompt: str(raw.recall_prompt),
    tags: cleanTags(raw.tags),
    difficulty: int(raw.difficulty, 0, 3, 0) as Note['difficulty'],
    is_favorite: bool(raw.is_favorite),
    mastery_status: oneOf(raw.mastery_status, MASTERY, masteryForStage(stage)),
    review_stage: stage,
    last_reviewed_at: iso(raw.last_reviewed_at),
    next_review_at: iso(raw.next_review_at),
    times_reviewed: int(raw.times_reviewed, 0, Number.MAX_SAFE_INTEGER, 0),
    times_seen: int(raw.times_seen, 1, Number.MAX_SAFE_INTEGER, 1),
    source_paragraph_id: id(raw.source_paragraph_id),
    is_archived: bool(raw.is_archived),
    archived_at: iso(raw.archived_at),
    created_at: createdAt,
    updated_at: iso(raw.updated_at) ?? createdAt,
  }
}

/** Returns null for rows without an id or note_id. */
export function normalizeReview(raw: unknown, fallbackTime: ISODateTime): Review | null {
  if (!isRecord(raw)) return null
  const reviewId = id(raw.id)
  const noteId = id(raw.note_id)
  if (!reviewId || !noteId) return null
  const reviewDate = dayKey(raw.review_date)
  const createdAt = iso(raw.created_at) ?? (reviewDate ? dayKeyToDate(reviewDate).toISOString() : fallbackTime)
  return {
    id: reviewId,
    note_id: noteId,
    review_date: reviewDate ?? toDayKey(createdAt),
    rating: oneOf(raw.rating, RATINGS, 'good'),
    review_type: oneOf(raw.review_type, REVIEW_TYPES, 'upgrade'),
    previous_stage: int(raw.previous_stage, 0, MAX_STAGE, 0) as ReviewStage,
    new_stage: int(raw.new_stage, 0, MAX_STAGE, 0) as ReviewStage,
    previous_interval: nonNegative(raw.previous_interval),
    new_interval: nonNegative(raw.new_interval),
    created_at: createdAt,
  }
}

/** Returns null for rows without an id. */
export function normalizeParagraph(raw: unknown, fallbackTime: ISODateTime): Paragraph | null {
  if (!isRecord(raw)) return null
  const paragraphId = id(raw.id)
  if (!paragraphId) return null
  const createdAt = iso(raw.created_at) ?? fallbackTime
  return {
    id: paragraphId,
    title: str(raw.title).trim() ? str(raw.title) : UNTITLED_PARAGRAPH,
    task_type: oneOf(raw.task_type, TASK_TYPES, ''),
    task_genre: str(raw.task_genre),
    topic: str(raw.topic),
    body: str(raw.body),
    tags: cleanTags(raw.tags),
    is_favorite: bool(raw.is_favorite),
    is_archived: bool(raw.is_archived),
    created_at: createdAt,
    updated_at: iso(raw.updated_at) ?? createdAt,
  }
}

export function normalizeSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {}
  return {
    theme: oneOf(r.theme, THEMES, DEFAULT_SETTINGS.theme),
    session_size: int(r.session_size, 1, 500, DEFAULT_SETTINGS.session_size),
    review_style: oneOf(r.review_style, REVIEW_STYLES, DEFAULT_SETTINGS.review_style),
    custom_speaking_topics: labelList(r.custom_speaking_topics),
    custom_task1_topics: labelList(r.custom_task1_topics),
    custom_task2_topics: labelList(r.custom_task2_topics),
    custom_error_types: labelList(r.custom_error_types),
  }
}
