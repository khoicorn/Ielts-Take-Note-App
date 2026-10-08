/**
 * Pure helpers for model paragraphs (brief §23): body layout with plain-text offsets,
 * saved-phrase marks, word ranges for keyboard selection, and the Quick Add prefill.
 */
import type { QuickAddOptions } from '@/app/overlays'
import { parseMarkdown } from '@/lib/markdown'
import type { MdInline } from '@/lib/markdown'
import { noteTypeLabel, taskTypeLabel } from '@/lib/taxonomy'
import { extractSentence, plainText } from '@/lib/text'
import type { Note, NoteType, Paragraph } from '@/lib/types'

/** One inline run of the body, at `start` in the plain text. `text` may hold "\n" (a line break). */
export interface Leaf {
  type: MdInline['type']
  text: string
  start: number
}

/** A paragraph has one line; a list has one line per item. */
export interface BodyBlock {
  type: 'p' | 'ul' | 'ol'
  lines: Leaf[][]
}

export interface BodyLayout {
  /** Same as plainText(body): blocks and list items join with "\n". */
  text: string
  blocks: BodyBlock[]
}

export function layoutBody(body: string): BodyLayout {
  let text = ''
  const blocks = parseMarkdown(body ?? '').map((block, b): BodyBlock => {
    const source = block.type === 'p' ? [block.inline] : block.items
    const lines = source.map((nodes, l) => {
      if (b > 0 || l > 0) text += '\n'
      return nodes.map((node): Leaf => {
        const leaf = { type: node.type, text: node.text, start: text.length }
        text += node.text
        return leaf
      })
    })
    return { type: block.type, lines }
  })
  return { text, blocks }
}

/** A phrase in the body that is already saved as a note. */
export interface SavedMark {
  start: number
  end: number
  note: Note
}

/** Lowercase with straight quotes. Same length as the input for the text we compare. */
function fold(s: string): string {
  return s.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').toLowerCase()
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/** The note's upgrade as it may appear in the body: as written, then without closing punctuation. */
function candidates(note: Note): string[] {
  const phrase = oneLine(plainText(note.upgraded_text ?? ''))
  const bare = phrase.replace(/[.!?;:,…]+$/, '').trim()
  return [...new Set([phrase, bare])].filter((c) => c.length >= 2)
}

/**
 * Where each note's upgrade appears in the body (case-insensitive). Longer phrases win when two overlap.
 * Returns marks sorted by position.
 */
export function findSavedPhrases(text: string, notes: Note[]): SavedMark[] {
  const folded = fold(text)
  const haystack = folded.length === text.length ? folded : text
  const sameCase = haystack === text
  const found: SavedMark[] = []
  for (const note of notes) {
    for (const c of candidates(note)) {
      const needle = sameCase ? c : fold(c)
      const at = haystack.indexOf(needle)
      if (at >= 0) {
        found.push({ start: at, end: at + needle.length, note })
        break
      }
    }
  }
  found.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)
  const kept: SavedMark[] = []
  for (const m of found) {
    if (kept.every((k) => m.end <= k.start || m.start >= k.end)) kept.push(m)
  }
  return kept.sort((a, b) => a.start - b.start)
}

/** "Saved as a Collocation". */
export function savedTitle(note: Note): string {
  return `Saved as a ${noteTypeLabel(note.note_type)}`
}

const LEAD_PUNCT = /^[([{"'“‘«]+/
const TRAIL_PUNCT = /[.,;:!?…)\]}"'”’»]+$/

/** Word positions for keyboard selection. Punctuation at the edges is left out; "75,000" stays whole. */
export function wordRanges(text: string): [number, number][] {
  const out: [number, number][] = []
  for (const m of text.matchAll(/\S+/g)) {
    const raw = m[0]
    const lead = LEAD_PUNCT.exec(raw)?.[0].length ?? 0
    const trail = TRAIL_PUNCT.exec(raw.slice(lead))?.[0].length ?? 0
    const start = m.index + lead
    const end = m.index + raw.length - trail
    if (end > start) out.push([start, end])
  }
  return out
}

export interface TextRange {
  start: number
  end: number
  /** The selected words on one line. */
  text: string
}

/** Drops spaces at both ends. Null when nothing but space is left. */
export function trimRange(text: string, start: number, end: number): TextRange | null {
  let s = Math.max(0, Math.min(start, end))
  let e = Math.min(text.length, Math.max(start, end))
  while (s < e && /\s/.test(text[s])) s++
  while (e > s && /\s/.test(text[e - 1])) e--
  if (e <= s) return null
  return { start: s, end: e, text: oneLine(text.slice(s, e)) }
}

/** Quick Add options for "Save as …" on a selection (plan Task C6). */
export function selectionNoteOptions(p: Paragraph, text: string, sel: TextRange, noteType: NoteType): QuickAddOptions {
  const sentence = oneLine(extractSentence(text, sel.start, sel.end))
  const sameAsSelection = sentence.replace(TRAIL_PUNCT, '') === sel.text.replace(TRAIL_PUNCT, '')
  return {
    mode: 'writing',
    title: 'New note from paragraph',
    sourceParagraphId: p.id,
    prefill: {
      upgraded_text: sel.text,
      ...(sentence && !sameAsSelection ? { example_sentence: sentence } : {}),
      note_type: noteType,
      task_type: p.task_type,
      task_genre: p.task_genre,
      topic: p.topic,
      source_paragraph_id: p.id,
    },
  }
}

/** "Academic Task 1 · Line Graph · Comparison". Empty parts are left out. */
export function paragraphMeta(p: Pick<Paragraph, 'task_type' | 'task_genre' | 'topic'>): string {
  return [taskTypeLabel(p.task_type), p.task_genre.trim(), p.topic.trim()].filter(Boolean).join(' · ')
}

/** The first line of the body as plain text. */
export function paragraphPreview(body: string): string {
  return oneLine(plainText(body).split('\n').find((l) => l.trim()) ?? '')
}

export function wordCount(text: string): number {
  return text.match(/\S+/g)?.length ?? 0
}

export const UNTITLED = 'Untitled paragraph'

export function paragraphTitle(p: Pick<Paragraph, 'title'>): string {
  return p.title.trim() || UNTITLED
}

/** "1 note", "3 notes". */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
