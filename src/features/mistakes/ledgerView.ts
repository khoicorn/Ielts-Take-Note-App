/**
 * Splits the Error Ledger (lib/mistakes buildLedger) into what the My Mistakes screen shows:
 * repeated habits first (most frequent first), then habits seen only once ("Not yet repeated").
 */
import type { LedgerGroup, LedgerPattern } from '@/lib/mistakes'
import { errorTypeSlug } from '@/lib/mistakes'
import { plainText } from '@/lib/text'
import type { Note } from '@/lib/types'

/** Patterns seen this many times or more get the "Frequent" marker. */
export const FREQUENT_AT = 3

/** One habit seen once, shown as "habit → fix" and linked to its note. */
export interface OnceRow {
  key: string
  /** The habit (error pattern) or, for a note without a pattern, what was said. May be empty. */
  habit: string
  /** The fix pattern, or the note's upgrade when there is no fix pattern. */
  fix: string
  note: Note
}

export interface RepeatedGroup {
  error_type: string
  slug: string
  seen: number
  patternCount: number
  /** Patterns seen 2 or more times, most seen first. */
  repeated: LedgerPattern[]
  /** Patterns seen once, folded into one line. */
  once: OnceRow[]
  /** Notes with this error type but no pattern. */
  loose: Note[]
}

export interface OnceGroup {
  error_type: string
  slug: string
  rows: OnceRow[]
}

export interface LedgerView {
  repeated: RepeatedGroup[]
  once: OnceGroup[]
}

/** Collapses line breaks so a one-line row stays on one line. */
function oneLine(s: string): string {
  return plainText(s).replace(/\s*\n+\s*/g, ' ').trim()
}

function patternRow(p: LedgerPattern): OnceRow {
  const note = p.notes[0]
  return { key: `p:${p.key}`, habit: p.error_pattern, fix: p.fix_pattern || oneLine(note.upgraded_text), note }
}

function looseRow(n: Note): OnceRow {
  return { key: `n:${n.id}`, habit: oneLine(n.original_text), fix: oneLine(n.upgraded_text), note: n }
}

export function splitLedger(groups: LedgerGroup[]): LedgerView {
  const repeated: RepeatedGroup[] = []
  const once: OnceGroup[] = []
  for (const g of groups) {
    const slug = errorTypeSlug(g.error_type) || 'other'
    const many = g.patterns.filter((p) => p.seen >= 2)
    const single = g.patterns.filter((p) => p.seen < 2)
    if (many.length > 0) {
      repeated.push({
        error_type: g.error_type,
        slug,
        seen: g.seen,
        patternCount: g.patterns.length,
        repeated: many,
        once: single.map(patternRow),
        loose: g.loose,
      })
    } else {
      once.push({ error_type: g.error_type, slug, rows: [...single.map(patternRow), ...g.loose.map(looseRow)] })
    }
  }
  // Most frequent first (brief §28: "Fix the most frequent first"). Ties keep the ledger order. Array.sort is stable.
  repeated.sort((a, b) => b.seen - a.seen)
  once.sort((a, b) => b.rows.length - a.rows.length)
  return { repeated, once }
}

/** "1 time", "4 times". */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** The newest note's explanation, first paragraph only. Empty when no note explains the habit. */
export function patternWhy(p: LedgerPattern): string {
  const withWhy = p.notes.find((n) => n.explanation.trim())
  if (!withWhy) return ''
  return withWhy.explanation.trim().split(/\n\s*\n/)[0].trim()
}
