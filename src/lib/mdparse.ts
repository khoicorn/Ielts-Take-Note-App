/**
 * Parser for the light Markdown subset used in note text (design §7):
 * **bold**, *italic*, ___ slots, paragraphs, "- " bullets and "1. " lists.
 * No HTML. Unclosed markers stay literal text.
 * React rendering lives in markdown.tsx; this file has no React so text.ts can use it.
 */

export type MdInline = { type: 'text' | 'bold' | 'italic' | 'slot'; text: string }
export type MdBlock = { type: 'p'; inline: MdInline[] } | { type: 'ul' | 'ol'; items: MdInline[][] }

const BULLET_RE = /^\s*[-*•]\s+(.*)$/
const ORDERED_RE = /^\s*\d{1,3}[.)]\s+(.*)$/

function isSpace(ch: string | undefined): boolean {
  return ch === undefined || /\s/.test(ch)
}

/** Finds a closing marker for an emphasis run that starts at `open`. Content must not start or end with whitespace. */
function findClose(src: string, open: number, marker: string): number {
  const contentStart = open + marker.length
  if (isSpace(src[contentStart])) return -1
  let from = contentStart + 1
  while (from <= src.length) {
    const close = src.indexOf(marker, from)
    if (close < 0) return -1
    // For single *, skip a ** pair (it belongs to bold).
    if (marker === '*' && src[close + 1] === '*') {
      from = close + 2
      continue
    }
    if (!isSpace(src[close - 1])) return close
    from = close + 1
  }
  return -1
}

export function parseInline(src: string): MdInline[] {
  const out: MdInline[] = []
  let text = ''
  const flush = () => {
    if (text) out.push({ type: 'text', text })
    text = ''
  }
  let i = 0
  while (i < src.length) {
    if (src.startsWith('**', i)) {
      const close = findClose(src, i, '**')
      if (close > i + 2) {
        flush()
        out.push({ type: 'bold', text: src.slice(i + 2, close) })
        i = close + 2
        continue
      }
      text += '**'
      i += 2
      continue
    }
    if (src[i] === '*') {
      const close = findClose(src, i, '*')
      if (close > i + 1) {
        flush()
        out.push({ type: 'italic', text: src.slice(i + 1, close) })
        i = close + 1
        continue
      }
      text += '*'
      i += 1
      continue
    }
    if (src[i] === '_') {
      let j = i
      while (src[j] === '_') j++
      if (j - i >= 3) {
        flush()
        out.push({ type: 'slot', text: src.slice(i, j) })
      } else {
        text += src.slice(i, j)
      }
      i = j
      continue
    }
    text += src[i]
    i += 1
  }
  flush()
  return out
}

type Draft = { type: 'p'; lines: string[] } | { type: 'ul' | 'ol'; items: string[] }

export function parseMarkdown(src: string): MdBlock[] {
  const drafts: Draft[] = []
  // Typed initializer: a plain `null` would narrow `current` to null inside the loop.
  let current = null as Draft | null
  for (const line of src.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') {
      current = null
      continue
    }
    const bullet = BULLET_RE.exec(line)
    const ordered = bullet ? null : ORDERED_RE.exec(line)
    const listType = bullet ? 'ul' : ordered ? 'ol' : null
    if (listType) {
      const itemText = (bullet ?? ordered)?.[1] ?? ''
      if (current?.type !== listType) {
        current = { type: listType, items: [] }
        drafts.push(current)
      }
      current.items.push(itemText)
    } else if (current && current.type !== 'p') {
      // A plain line right after a list item continues that item.
      current.items[current.items.length - 1] += `\n${line.trim()}`
    } else {
      if (!current) {
        current = { type: 'p', lines: [] }
        drafts.push(current)
      }
      current.lines.push(line.trim())
    }
  }
  return drafts.map((d) =>
    d.type === 'p' ? { type: 'p', inline: parseInline(d.lines.join('\n')) } : { type: d.type, items: d.items.map(parseInline) },
  )
}

export interface FlatSpan {
  type: MdInline['type']
  start: number
  end: number
}

/** Plain text of the Markdown subset plus the position of every inline node in it. Blocks and items join with "\n". */
export function flattenMarkdown(src: string): { text: string; spans: FlatSpan[] } {
  let text = ''
  const spans: FlatSpan[] = []
  const pushInline = (nodes: MdInline[]) => {
    for (const node of nodes) {
      spans.push({ type: node.type, start: text.length, end: text.length + node.text.length })
      text += node.text
    }
  }
  parseMarkdown(src).forEach((block, b) => {
    const lines = block.type === 'p' ? [block.inline] : block.items
    lines.forEach((nodes, l) => {
      if (b > 0 || l > 0) text += '\n'
      pushInline(nodes)
    })
  })
  return { text, spans }
}
