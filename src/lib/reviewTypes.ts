/**
 * Review types and card building (brief §25, design §5).
 */
import { diffOps, isWordToken, tokenSpans, tokenizeWords, wordDiff } from './diff'
import type { DiffToken } from './diff'
import { flattenMarkdown } from './mdparse'
import { FIELD_LABELS } from './taxonomy'
import { plainText } from './text'
import type { Note, ReviewStyle, ReviewType } from './types'

/** Indices point into plainText(sentence). */
export interface BlankTarget {
  sentence: string
  start: number
  end: number
  answer: string
}

export interface ReviewCard {
  type: ReviewType
  /** e.g. "Recall the better version" */
  promptLabel: string
  /** Markdown subset */
  prompt: string
  /** e.g. "What I said" */
  promptHint?: string
  /** e.g. "Better English" */
  answerLabel: string
  answer: string
  /** example sentence */
  context?: string
  pattern?: string
  explanation?: string
  blank?: { before: string; after: string; answer: string }
}

const BLANK = '_____'
const MAX_PHRASE_WORDS = 6
const MAX_BLANK_WORDS = 4
const TYPE_ORDER: readonly ReviewType[] = ['upgrade', 'phrase_to_sentence', 'fill_blank', 'pattern_recall']

function has(s: string | undefined): s is string {
  return Boolean(s && s.trim())
}

function wordCount(s: string): number {
  return tokenizeWords(s).filter(isWordToken).length
}

function isLetterOrDigit(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch)
}

const JOINERS = new Set(['-', "'", '’', '‘'])

/** True when the text continues the word across `edge`: a letter, or a hyphen or apostrophe inside a word ("well-known", "it's"). */
function joinsWord(text: string, edge: number, step: 1 | -1): boolean {
  const ch = text[edge]
  if (isLetterOrDigit(ch)) return true
  return ch !== undefined && JOINERS.has(ch) && isLetterOrDigit(text[edge + step])
}

/** Curly quotes become straight ones. Each swap is one character for one, so indices stay valid. */
function straightQuotes(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}

const TRAILING_PUNCT_RE = /[\s.,;:!?…]+$/

/** A blank is only useful if some words stay visible around it. */
function makeTarget(sentence: string, plain: string, start: number, end: number): BlankTarget | null {
  const answer = plain.slice(start, end).trim()
  const rest = plain.slice(0, start) + plain.slice(end)
  if (!answer || !/[\p{L}\p{N}]/u.test(rest)) return null
  return { sentence, start, end, answer }
}

/** (1) The first **bold** span in the example. */
function boldBlank(example: string): BlankTarget | null {
  const { text, spans } = flattenMarkdown(example)
  const bold = spans.find((s) => s.type === 'bold' && text.slice(s.start, s.end).trim())
  if (!bold) return null
  // Trim spaces, and a closing full stop or comma, so the blank covers only the words.
  const raw = text.slice(bold.start, bold.end)
  const start = bold.start + (raw.length - raw.trimStart().length)
  const end = bold.start + raw.replace(TRAILING_PUNCT_RE, '').length
  return end > start ? makeTarget(example, text, start, end) : null
}

/** (2) The upgraded phrase (1–6 words) inside the example, case-insensitive, on word edges. */
function phraseBlank(upgraded: string, example: string): BlankTarget | null {
  const phrase = plainText(upgraded).trim().replace(/[.,;:!?…]+$/, '').trim()
  const count = wordCount(phrase)
  if (count < 1 || count > MAX_PHRASE_WORDS) return null
  const plain = plainText(example)
  // Lowercasing can change the length of a few letters (İ), which would shift the indices.
  const haystack = straightQuotes(plain).toLowerCase()
  const needle = straightQuotes(phrase).toLowerCase()
  if (haystack.length !== plain.length) return null
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) {
    const end = at + needle.length
    if (!joinsWord(plain, at - 1, -1) && !joinsWord(plain, end, 1)) return makeTarget(example, plain, at, end)
  }
  return null
}

/** (3) The first run of added words (1–4 words) between the original and the upgrade. */
function diffBlank(original: string, upgraded: string): BlankTarget | null {
  const plain = plainText(upgraded)
  const target = tokenSpans(plain)
  const added = new Array<boolean>(target.length).fill(false)
  for (const op of diffOps(tokenizeWords(plainText(original)), target.map((t) => t.text))) {
    if (op.kind === 'added') added[op.toIndex] = true
  }
  let i = 0
  while (i < target.length) {
    if (!added[i]) {
      i++
      continue
    }
    let j = i
    while (j < target.length && added[j]) j++
    // Trim punctuation at the edges of the run.
    let first = i
    let last = j - 1
    while (first <= last && !isWordToken(target[first].text)) first++
    while (last >= first && !isWordToken(target[last].text)) last--
    const words = target.slice(first, last + 1).filter((t) => isWordToken(t.text)).length
    if (words >= 1 && words <= MAX_BLANK_WORDS) {
      const found = makeTarget(upgraded, plain, target[first].start, target[last].end)
      if (found) return found
    }
    i = j
  }
  return null
}

