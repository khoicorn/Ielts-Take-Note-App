/**
 * Global search (brief §30, design §8): normalized text, light stemming,
 * every query word must match, weighted by field.
 */
import { timeOf } from './dates'
import { normalizeText, plainText } from './text'
import type { Note, Paragraph } from './types'

export type SearchField =
  | 'upgraded_text'
  | 'original_text'
  | 'reusable_pattern'
  | 'example_sentence'
  | 'error_pattern'
  | 'fix_pattern'
  | 'explanation'
  | 'topic'
  | 'tags'
  | 'subtopic'
  | 'model_paragraph'
  | 'title'
  | 'body'

export type SearchHit =
  | { kind: 'note'; note: Note; score: number; field: SearchField; snippet: string }
  | { kind: 'paragraph'; paragraph: Paragraph; score: number; field: SearchField; snippet: string }

const WEIGHTS: Readonly<Record<SearchField, number>> = {
  upgraded_text: 10,
  original_text: 8,
  reusable_pattern: 7,
  example_sentence: 6,
  error_pattern: 6,
  fix_pattern: 6,
  explanation: 4,
  topic: 3,
  tags: 3,
  subtopic: 2,
  model_paragraph: 2,
  title: 6,
  body: 3,
}

const PHRASE_BONUS = 5
const SNIPPET_MAX = 160
const SNIPPET_WINDOW = 140
const SNIPPET_LEAD = 40

const SUFFIXES: readonly [string, string][] = [
  ['ility', ''],
  ['ation', ''],
  ['ness', ''],
  ['ment', ''],
  ['ingly', ''],
  ['edly', ''],
  ['ing', ''],
  ['ied', 'y'],
  ['ies', 'y'],
  ['ed', ''],
  ['ly', ''],
  ['es', ''],
  ['s', ''],
  ['le', ''],
  ['e', ''],
]
const MIN_STEM = 4

/** A final "i" becomes "y", so "steadily" (steadi) and "steady" share a stem. */
function iToY(s: string): string {
  return s.length >= MIN_STEM && s.endsWith('i') ? `${s.slice(0, -1)}y` : s
}

/**
 * Strips one suffix, keeping at least 4 letters: stable, stability and stably all become "stab".
 * Then a final "i" becomes "y": steady, steadily → "steady"; easy, easily → "easy".
 */
export function stem(word: string): string {
  const w = word.toLowerCase().replace(/'s$|'$/, '')
  for (const [suffix, replacement] of SUFFIXES) {
    if (!w.endsWith(suffix)) continue
    const candidate = w.slice(0, w.length - suffix.length) + replacement
    if (candidate.length >= MIN_STEM) return iToY(candidate)
  }
  return iToY(w)
}

interface QueryToken {
  raw: string
  stem: string
}

function queryTokens(query: string): { tokens: QueryToken[]; phrase: string } {
  const phrase = normalizeText(query)
  const tokens = phrase
    .split(' ')
    .filter(Boolean)
    .map((raw) => ({ raw, stem: stem(raw) }))
  return { tokens, phrase }
}

function wordMatches(normalizedWord: string, stemmedWord: string, q: QueryToken): boolean {
  return stemmedWord.startsWith(q.stem) || (q.raw.length >= 3 && normalizedWord.includes(q.raw))
}

interface IndexedField {
  field: SearchField
  weight: number
  plain: string
  norm: string
  words: string[]
  stems: string[]
}

const indexCache = new WeakMap<Note | Paragraph, IndexedField[]>()

function indexFields(entries: [SearchField, string][]): IndexedField[] {
  return entries.flatMap(([field, value]) => {
    if (!value || !value.trim()) return []
    const plain = plainText(value).replace(/\s+/g, ' ').trim()
    const norm = normalizeText(plain)
    if (!norm) return []
    const words = norm.split(' ')
    return [{ field, weight: WEIGHTS[field], plain, norm, words, stems: words.map(stem) }]
  })
}

function noteFields(n: Note): IndexedField[] {
  let fields = indexCache.get(n)
  if (!fields) {
    fields = indexFields([
      ['upgraded_text', n.upgraded_text],
      ['original_text', n.original_text],
      ['reusable_pattern', n.reusable_pattern],
      ['example_sentence', n.example_sentence],
      ['error_pattern', n.error_pattern],
      ['fix_pattern', n.fix_pattern],
      ['explanation', n.explanation],
      ['topic', n.topic],
      ['tags', n.tags.join(' ')],
      ['subtopic', n.subtopic],
      ['model_paragraph', n.model_paragraph],
    ])
    indexCache.set(n, fields)
  }
  return fields
}

