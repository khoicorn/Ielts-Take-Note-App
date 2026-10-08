/**
 * Text cleaning, paste conversion and smart paste (design §7, brief §20).
 */
import { flattenMarkdown } from './mdparse'

/* ------------------------------------------------------------------ */
/* HTML clipboard → Markdown subset                                    */
/* ------------------------------------------------------------------ */

type Run = { text: string; bold: boolean; italic: boolean }
type Block = { text: string; marker: string | null; listId: number | null }
/** code: inside code, pre, kbd or samp, where an asterisk is always a literal character. */
type Style = { bold: boolean; italic: boolean; pre: boolean; code: boolean }

const CODE_TAGS = new Set(['CODE', 'PRE', 'KBD', 'SAMP', 'TT'])

const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'OBJECT'])
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN',
  'ASIDE', 'NAV', 'FIGURE', 'FIGCAPTION', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'PRE', 'HR', 'DL', 'DT', 'DD',
  'ADDRESS', 'DETAILS', 'SUMMARY', 'LI',
])

function fontWeightOf(el: Element): number | null {
  const raw = (el as HTMLElement).style?.fontWeight
  if (!raw) return null
  if (raw === 'bold' || raw === 'bolder') return 700
  if (raw === 'normal' || raw === 'lighter') return 400
  const n = Number.parseInt(raw, 10)
  return Number.isNaN(n) ? null : n
}

function isBoldElement(el: Element, inherited: boolean): boolean {
  const weight = fontWeightOf(el)
  if (weight !== null) return weight >= 600
  if (el.tagName === 'B' || el.tagName === 'STRONG') return true
  return inherited
}

function isItalicElement(el: Element, inherited: boolean): boolean {
  const style = (el as HTMLElement).style?.fontStyle
  if (style === 'italic' || style === 'oblique') return true
  if (style === 'normal') return false
  return inherited || el.tagName === 'I' || el.tagName === 'EM'
}

function wrapRun(core: string, marker: string): string {
  return core
    .split('\n')
    .map((line) => {
      const m = /^(\s*)(.*?)(\s*)$/s.exec(line)
      if (!m || !m[2]) return line
      return `${m[1]}${marker}${m[2]}${marker}${m[3]}`
    })
    .join('\n')
}

function serializeRuns(runs: Run[]): string {
  const merged: Run[] = []
  for (const run of runs) {
    const last = merged[merged.length - 1]
    if (last && last.bold === run.bold && last.italic === run.italic) last.text += run.text
    else merged.push({ ...run })
  }
  const raw = merged.map((r) => (r.bold ? wrapRun(r.text, '**') : r.italic ? wrapRun(r.text, '*') : r.text)).join('')
  return raw
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim()
}

class MarkdownWriter {
  blocks: Block[] = []
  private runs: Run[] = []
  private marker: string | null = null
  listId: number | null = null
  private listCount = 0

  text(text: string, style: Style) {
    this.runs.push({ text, bold: style.bold, italic: style.italic })
  }

  newline() {
    this.runs.push({ text: '\n', bold: false, italic: false })
  }

  flush() {
    const text = serializeRuns(this.runs)
    this.runs = []
    if (!text) return
    this.blocks.push({ text, marker: this.marker, listId: this.listId })
    this.marker = null
  }

  startItem(marker: string) {
    this.flush()
    this.marker = marker
  }

  endItem() {
    this.flush()
    this.marker = null
  }

  /** Runs `body` inside a list. Nested lists share the top-level list id, so they render as one flat list. */
  inList(body: () => void) {
    this.flush()
    const top = this.listId === null
    if (top) this.listId = ++this.listCount
    body()
    this.flush()
    if (top) this.listId = null
  }

  result(): string {
    let out = ''
    this.blocks.forEach((block, i) => {
      const prev = this.blocks[i - 1]
      if (prev) out += prev.listId !== null && prev.listId === block.listId ? '\n' : '\n\n'
      out += (block.marker ?? '') + block.text
    })
    return out.replace(/\n{3,}/g, '\n\n').trim()
  }
}

