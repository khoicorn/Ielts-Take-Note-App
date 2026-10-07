/**
 * Shared data contract. Every module and screen builds on these types.
 * Design: docs/superpowers/specs/2026-10-07-ielts-upgrade-notebook-design.md §3
 */

export type Mode = 'speaking' | 'writing'

/** Writing task. Empty string for Speaking notes. */
export type TaskType = '' | 'task1' | 'task2'

export type NoteType =
  | 'correction'
  | 'collocation'
  | 'sentence_pattern'
  | 'linking_phrase'
  | 'grammar_pattern'
  | 'useful_expression'

export type MasteryStatus = 'new' | 'learning' | 'familiar' | 'mastered'

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export type ReviewType = 'upgrade' | 'phrase_to_sentence' | 'fill_blank' | 'pattern_recall'

/** 0 = New. 1–7 = intervals of 1, 3, 7, 14, 30, 60, 120 days. */
export type ReviewStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Local calendar day, 'YYYY-MM-DD'. */
export type DayKey = string

/** ISO 8601 date-time string. */
export type ISODateTime = string

/** How a new note enters the review schedule (Quick Add "More details"). */
export type ReviewStart = 'today' | 'tomorrow' | 'none'

export type Difficulty = 0 | 1 | 2 | 3

export interface Note {
  id: string
  mode: Mode
  /** Study date. Editable. Defaults to today. */
  date_created: DayKey
  /** Speaking topic (e.g. "Travel") or Writing language topic (e.g. "Increase"). */
  topic: string
  /** Free text, e.g. "Nha Trang trip". */
  subtopic: string
  task_type: TaskType
  /** Chart type (Task 1) or essay type (Task 2). Writing only. */
  task_genre: string
  /** What I Said / My Sentence. Empty for phrase notes. Light Markdown subset. */
  original_text: string
  /** Native Upgrade / Band 7+ Upgrade. Required. Light Markdown subset. */
  upgraded_text: string
  /** Why. Light Markdown subset (paragraphs, bullets, bold). */
  explanation: string
  /** In context / Model sentence. **bold** marks the fill-in-the-blank target. */
  example_sentence: string
  /** ___ marks a slot. */
  reusable_pattern: string
  /** Optional paragraph attached to this note. */
  model_paragraph: string
  note_type: NoteType
  /** One of ERROR_TYPES or a custom string. Empty when not set. */
  error_type: string
  /** The habit, e.g. "visitors of + place". Groups notes in My Mistakes. */
  error_pattern: string
  /** The fix, e.g. "visitors to + place". */
  fix_pattern: string
  /** Pattern Recall prompt, e.g. "Describe a stable trend." */
  recall_prompt: string
  /** Lowercase, trimmed, unique. */
  tags: string[]
  difficulty: Difficulty
  is_favorite: boolean
  mastery_status: MasteryStatus
  review_stage: ReviewStage
  last_reviewed_at: ISODateTime | null
  /** null = not scheduled for review. */
  next_review_at: ISODateTime | null
  times_reviewed: number
  /** Starts at 1. "I made this mistake again" adds 1. */
  times_seen: number
  /** Set when the note was created from a model paragraph selection. */
  source_paragraph_id: string | null
  is_archived: boolean
  archived_at: ISODateTime | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

/** Fields the owner writes. Review and system fields are excluded. */
export type NoteContentField =
  | 'mode'
  | 'date_created'
  | 'topic'
  | 'subtopic'
  | 'task_type'
  | 'task_genre'
  | 'original_text'
  | 'upgraded_text'
  | 'explanation'
  | 'example_sentence'
  | 'reusable_pattern'
  | 'model_paragraph'
  | 'note_type'
  | 'error_type'
  | 'error_pattern'
  | 'fix_pattern'
  | 'recall_prompt'
  | 'tags'
  | 'difficulty'
  | 'is_favorite'
  | 'source_paragraph_id'

/** Input for createNote(). Only mode and upgraded_text are required. */
export type NoteDraft = Pick<Note, 'mode' | 'upgraded_text'> & Partial<Pick<Note, NoteContentField>>

/** Input for updateNote(). Editing never touches review fields (brief §41). */
export type NoteContentPatch = Partial<Pick<Note, NoteContentField>>

export interface Review {
  id: string
  note_id: string
  review_date: DayKey
  rating: Rating
  review_type: ReviewType
  previous_stage: ReviewStage
  new_stage: ReviewStage
  /** Days. */
  previous_interval: number
  /** Days. */
  new_interval: number
  created_at: ISODateTime
}

/** Model paragraph (brief §23). Stored separately from notes. */
export interface Paragraph {
  id: string
  title: string
  task_type: TaskType
  task_genre: string
  topic: string
  /** Light Markdown subset. */
  body: string
  tags: string[]
  is_favorite: boolean
  is_archived: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type ParagraphDraft = Pick<Paragraph, 'title' | 'body'> &
  Partial<Pick<Paragraph, 'task_type' | 'task_genre' | 'topic' | 'tags' | 'is_favorite'>>

export type ParagraphPatch = Partial<
  Pick<Paragraph, 'title' | 'body' | 'task_type' | 'task_genre' | 'topic' | 'tags' | 'is_favorite'>
>

export type ThemePreference = 'system' | 'light' | 'dark'

export type ReviewStyle = 'mixed' | 'upgrade_only'

export interface Settings {
  theme: ThemePreference
  /** Maximum notes per review session. */
  session_size: number
  review_style: ReviewStyle
  custom_speaking_topics: string[]
  custom_task1_topics: string[]
  custom_task2_topics: string[]
  custom_error_types: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  session_size: 20,
  review_style: 'mixed',
  custom_speaking_topics: [],
  custom_task1_topics: [],
  custom_task2_topics: [],
  custom_error_types: [],
}

/** "Continue studying" on Today. Updated when a note is saved, opened or reviewed. */
export interface LastStudied {
  mode: Mode
  task_type: TaskType
  topic: string
  at: ISODateTime
}

export type ReviewStatusFilter = 'due' | 'scheduled' | 'unscheduled' | 'new'

/** All Notes filters (brief §31). Serialized to the URL query. */
export interface NoteFilter {
  mode?: Mode
  topics?: string[]
  task_type?: Exclude<TaskType, ''>
  error_types?: string[]
  note_types?: NoteType[]
  mastery?: MasteryStatus[]
  /** due = due now (includes new notes that are due); new = never reviewed; scheduled = has a future date; unscheduled = no date. */
  review_status?: ReviewStatusFilter
  favorite?: boolean
  /** Inclusive, compared with date_created. */
  date_from?: DayKey
  date_to?: DayKey
  /** false or undefined = hide archived notes. true = show only archived notes. */
  archived?: boolean
}

/** JSON export and import format. */
export interface ExportBundle {
  app: 'ielts-upgrade-notebook'
  version: 1
  exported_at: ISODateTime
  notes: Note[]
  reviews: Review[]
  paragraphs: Paragraph[]
  settings?: Settings
}
