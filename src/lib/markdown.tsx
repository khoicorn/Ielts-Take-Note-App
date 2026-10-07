/**
 * Renders the note Markdown subset as React elements. Never uses dangerouslySetInnerHTML.
 */
import type { ReactNode } from 'react'
import { parseInline, parseMarkdown } from './mdparse'
import type { MdBlock, MdInline } from './mdparse'
import { matchRanges } from './search'

export { parseInline, parseMarkdown } from './mdparse'
export type { MdBlock, MdInline } from './mdparse'

const MARK_CLASS = 'bg-gold/25 text-current rounded-xs'
const SLOT_CLASS = 'inline-block min-w-12 border-b border-current align-baseline'
const BLOCK_GAP = 'mt-[0.6em]'

function highlightLine(line: string, query: string | undefined, key: string): ReactNode[] {
  const ranges = query ? matchRanges(line, query) : []
  if (ranges.length === 0) return line ? [line] : []
  const out: ReactNode[] = []
  let at = 0
  ranges.forEach(([start, end], i) => {
    if (start > at) out.push(line.slice(at, start))
    out.push(
      <mark key={`${key}-m${i}`} className={MARK_CLASS}>
        {line.slice(start, end)}
      </mark>,
    )
    at = end
  })
  if (at < line.length) out.push(line.slice(at))
  return out
}

/** Text with newlines turned into <br> and query matches wrapped in <mark>. */
function renderText(text: string, query: string | undefined, key: string): ReactNode[] {
  return text.split('\n').flatMap((line, i) => [
    ...(i > 0 ? [<br key={`${key}-br${i}`} />] : []),
    ...highlightLine(line, query, `${key}-l${i}`),
  ])
}

function renderInline(nodes: MdInline[], query: string | undefined, key: string): ReactNode[] {
  return nodes.flatMap((node, i): ReactNode[] => {
    const k = `${key}-${i}`
    switch (node.type) {
      case 'bold':
        return [<strong key={k}>{renderText(node.text, query, k)}</strong>]
      case 'italic':
        return [<em key={k}>{renderText(node.text, query, k)}</em>]
      case 'slot':
        return [<span key={k} role="img" aria-label="blank" className={SLOT_CLASS} />]
      case 'text':
        return renderText(node.text, query, k)
    }
  })
}

function renderBlock(block: MdBlock, index: number, query: string | undefined): ReactNode {
  const gap = index > 0 ? BLOCK_GAP : undefined
  const key = `b${index}`
  if (block.type === 'p') {
    return (
      <p key={key} className={gap}>
        {renderInline(block.inline, query, key)}
      </p>
    )
  }
  const items = block.items.map((item, i) => <li key={`${key}-i${i}`}>{renderInline(item, query, `${key}-i${i}`)}</li>)
  const listClass = ['pl-5 marker:text-graphite', block.type === 'ul' ? 'list-disc' : 'list-decimal', gap].filter(Boolean).join(' ')
  return block.type === 'ul' ? (
    <ul key={key} className={listClass}>
      {items}
    </ul>
  ) : (
    <ol key={key} className={listClass}>
      {items}
    </ol>
  )
}

export function Markdown(props: { text: string; inline?: boolean; className?: string; highlight?: string }): React.JSX.Element {
  const { text, inline, className, highlight } = props
  const query = highlight?.trim() ? highlight : undefined
  if (inline) return <span className={className}>{renderInline(parseInline(text ?? ''), query, 'i')}</span>
  return <div className={className}>{parseMarkdown(text ?? '').map((block, i) => renderBlock(block, i, query))}</div>
}