function walk(node: Node, w: MarkdownWriter, style: Style): void {
  if (node.nodeType === Node.TEXT_NODE) {
    // In code, "a*b*c" is literal: "\*" stops it from turning into italics.
    const value = style.code ? (node.nodeValue ?? '').replace(/\*/g, '\\*') : (node.nodeValue ?? '')
    w.text(style.pre ? value.replace(/ /g, ' ') : value.replace(/\s+/g, ' '), style)
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as Element
  const tag = el.tagName.toUpperCase()
  if (DROP_TAGS.has(tag)) return
  if (tag === 'BR') {
    w.newline()
    return
  }
  if (tag === 'IMG') {
    const alt = el.getAttribute('alt')
    if (alt) w.text(alt, style)
    return
  }
  const childStyle: Style = {
    bold: isBoldElement(el, style.bold),
    italic: isItalicElement(el, style.italic),
    pre: style.pre || tag === 'PRE',
    code: style.code || CODE_TAGS.has(tag),
  }
  const children = () => el.childNodes.forEach((child) => walk(child, w, childStyle))

  if (tag === 'UL' || tag === 'OL') {
    w.inList(() => {
      let n = Number.parseInt(el.getAttribute('start') ?? '1', 10) - 1
      if (Number.isNaN(n)) n = 0
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toUpperCase() === 'LI') {
          n += 1
          w.startItem(tag === 'OL' ? `${n}. ` : '- ')
          child.childNodes.forEach((c) => walk(c, w, childStyle))
          w.endItem()
        } else {
          walk(child, w, childStyle)
        }
      })
    })
    return
  }
  if (tag === 'TD' || tag === 'TH') {
    children()
    w.text(' ', style)
    return
  }
  if (BLOCK_TAGS.has(tag)) {
    w.flush()
    children()
    w.flush()
    return
  }
  children()
}

export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const writer = new MarkdownWriter()
  walk(doc.body, writer, { bold: false, italic: false, pre: false, code: false })
  writer.flush()
  return writer.result()
}

/* ------------------------------------------------------------------ */
/* Sentence cleaning and normalization                                 */
/* ------------------------------------------------------------------ */

const QUOTE_PAIRS: readonly [string, string][] = [
  ['"', '"'],
  ['“', '”'],
  ["'", "'"],
  ['‘', '’'],
  ['«', '»'],
]

