/**
 * Quick Add form state: the values the learner types, and the pure steps that turn them into a note.
 * No React here, so every rule can be tested on its own.
 */
import { isDayKey, todayKey } from '@/lib/dates'
import { FIELD_LABELS, NOTE_TYPES } from '@/lib/taxonomy'
import type { DayKey, Difficulty, Mode, NoteDraft, NoteType, ReviewStart } from '@/lib/types'

export type WritingTask = 'task1' | 'task2'

export interface FormValues {
  topic: string
  subtopic: string
  task_type: WritingTask
  task_genre: string
  original_text: string
  upgraded_text: string
  explanation: string
  example_sentence: string
  reusable_pattern: string
  /** No field in Quick Add. Kept so a prefill or draft never loses it. */
  model_paragraph: string
  /** '' = let createNote choose (Correction when there is an original, else Useful Expression). */
  note_type: NoteType | ''
  error_type: string
  error_pattern: string
  fix_pattern: string
  recall_prompt: string
  tags: string[]
  is_favorite: boolean
  difficulty: Difficulty
  date_created: DayKey
  start: ReviewStart
  source_paragraph_id: string | null
}

/** The fields a smart paste can fill, in the order a note reads. */
export type TextKey = 'original_text' | 'upgraded_text' | 'explanation' | 'example_sentence' | 'reusable_pattern'
export const TEXT_KEYS: readonly TextKey[] = [
  'original_text',
  'upgraded_text',
  'explanation',
  'example_sentence',
  'reusable_pattern',
]

const NOTE_TYPE_VALUES: readonly string[] = NOTE_TYPES.map((t) => t.value)
const STARTS: readonly string[] = ['today', 'tomorrow', 'none']
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
  'error_type',
  'error_pattern',
  'fix_pattern',
  'recall_prompt',
] as const

export function emptyValues(now: Date, taskType: WritingTask = 'task1'): FormValues {
  return {
    topic: '',
    subtopic: '',
    task_type: taskType,
    task_genre: '',
    original_text: '',
    upgraded_text: '',
    explanation: '',
    example_sentence: '',
    reusable_pattern: '',
    model_paragraph: '',
    note_type: '',
    error_type: '',
    error_pattern: '',
    fix_pattern: '',
    recall_prompt: '',
    tags: [],
    is_favorite: false,
    difficulty: 0,
    date_created: todayKey(now),
    start: 'today',
    source_paragraph_id: null,
  }
}

/**
 * Copies the values of `raw` that have the right type onto `base`.
 * Used for prefills (a paragraph selection, a search) and for drafts read back from localStorage.
 */
export function mergeValues(base: FormValues, raw: unknown): FormValues {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const out: FormValues = { ...base, tags: [...base.tags] }
  for (const key of STRING_KEYS) {
    const v = r[key]
    if (typeof v === 'string') out[key] = v
  }
  if (r.task_type === 'task1' || r.task_type === 'task2') out.task_type = r.task_type
  if (typeof r.note_type === 'string' && (r.note_type === '' || NOTE_TYPE_VALUES.includes(r.note_type))) {
    out.note_type = r.note_type as NoteType | ''
  }
  if (Array.isArray(r.tags)) out.tags = r.tags.filter((t): t is string => typeof t === 'string')
  if (typeof r.is_favorite === 'boolean') out.is_favorite = r.is_favorite
  if (typeof r.difficulty === 'number' && [0, 1, 2, 3].includes(r.difficulty)) out.difficulty = r.difficulty as Difficulty
  if (typeof r.date_created === 'string' && isDayKey(r.date_created)) out.date_created = r.date_created
  if (typeof r.start === 'string' && STARTS.includes(r.start)) out.start = r.start as ReviewStart
  if (r.source_paragraph_id === null || (typeof r.source_paragraph_id === 'string' && r.source_paragraph_id)) {
    out.source_paragraph_id = r.source_paragraph_id
  }
  return out
}

/** True when a prefill carries note text (not only a topic or task type for context). */
export function hasContent(prefill: Partial<NoteDraft> | undefined): boolean {
  if (!prefill) return false
  return TEXT_KEYS.some((k) => typeof prefill[k] === 'string' && prefill[k].trim() !== '')
}

/** True when the learner has typed something worth keeping as a draft. */
export function hasText(v: FormValues): boolean {
  return [...TEXT_KEYS, 'error_pattern', 'fix_pattern', 'recall_prompt'].some(
    (k) => (v[k as keyof FormValues] as string).trim() !== '',
  )
}

/** True when any field inside "More details" holds a value, so the section should open to show it. */
export function hasDetails(mode: Mode, v: FormValues, now: Date): boolean {
  const shared =
    v.explanation.trim() !== '' ||
    v.error_type !== '' ||
    v.error_pattern.trim() !== '' ||
    v.fix_pattern.trim() !== '' ||
    v.note_type !== '' ||
    v.tags.length > 0 ||
    v.is_favorite ||
    v.start !== 'today' ||
    v.date_created !== todayKey(now)
  if (mode === 'speaking') return shared || v.subtopic.trim() !== '' || v.reusable_pattern.trim() !== ''
  return shared || v.topic.trim() !== '' || v.task_genre !== '' || v.recall_prompt.trim() !== ''
}