function paragraphFields(p: Paragraph): IndexedField[] {
  let fields = indexCache.get(p)
  if (!fields) {
    fields = indexFields([
      ['title', p.title],
      ['body', p.body],
      ['topic', p.topic],
      ['tags', p.tags.join(' ')],
    ])
    indexCache.set(p, fields)
  }
  return fields
}

function fieldMatches(f: IndexedField, q: QueryToken): boolean {
  return f.stems.some((s, i) => wordMatches(f.words[i], s, q)) || (q.raw.length >= 3 && f.norm.includes(q.raw))
}

function makeSnippet(plain: string, query: string): string {
  if (plain.length <= SNIPPET_MAX) return plain
  const first = matchRanges(plain, query)[0]?.[0] ?? 0
  let start = Math.max(0, first - SNIPPET_LEAD)
  if (start > 0) {
    const space = plain.indexOf(' ', start)
    if (space >= 0 && space < first) start = space + 1
  }
  let end = Math.min(plain.length, start + SNIPPET_WINDOW)
  if (end < plain.length) {
    const space = plain.lastIndexOf(' ', end)
    if (space > first) end = space
  }
  return `${start > 0 ? '…' : ''}${plain.slice(start, end).trim()}${end < plain.length ? '…' : ''}`
}

/** Scores one record. Returns null unless every query token matches some field. */
function scoreFields(fields: IndexedField[], tokens: QueryToken[], phrase: string): { score: number; best: IndexedField } | null {
  let score = 0
  for (const q of tokens) {
    let bestWeight = 0
    for (const f of fields) if (f.weight > bestWeight && fieldMatches(f, q)) bestWeight = f.weight
    if (bestWeight === 0) return null
    score += bestWeight
  }
  const ranked = fields
    .map((f) => ({ f, phrase: f.norm.includes(phrase), matched: tokens.filter((q) => fieldMatches(f, q)).length }))
    .sort((a, b) => Number(b.phrase) - Number(a.phrase) || b.matched - a.matched || b.f.weight - a.f.weight)
  const top = ranked[0]
  if (top.phrase) score += PHRASE_BONUS
  return { score, best: top.f }
}

export function searchAll(query: string, notes: Note[], paragraphs: Paragraph[], limit = 50): SearchHit[] {
  const { tokens, phrase } = queryTokens(query)
  if (tokens.length === 0) return []
  const hits: { hit: SearchHit; updated: number }[] = []
  for (const note of notes) {
    if (note.is_archived) continue
    const r = scoreFields(noteFields(note), tokens, phrase)
    if (r) {
      hits.push({
        hit: { kind: 'note', note, score: r.score, field: r.best.field, snippet: makeSnippet(r.best.plain, query) },
        updated: timeOf(note.updated_at),
      })
    }
  }
  for (const paragraph of paragraphs) {
    if (paragraph.is_archived) continue
    const r = scoreFields(paragraphFields(paragraph), tokens, phrase)
    if (r) {
      hits.push({
        hit: { kind: 'paragraph', paragraph, score: r.score, field: r.best.field, snippet: makeSnippet(r.best.plain, query) },
        updated: timeOf(paragraph.updated_at),
      })
    }
  }
  return hits
    .sort((a, b) => b.hit.score - a.hit.score || b.updated - a.updated)
    .slice(0, limit)
    .map((h) => h.hit)
}

// Words with in-word apostrophes ("don't"). A trailing apostrophe stays only after "s" (plural
// possessive "visitors'"), the same rule as normalizeText, so a closing quote is not highlighted.
const WORD_RE = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*(?:(?<=[sS])['’](?![\p{L}\p{M}\p{N}]))?/gu

export function matchRanges(text: string, query: string): Array<[number, number]> {
  const { tokens } = queryTokens(query)
  if (tokens.length === 0 || !text) return []
  const ranges: Array<[number, number]> = []
  for (const m of text.matchAll(WORD_RE)) {
    const words = normalizeText(m[0]).split(' ').filter(Boolean)
    const hit = words.some((w) => {
      const s = stem(w)
      return tokens.some((q) => wordMatches(w, s, q))
    })
    if (hit) ranges.push([m.index, m.index + m[0].length])
  }
  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && /^\s*$/.test(text.slice(last[1], r[0]))) last[1] = r[1]
    else merged.push([r[0], r[1]])
  }
  return merged
}
