/**
 * Pure helpers shared by the notebook screens (All Notes, Speaking, Writing, Must Remember):
 * plain-English counts, topic grouping and the "next review" wording.
 */
import { formatDue } from '@/lib/dates'
import { isDue } from '@/lib/srs'
import { taskTypeLabel } from '@/lib/taxonomy'
import type { Note } from '@/lib/types'

/** "1 note", "3 notes". */
export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`
}

/** "5 notes · 3 due". The due part is left out when nothing is due. */
export function countLine(total: number, due: number, dueWord = 'due'): string {
  return due > 0 ? `${plural(total, 'note')} · ${due} ${dueWord}` : plural(total, 'note')
}

/** "17 notes in 9 topics. 8 are due for review today." */
export function notebookSummary(notes: number, topics: number, due: number): string {
  const head = topics > 0 ? `${plural(notes, 'note')} in ${plural(topics, 'topic')}.` : `${plural(notes, 'note')}.`
  if (due === 0) return `${head} Nothing is due for review today.`
  return `${head} ${due} ${due === 1 ? 'is' : 'are'} due for review today.`
}

/** Short next-review text for table cells: "Today", "Tomorrow", "In 3 days", "12 Nov", "Not scheduled". */
export function dueCell(note: Pick<Note, 'next_review_at' | 'is_archived'>, now: Date): string {
  if (note.is_archived) return 'Archived'
  const text = formatDue(note.next_review_at, now)
  return text === 'Due today' ? 'Today' : text
}

/** Longer wording for reading layouts: "Due today", "Next review in 5 days", "Next review tomorrow", "Not scheduled". */
export function nextReviewLine(note: Pick<Note, 'next_review_at' | 'is_archived'>, now: Date): string {
  if (note.is_archived) return 'Archived'
  const text = formatDue(note.next_review_at, now)
  if (text === 'Due today' || text === 'Not scheduled') return text
  if (text === 'Tomorrow') return 'Next review tomorrow'
  if (text.startsWith('In ')) return `Next review in ${text.slice(3)}`
  return `Next review on ${text}`
}

/** "Task 1" for Writing notes, "Speaking" for Speaking notes. */
export function modeOrTask(note: Pick<Note, 'mode' | 'task_type'>): string {
  if (note.mode === 'speaking') return 'Speaking'
  return taskTypeLabel(note.task_type, 'short') || 'Writing'
}

export const NO_TOPIC = 'No topic'

function topicKey(topic: string): string {
  return topic.trim().toLowerCase()
}

/** Anchor-safe id for a topic group: "Daily Routine" → "topic-daily-routine". */
export function topicSlug(topic: string): string {
  const s = topicKey(topic)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `topic-${s || 'none'}`
}

export interface TopicGroup {
  /** Lowercase, trimmed topic. Empty for notes without a topic. */
  key: string
  label: string
  slug: string
  notes: Note[]
  due: number
}

/**
 * Groups notes by topic, ignoring case ("Travel" and "travel" are one group).
 * The label uses the default spelling when the topic is a default one.
 * Larger groups first, then A–Z; notes without a topic come last. Notes keep their order inside a group.
 */
export function groupByTopic(notes: Note[], knownTopics: readonly string[], now: Date): TopicGroup[] {
  const known = new Map(knownTopics.map((t) => [topicKey(t), t.trim()]))
  const groups = new Map<string, TopicGroup>()
  for (const n of notes) {
    const key = topicKey(n.topic)
    let g = groups.get(key)
    if (!g) {
      const label = key ? (known.get(key) ?? n.topic.trim()) : NO_TOPIC
      g = { key, label, slug: topicSlug(key || 'none'), notes: [], due: 0 }
      groups.set(key, g)
    }
    g.notes.push(n)
    if (isDue(n, now)) g.due += 1
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.key !== !b.key) return a.key ? -1 : 1
    return b.notes.length - a.notes.length || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  })
}

/** Known topics that no note uses yet, in their usual order. */
export function unusedTopics(knownTopics: readonly string[], groups: readonly TopicGroup[]): string[] {
  const used = new Set(groups.map((g) => g.key))
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of knownTopics) {
    const k = topicKey(t)
    if (!k || used.has(k) || seen.has(k)) continue
    seen.add(k)
    out.push(t.trim())
  }
  return out
}

/** Finds the group or known topic a `?topic=` value points to (case-insensitive). */
export function resolveTopic(
  value: string | null,
  groups: readonly TopicGroup[],
  knownTopics: readonly string[],
): { key: string; label: string } | null {
  const key = value === null ? '' : topicKey(value)
  if (!key) return null
  const group = groups.find((g) => g.key === key)
  if (group) return { key, label: group.label }
  const known = knownTopics.find((t) => topicKey(t) === key)
  return { key, label: known?.trim() ?? value!.trim() }
}
