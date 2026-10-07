/**
 * Word-level diff (LCS) for typed answers and automatic fill-in-the-blank targets.
 */

export interface DiffToken {
  text: string
  kind: 'same' | 'added' | 'removed'
}

export interface TokenSpan {
  text: string
  start: number
  end: number
}

export type DiffOp =
  | { kind: 'same'; fromIndex: number; toIndex: number }
  | { kind: 'removed'; fromIndex: number }
  | { kind: 'added'; toIndex: number }

/** Words keep inner apostrophes, hyphens and number separators ("I'm", "well-known", "35,000"). Runs of one punctuation mark stay together ("...", "___"). */
const TOKEN_RE = /[\p{L}\p{M}\p{N}]+(?:['’\-.,][\p{L}\p{M}\p{N}]+)*|([^\s\p{L}\p{M}\p{N}])\1*/gu

const NO_SPACE_BEFORE = new Set([',', '.', ';', ':', '!', '?', ')', ']', '}', '%', '…'])
const NO_SPACE_AFTER = new Set(['(', '[', '{'])

export function tokenSpans(s: string): TokenSpan[] {
  return Array.from(s.matchAll(TOKEN_RE), (m) => ({ text: m[0], start: m.index, end: m.index + m[0].length }))
}

export function tokenizeWords(s: string): string[] {
  return tokenSpans(s).map((t) => t.text)
}

export function isWordToken(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token)
}

export function joinTokens(tokens: string[]): string {
  let out = ''
  tokens.forEach((token, i) => {
    const prev = tokens[i - 1]
    const glue = i === 0 || NO_SPACE_BEFORE.has(token[0]) || NO_SPACE_AFTER.has(prev[prev.length - 1]) ? '' : ' '
    out += glue + token
  })
  return out
}

function compareKey(token: string): string {
  return token.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}

/** Longest common subsequence over tokens. Removals come before additions at each change. */
export function diffOps(from: string[], to: string[]): DiffOp[] {
  const a = from.map(compareKey)
  const b = to.map(compareKey)
  const width = b.length + 1
  // lcs[i * width + j] = LCS length of a[i..] and b[j..]
  const lcs = new Uint32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] = a[i] === b[j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
    }
  }
  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push({ kind: 'same', fromIndex: i++, toIndex: j++ })
    } else if (j >= b.length || (i < a.length && lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
      ops.push({ kind: 'removed', fromIndex: i++ })
    } else {
      ops.push({ kind: 'added', toIndex: j++ })
    }
  }
  return ops
}

export function wordDiff(from: string, to: string): DiffToken[] {
  const a = tokenizeWords(from)
  const b = tokenizeWords(to)
  return diffOps(a, b).map((op) =>
    op.kind === 'removed' ? { text: a[op.fromIndex], kind: 'removed' } : { text: b[op.toIndex], kind: op.kind },
  )
}
