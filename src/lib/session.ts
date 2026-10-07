import { timeOf } from './dates'
import { isDue } from './srs'
import type { Mode, Note } from './types'

function byDueThenCreated(a: Note, b: Note): number {
  return timeOf(a.next_review_at) - timeOf(b.next_review_at) || timeOf(a.created_at) - timeOf(b.created_at)
}

/** Alternates Speaking and Writing, keeping each list's order. Starts with the mode of the first note. */
function interleaveModes(sorted: Note[]): Note[] {
  if (sorted.length === 0) return []
  const first = sorted[0].mode
  const lead = sorted.filter((n) => n.mode === first)
  const other = sorted.filter((n) => n.mode !== first)
  const out: Note[] = []
  for (let i = 0; i < Math.max(lead.length, other.length); i++) {
    if (i < lead.length) out.push(lead[i])
    if (i < other.length) out.push(other[i])
  }
  return out
}

export function buildSessionQueue(notes: Note[], opts: { now: Date; size: number; mode?: Mode }): Note[] {
  const due = notes
    .filter((n) => isDue(n, opts.now) && (!opts.mode || n.mode === opts.mode))
    .sort(byDueThenCreated)
    .slice(0, Math.max(0, opts.size))
  return interleaveModes(due)
}