/** Removes ONE pair of matching quotes that wraps the whole text. Apostrophes inside words ("don’t") do not count as quotes. */
export function stripWrappingQuotes(s: string): string {
  const t = s.trim()
  for (const [open, close] of QUOTE_PAIRS) {
    if (t.length < 2 || !t.startsWith(open) || !t.endsWith(close)) continue
    const inner = t.slice(open.length, t.length - close.length)
    const withoutApostrophes = inner.replace(/(?<=[\p{L}\p{N}])['’](?=\p{L})/gu, '')
    if (withoutApostrophes.includes(open) || withoutApostrophes.includes(close)) return s
    return inner.trim()
  }
  return s
}

export function cleanSentence(s: string): string {
  return stripWrappingQuotes(s.trim())
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim()
}

export function plainText(md: string): string {
  return flattenMarkdown(md).text
}

export function normalizeText(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/'/g, (_match, offset: number, whole: string) => {
      const prev = whole[offset - 1] ?? ''
      const next = whole[offset + 1] ?? ''
      const inWord = /[\p{L}\p{N}]/u.test(prev) && /\p{L}/u.test(next)
      const pluralPossessive = prev === 's' && !/[\p{L}\p{N}]/u.test(next)
      return inWord || pluralPossessive ? "'" : ' '
    })
    .replace(/[^\p{L}\p{N}'+\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeTag(s: string): string {
  return s.trim().replace(/^#+/, '').trim().toLowerCase().replace(/\s+/g, '-')
}

/* ------------------------------------------------------------------ */
/* Smart paste: split a labelled ChatGPT correction into fields        */
/* ------------------------------------------------------------------ */

export interface SmartPasteResult {
  original_text?: string
  upgraded_text?: string
  explanation?: string
  example_sentence?: string
  reusable_pattern?: string
  fieldCount: number
}

type PasteField = 'original_text' | 'upgraded_text' | 'explanation' | 'example_sentence' | 'reusable_pattern'

const EMOJI_LABELS: Readonly<Record<string, PasteField>> = {
  '❌': 'original_text',
  '✗': 'original_text',
  '✘': 'original_text',
  '✅': 'upgraded_text',
  '✓': 'upgraded_text',
  '✔': 'upgraded_text',
  '💡': 'explanation',
}

const WORD_LABELS: Readonly<Record<PasteField, readonly string[]>> = {
  original_text: ['wrong', 'incorrect', 'original', 'mistake', 'you said', 'what you said', 'what i said', 'my sentence', 'before', 'your sentence'],
  upgraded_text: [
    'better', 'better version', 'corrected', 'correction', 'correct', 'native', 'native upgrade', 'more natural', 'natural',
    'improved', 'upgrade', 'band 7+', 'band 7+ upgrade', 'revised', 'after', 'suggested',
  ],
  explanation: ['why', 'explanation', 'reason', 'note'],
  example_sentence: ['example', 'in context', 'context', 'e.g.', 'model sentence'],
  reusable_pattern: ['pattern', 'structure', 'template', 'formula', 'reusable pattern'],
}

const SENTENCE_FIELDS: ReadonlySet<PasteField> = new Set(['original_text', 'upgraded_text', 'example_sentence', 'reusable_pattern'])

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const WORD_LABEL_LIST = (Object.entries(WORD_LABELS) as [PasteField, readonly string[]][])
  .flatMap(([field, labels]) => labels.map((label) => ({ field, label })))
  .sort((a, b) => b.label.length - a.label.length)

// Optional bullet or heading marks, optional "**", the label, optional "**", then a separator.
const LEAD = String.raw`^\s*(?:[-*•]\s+|#{1,6}\s+)?(?:\*\*)?\s*`
const EMOJI_RE = new RegExp(`${LEAD}(${Object.keys(EMOJI_LABELS).map(escapeRe).join('|')})\\uFE0F?(?:\\*\\*)?(?:\\s*[:\\-–—]\\s*|\\s+|$)`, 'u')
// A colon may touch the next word; a dash needs a space after it, so "Better-known" is not a label.
const WORD_RE = new RegExp(
  `${LEAD}(${WORD_LABEL_LIST.map((l) => escapeRe(l.label)).join('|')})(?:\\*\\*)?\\s*(?::(?:\\s*\\*\\*)?\\s*|[\\-–—](?:\\s*\\*\\*)?\\s+|$)`,
  'iu',
)
// "e.g." needs no separator: "e.g. The scenery…"
const EG_RE = new RegExp(`${LEAD}(e\\.g\\.)(?:\\*\\*)?\\s+`, 'iu')

function matchWordLabel(line: string): { field: PasteField; rest: string } | null {
  const m = WORD_RE.exec(line) ?? EG_RE.exec(line)
  if (!m) return null
  const label = m[1].toLowerCase()
  const found = WORD_LABEL_LIST.find((l) => l.label === label)
  return found ? { field: found.field, rest: line.slice(m[0].length) } : null
}

function countBold(s: string): number {
  return s.match(/\*\*/g)?.length ?? 0
}

/**
 * The label regexes may take a "**" right after the separator. That "**" closes a bold label
 * ("**Better:** …") only when the label opened one. Otherwise it opens bold text in the value
 * ("Better: **The scenery** was …"), so it goes back to the value.
 */
function giveBackBold(line: string, rest: string): string {
  const prefix = line.slice(0, line.length - rest.length)
  if (countBold(prefix) % 2 === 0) return rest
  const m = /\*\*\s*$/.exec(prefix)
  return m ? `**${rest}` : rest
}

/** Reads a label at the start of a line. A word label after an emoji wins ("✅ Better: …"). */
function matchLabel(line: string): { field: PasteField; rest: string } | null {
  const emoji = EMOJI_RE.exec(line)
  let found: { field: PasteField; rest: string } | null
  if (emoji) {
    const rest = line.slice(emoji[0].length)
    found = matchWordLabel(rest) ?? { field: EMOJI_LABELS[emoji[1]], rest }
  } else {
    found = matchWordLabel(line)
  }
  return found ? { field: found.field, rest: giveBackBold(line, found.rest) } : null
}

/**
 * Bold around the whole value ("**The scenery was beautiful.**") is emphasis, not content: it is removed.
 * A lone "**" left over from a bold label is dropped.
 */
function tidyBold(value: string): string {
  let v = value.trim()
  if (countBold(v) % 2 === 1) {
    if (v.endsWith('**')) v = v.slice(0, -2).trimEnd()
    else if (v.startsWith('**')) v = v.slice(2).trimStart()
  }
  if (countBold(v) === 2 && v.startsWith('**') && v.endsWith('**') && v.length > 4) v = v.slice(2, -2).trim()
  return v
}

function cleanValue(field: PasteField, lines: string[]): string {
  const value = tidyBold(lines.join('\n'))
  return SENTENCE_FIELDS.has(field) ? tidyBold(cleanSentence(value)) : value
}

/**
 * Text after a label, up to the next label, is the value. Sentence fields end at a blank line,
 * so a closing remark after the correction is not glued onto it. The first value of a field wins,
 * except the explanation, which collects every "Why:" / "Note:" part.
 */
export function parseSmartPaste(text: string): SmartPasteResult | null {
  const found: Partial<Record<PasteField, string>> = {}
  let field: PasteField | null = null
  let lines: string[] = []
  const commit = () => {
    if (!field) return
    const value = cleanValue(field, lines)
    if (!value) return
    const existing = found[field]
    if (!existing) found[field] = value
    else if (field === 'explanation') found[field] = `${existing}\n${value}`
  }
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const label = matchLabel(line)
    if (label) {
      commit()
      field = label.field
      lines = label.rest.trim() ? [label.rest] : []
    } else if (field && !line.trim() && SENTENCE_FIELDS.has(field) && lines.some((l) => l.trim())) {
      commit()
      field = null
    } else if (field) {
      lines.push(line)
    }
  }
  commit()
  const fieldCount = Object.keys(found).length
  if (!found.upgraded_text || fieldCount < 2) return null
  return { ...found, fieldCount }
}

/* ------------------------------------------------------------------ */
/* Sentence around a selection                                          */
/* ------------------------------------------------------------------ */

// A sentence ends after . ! ? or … (plus closing quotes or brackets) followed by whitespace, or at a line break.
const SENTENCE_END_RE = /[.!?…]+["'”’)\]]*(?=\s)|\n+/g

// A full stop after these never ends a sentence.
const ABBREVIATIONS = new Set(['e.g.', 'i.e.', 'eg.', 'ie.', 'approx.', 'vs.', 'cf.', 'mr.', 'mrs.', 'ms.', 'dr.', 'prof.'])

/** False for a full stop after an abbreviation ("e.g."), or when the next word starts with a lowercase letter. */
function endsSentence(text: string, m: RegExpExecArray): boolean {
  if (m[0].startsWith('\n')) return true
  const next = /^\s*(\S)/.exec(text.slice(m.index + m[0].length))?.[1]
  if (next && /\p{Ll}/u.test(next)) return false
  if (m[0] !== '.') return true
  const word = /(\S+)$/.exec(text.slice(0, m.index + 1))?.[1] ?? ''
  return !ABBREVIATIONS.has(word.replace(/^[(["'“‘]+/, '').toLowerCase())
}

export function extractSentence(text: string, start: number, end: number): string {
  const bounds: [number, number][] = []
  let from = 0
  for (const m of text.matchAll(SENTENCE_END_RE)) {
    if (!endsSentence(text, m)) continue
    const stop = m[0].startsWith('\n') ? m.index : m.index + m[0].length
    bounds.push([from, stop])
    from = m.index + m[0].length
  }
  bounds.push([from, text.length])
  const lo = Math.max(0, Math.min(start, end))
  const hi = Math.max(lo + 1, Math.max(start, end))
  const touched = bounds.filter(([s, e]) => s < hi && e > lo && text.slice(s, e).trim())
  if (touched.length === 0) return text.trim()
  return text.slice(touched[0][0], touched[touched.length - 1][1]).trim()
}