/** The essential field the cursor should start in: the first empty one (plan C1, "Prefill"). */
export type FocusKey = 'topic' | TextKey
export function firstEmptyField(mode: Mode, v: FormValues): FocusKey {
  const order: FocusKey[] =
    mode === 'speaking'
      ? ['topic', 'original_text', 'upgraded_text', 'example_sentence']
      : ['original_text', 'upgraded_text', 'reusable_pattern', 'example_sentence']
  return order.find((k) => v[k].trim() === '') ?? 'upgraded_text'
}

/** The note to save. createNote cleans the text and applies the Speaking rules (no task type). */
export function buildDraft(mode: Mode, v: FormValues): NoteDraft {
  const writing = mode === 'writing'
  const draft: NoteDraft = {
    mode,
    upgraded_text: v.upgraded_text,
    original_text: v.original_text,
    explanation: v.explanation,
    example_sentence: v.example_sentence,
    reusable_pattern: v.reusable_pattern,
    model_paragraph: v.model_paragraph,
    topic: v.topic,
    subtopic: v.subtopic,
    task_type: writing ? v.task_type : '',
    task_genre: writing ? v.task_genre : '',
    error_type: v.error_type,
    error_pattern: v.error_pattern,
    fix_pattern: v.fix_pattern,
    recall_prompt: v.recall_prompt,
    tags: v.tags,
    is_favorite: v.is_favorite,
    difficulty: v.difficulty,
    date_created: v.date_created,
    source_paragraph_id: v.source_paragraph_id,
  }
  if (v.note_type) draft.note_type = v.note_type
  return draft
}

/**
 * "Save and add another": keep the context of a study session (mode, topic, task type, tags, date,
 * review start) and clear everything that belongs to one correction.
 */
export function valuesForNext(v: FormValues, now: Date): FormValues {
  return {
    ...emptyValues(now, v.task_type),
    topic: v.topic,
    subtopic: v.subtopic,
    task_genre: v.task_genre,
    tags: [...v.tags],
    date_created: v.date_created,
    start: v.start,
  }
}

/** Speaking topics and Writing language topics are different lists, so a mode switch clears them. */
export function valuesForMode(v: FormValues): FormValues {
  return { ...v, topic: '', subtopic: '', task_genre: '' }
}

export function fieldLabel(mode: Mode, key: TextKey): string {
  const labels = FIELD_LABELS[mode]
  switch (key) {
    case 'original_text':
      return labels.original
    case 'upgraded_text':
      return labels.upgraded
    case 'explanation':
      return labels.explanation
    case 'example_sentence':
      return labels.example
    case 'reusable_pattern':
      return labels.pattern
  }
}

export function reviewStartLabel(start: ReviewStart): string {
  if (start === 'tomorrow') return 'First review tomorrow'
  if (start === 'none') return 'Not scheduled for review'
  return 'First review today'
}

/**
 * The brief's own examples (plan C1), shared by Quick Add and the Note Detail edit form.
 * "e.g." marks them as examples: without it, an empty field with a placeholder looks filled
 * (graphite and deep sage are close in lightness).
 */
export const PLACEHOLDERS: Readonly<
  Record<Mode, { topic: string; original: string; upgraded: string; example: string; pattern: string; explanation: string }>
> = {
  speaking: {
    topic: 'e.g. Travel',
    original: 'e.g. We enjoyed the scenario.',
    upgraded: 'e.g. The scenery was beautiful.',
    example: 'e.g. The scenery along the coast was beautiful.',
    pattern: 'e.g. I’m pretty flexible about ___.',
    explanation: 'e.g. “Scenery” is the view. “Scenario” is a situation.',
  },
  writing: {
    topic: 'e.g. Increase',
    original: 'e.g. The number of visitors of the City Zoo increased steadily.',
    upgraded: 'e.g. The number of visitors to the City Zoo increased steadily.',
    example: 'e.g. The number of visitors to the City Zoo increased steadily from 35,000 to 68,000.',
    pattern: 'e.g. The number of visitors to ___ increased steadily from ___ to ___.',
    explanation: 'e.g. Use “visitors to + place” rather than “visitors of + place”.',
  },
}

export const DETAIL_PLACEHOLDERS = {
  subtopic: 'e.g. Nha Trang trip',
  errorPattern: 'e.g. visitors of + place',
  fixPattern: 'e.g. visitors to + place',
  recallPrompt: 'e.g. Describe a stable trend.',
  tags: 'e.g. trends, idiom',
} as const

/** The hint under every Reusable pattern field. "Blank" is kept for Fill in the blank. */
export const PATTERN_HINT = 'Type ___ for each slot.'

/** The empty choice in a select. */
export const NOT_SET = 'Not set'

export const REVIEW_START_OPTIONS: { value: ReviewStart; label: string }[] = [
  { value: 'today', label: 'Start today' },
  { value: 'tomorrow', label: 'Start tomorrow' },
  { value: 'none', label: 'Do not review' },
]
