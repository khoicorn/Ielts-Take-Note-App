/**
 * Fixed lists and labels (brief §16–17, §21–22, §25–28).
 * Custom topics and error types are stored in Settings and merged at runtime.
 */
import type { MasteryStatus, Mode, NoteType, Rating, ReviewType, TaskType } from './types'

/** Brief §21. */
export const SPEAKING_TOPICS: readonly string[] = [
  'Work',
  'Study',
  'Hometown',
  'Home',
  'Family',
  'Friends',
  'Food',
  'Drinks',
  'Travel',
  'Technology',
  'Shopping',
  'Health',
  'Exercise',
  'Music',
  'Movies',
  'Books',
  'Environment',
  'Transport',
  'Weather',
  'Clothes',
  'Social Media',
  'Education',
  'Culture',
  'Holidays',
  'Daily Routine',
]

export const TASK_TYPES: readonly { value: Exclude<TaskType, ''>; label: string; short: string }[] = [
  { value: 'task1', label: 'Academic Task 1', short: 'Task 1' },
  { value: 'task2', label: 'Task 2', short: 'Task 2' },
]

/** Brief §22, Task 1 chart types. Stored in Note.task_genre. */
export const CHART_TYPES: readonly string[] = ['Line Graph', 'Bar Chart', 'Pie Chart', 'Table', 'Map', 'Process']

/** Brief §22, Task 1 language topics. Stored in Note.topic. */
export const TASK1_TOPICS: readonly string[] = [
  'Increase',
  'Decrease',
  'Stability',
  'Fluctuation',
  'Peak',
  'Low Point',
  'Comparison',
  'Approximation',
  'Overview',
  'Introduction',
]

/** Brief §22, Task 2 essay types. Stored in Note.task_genre. */
export const ESSAY_TYPES: readonly string[] = [
  'Opinion',
  'Discussion',
  'Advantages / Disadvantages',
  'Problem / Solution',
  'Two-Part Question',
]

/** Brief §22, Task 2 language categories. Stored in Note.topic. */
export const TASK2_TOPICS: readonly string[] = [
  'Introduction',
  'Thesis',
  'Topic Sentence',
  'Explanation',
  'Example',
  'Cause and Effect',
  'Comparison',
  'Concession',
  'Conclusion',
]

/** Brief §28. Stored in Note.error_type. */
export const ERROR_TYPES: readonly string[] = [
  'Prepositions',
  'Articles',
  'Tenses',
  'Word Forms',
  'Collocations',
  'Word Choice',
  'Awkward Phrasing',
  'Speaking Grammar',
  'Writing Grammar',
  'Academic Task 1',
  'Task 2',
]

export const NOTE_TYPES: readonly { value: NoteType; label: string; saveAs: string }[] = [
  { value: 'correction', label: 'Correction', saveAs: 'Save as Correction' },
  { value: 'collocation', label: 'Collocation', saveAs: 'Save as Collocation' },
  { value: 'sentence_pattern', label: 'Sentence Pattern', saveAs: 'Save as Sentence Pattern' },
  { value: 'linking_phrase', label: 'Linking Phrase', saveAs: 'Save as Linking Phrase' },
  { value: 'grammar_pattern', label: 'Grammar Pattern', saveAs: 'Save as Grammar Pattern' },
  { value: 'useful_expression', label: 'Useful Expression', saveAs: 'Save as Useful Expression' },
]

/** The five "Save as" options on a model paragraph selection (brief §23). */
export const SELECTION_NOTE_TYPES: readonly NoteType[] = [
  'collocation',
  'sentence_pattern',
  'linking_phrase',
  'grammar_pattern',
  'useful_expression',
]

/** Brief §27. Always show the label with the symbol (brief §39). */
export const MASTERY: Readonly<Record<MasteryStatus, { label: string; symbol: string }>> = {
  new: { label: 'New', symbol: '○' },
  learning: { label: 'Learning', symbol: '◔' },
  familiar: { label: 'Familiar', symbol: '◑' },
  mastered: { label: 'Mastered', symbol: '✦' },
}

export const MASTERY_ORDER: readonly MasteryStatus[] = ['new', 'learning', 'familiar', 'mastered']

/** Brief §26. Index = stage. Stage 0 = New. */
export const STAGE_INTERVALS: readonly number[] = [0, 1, 3, 7, 14, 30, 60, 120]

export const MAX_STAGE = 7

export const RATINGS: readonly { value: Rating; label: string; key: string }[] = [
  { value: 'again', label: 'Again', key: '1' },
  { value: 'hard', label: 'Hard', key: '2' },
  { value: 'good', label: 'Good', key: '3' },
  { value: 'easy', label: 'Easy', key: '4' },
]

export const REVIEW_TYPE_LABELS: Readonly<Record<ReviewType, string>> = {
  upgrade: 'Mistake → Upgrade',
  phrase_to_sentence: 'Phrase → Sentence',
  fill_blank: 'Fill in the blank',
  pattern_recall: 'Pattern Recall',
}

/** Field labels per mode (brief §16–17). Use these strings in every screen. */
export const FIELD_LABELS: Readonly<
  Record<Mode, { original: string; upgraded: string; explanation: string; example: string; pattern: string }>
> = {
  speaking: {
    original: 'What I Said',
    upgraded: 'Native Upgrade',
    explanation: 'Why',
    example: 'In context',
    pattern: 'Reusable pattern',
  },
  writing: {
    original: 'My Sentence',
    upgraded: 'Band 7+ Upgrade',
    explanation: 'Why it is better',
    example: 'Example',
    pattern: 'Reusable pattern',
  },
}

export const MODE_LABELS: Readonly<Record<Mode, string>> = {
  speaking: 'Speaking',
  writing: 'Writing',
}

/** Tag that marks example notes so they can be removed in one click. */
export const EXAMPLE_TAG = 'example'

export function taskTypeLabel(taskType: TaskType, form: 'label' | 'short' = 'label'): string {
  const found = TASK_TYPES.find((t) => t.value === taskType)
  return found ? found[form] : ''
}

export function noteTypeLabel(noteType: NoteType): string {
  return NOTE_TYPES.find((t) => t.value === noteType)?.label ?? 'Correction'
}

/** Default writing language topics for a task type. */
export function writingTopicsFor(taskType: TaskType): readonly string[] {
  if (taskType === 'task1') return TASK1_TOPICS
  if (taskType === 'task2') return TASK2_TOPICS
  return [...TASK1_TOPICS, ...TASK2_TOPICS.filter((t) => !TASK1_TOPICS.includes(t))]
}

/** Chart types or essay types for a task type. */
export function genresFor(taskType: TaskType): readonly string[] {
  if (taskType === 'task1') return CHART_TYPES
  if (taskType === 'task2') return ESSAY_TYPES
  return []
}