export function findBlank(note: Note): BlankTarget | null {
  const example = note.example_sentence
  if (has(example)) {
    const bold = boldBlank(example)
    if (bold) return bold
    if (has(note.upgraded_text)) {
      const phrase = phraseBlank(note.upgraded_text, example)
      if (phrase) return phrase
    }
  }
  if (has(note.original_text) && has(note.upgraded_text)) return diffBlank(note.original_text, note.upgraded_text)
  return null
}

export function availableReviewTypes(note: Note): ReviewType[] {
  const types: ReviewType[] = []
  const hasOriginal = has(note.original_text)
  if (hasOriginal) types.push('upgrade')
  if (!hasOriginal && has(note.example_sentence)) types.push('phrase_to_sentence')
  if (findBlank(note)) types.push('fill_blank')
  if (has(note.reusable_pattern)) types.push('pattern_recall')
  return types.length > 0 ? types : ['phrase_to_sentence']
}

export function pickReviewType(note: Note, style: ReviewStyle): ReviewType {
  const available = availableReviewTypes(note)
  if (style === 'upgrade_only' || note.times_reviewed < 2) return available[0]
  return available[(note.times_reviewed - 2) % available.length]
}

/** Copies only non-empty optional fields onto the card. */
function withOptional(card: ReviewCard, optional: Partial<Pick<ReviewCard, 'promptHint' | 'context' | 'pattern' | 'explanation'>>): ReviewCard {
  for (const key of ['promptHint', 'context', 'pattern', 'explanation'] as const) {
    const value = optional[key]
    if (has(value)) card[key] = value.trim()
  }
  return card
}

function phraseCard(note: Note, extras: { pattern?: string; explanation?: string }): ReviewCard {
  return withOptional(
    {
      type: 'phrase_to_sentence',
      promptLabel: 'Use it in a full sentence',
      prompt: note.upgraded_text,
      answerLabel: 'In context',
      answer: has(note.example_sentence) ? note.example_sentence : note.upgraded_text,
    },
    extras,
  )
}

/** Builds the card for a review type. A type the note cannot support falls back to Phrase → Sentence. */
export function buildReviewCard(note: Note, type: ReviewType): ReviewCard {
  const extras = { pattern: note.reusable_pattern, explanation: note.explanation }
  if (!TYPE_ORDER.includes(type)) return phraseCard(note, extras)
  switch (type) {
    case 'upgrade':
      if (!has(note.original_text)) return phraseCard(note, extras)
      return withOptional(
        {
          type,
          promptLabel: 'Recall the better version',
          prompt: note.original_text,
          answerLabel: 'Better English',
          answer: note.upgraded_text,
        },
        { promptHint: FIELD_LABELS[note.mode].original, context: note.example_sentence, ...extras },
      )
    case 'phrase_to_sentence':
      return phraseCard(note, extras)
    case 'fill_blank': {
      const target = findBlank(note)
      if (!target) return phraseCard(note, extras)
      const plain = plainText(target.sentence)
      const blank = { before: plain.slice(0, target.start), after: plain.slice(target.end), answer: target.answer }
      return withOptional(
        {
          type,
          promptLabel: 'Fill in the blank',
          prompt: `${blank.before}${BLANK}${blank.after}`,
          answerLabel: 'Answer',
          answer: target.answer,
          blank,
        },
        { context: target.sentence, ...extras },
      )
    }
    case 'pattern_recall': {
      if (!has(note.reusable_pattern)) return phraseCard(note, extras)
      const topic = note.topic.trim()
      const prompt = has(note.recall_prompt)
        ? note.recall_prompt.trim()
        : topic
          ? `Use your pattern for: ${topic}`
          : 'Use your pattern in a sentence.'
      return withOptional(
        { type, promptLabel: 'Pattern recall', prompt, answerLabel: 'Pattern', answer: note.reusable_pattern },
        { context: note.example_sentence, explanation: note.explanation },
      )
    }
  }
}

export function compareAnswer(typed: string, expected: string): DiffToken[] {
  return wordDiff(plainText(typed), plainText(expected))
}
