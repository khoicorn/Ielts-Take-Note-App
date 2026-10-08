/**
 * Marks for the typed answer (design §5). Pure, so the rules can be tested on their own.
 */
import type { DiffToken } from '@/lib/diff'
import { isWordToken } from '@/lib/diff'
import { compareAnswer } from '@/lib/reviewTypes'

/** "___" (three or more underscores) is a slot in a reusable pattern, as in the Markdown renderer. */
export function isSlot(text: string): boolean {
  return /^_{3,}$/.test(text)
}

/**
 * Words typed in place of a ___ slot fill it, so they count as matching.
 * A slot left empty shows as missing. The fixed words of the pattern are still compared.
 *
 * Pattern "visitors to ___ increased", typed "visitors to the museum increased":
 * the diff says "the museum" is extra and "___" is missing, in one change. That change is a filled slot.
 */
export function fillSlots(tokens: DiffToken[]): DiffToken[] {
  const out: DiffToken[] = []
  let i = 0
  while (i < tokens.length) {
    if (tokens[i].kind === 'same') {
      out.push(tokens[i])
      i += 1
      continue
    }
    let j = i
    while (j < tokens.length && tokens[j].kind !== 'same') j += 1
    const change = tokens.slice(i, j)
    const hasSlot = change.some((t) => t.kind === 'added' && isSlot(t.text))
    if (!hasSlot) {
      out.push(...change)
    } else {
      const filled = change.some((t) => t.kind === 'removed' && isWordToken(t.text))
      for (const t of change) {
        if (t.kind === 'removed') out.push({ ...t, kind: 'same' })
        else if (!isSlot(t.text) || !filled) out.push(t)
      }
    }
    i = j
  }
  return out
}

/**
 * Only words count. A missing full stop is not a mistake worth marking.
 * Missing punctuation is left out; extra punctuation shows as typed. An empty slot shows as missing.
 */
export function visibleTokens(tokens: DiffToken[]): DiffToken[] {
  const counts = (t: DiffToken) => isWordToken(t.text) || isSlot(t.text)
  return tokens.filter((t) => counts(t) || t.kind !== 'added').map((t) => (counts(t) ? t : { ...t, kind: 'same' as const }))
}

/** The marks shown under the answer: matching, missing ("added") and extra ("removed") tokens. */
export function typedMarks(typed: string, expected: string): DiffToken[] {
  return visibleTokens(fillSlots(compareAnswer(typed, expected)))
}
