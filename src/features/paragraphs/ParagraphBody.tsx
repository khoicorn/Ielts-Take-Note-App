import type React from 'react'
import { forwardRef, Fragment } from 'react'
import { useNavigate, useHref } from 'react-router'
import { cn, WRAP } from '@/components/ui/cn'
import type { BodyLayout, Leaf, SavedMark } from './paragraphText'
import { savedTitle } from './paragraphText'

/** Serif reading text (mockup 09: Instrument Serif runs small, so 23px reads like a 19px book serif). */
export const PROSE = 'font-serif text-[1.4375rem] leading-[1.7] text-ink max-sm:text-[1.3125rem]'

/** A phrase already saved as a note: a dotted antique-gold underline. Opens the note. */
const SAVED =
  'cursor-pointer rounded-xs underline decoration-gold decoration-dotted decoration-2 underline-offset-[6px] [text-decoration-skip-ink:none] transition-colors duration-150 hover:bg-gold/15'

function hasSelection(): boolean {
  return typeof document.getSelection === 'function' && document.getSelection()?.isCollapsed === false
}

/**
 * A saved phrase: click opens the note, unless the click ends a text selection.
 * Not an <a> and not focusable on purpose: Chrome never starts a text selection from a drag that begins
 * inside a link or on an element with tabindex, so the phrase could not be part of a selection.
 * Keyboard and screen reader users reach the same notes through "Notes from this paragraph" below.
 */
function SavedPhrase(props: { start: number; text: string; mark: SavedMark; linkState: unknown }): React.JSX.Element {
  const { start, text, mark, linkState } = props
  const navigate = useNavigate()
  const href = `/notes/${mark.note.id}`
  // Includes the router basename, so a new tab opens the right page on GitHub Pages too.
  const tabHref = useHref(href)
  return (
    <span
      title={savedTitle(mark.note)}
      data-o={start}
      data-note-id={mark.note.id}
      onClick={(e) => {
        if (hasSelection()) return
        if (e.ctrlKey || e.metaKey) {
          window.open(tabHref, '_blank', 'noopener')
          return
        }
        navigate(href, { state: linkState })
      }}
      className={SAVED}
    >
      {text}
    </span>
  )
}

interface Piece {
  start: number
  text: string
  mark?: SavedMark
}

/** Splits one run at its line breaks and at saved-phrase edges. Each piece keeps its plain-text offset. */
function pieces(leaf: Leaf, marks: SavedMark[]): (Piece | 'br')[] {
  const out: (Piece | 'br')[] = []
  let at = leaf.start
  leaf.text.split('\n').forEach((line, i) => {
    if (i > 0) {
      out.push('br')
      at += 1
    }
    const end = at + line.length
    let cursor = at
    for (const m of marks) {
      if (m.end <= cursor || m.start >= end) continue
      const s = Math.max(m.start, cursor)
      const e = Math.min(m.end, end)
      if (s > cursor) out.push({ start: cursor, text: line.slice(cursor - at, s - at) })
      out.push({ start: s, text: line.slice(s - at, e - at), mark: m })
      cursor = e
    }
    if (cursor < end) out.push({ start: cursor, text: line.slice(cursor - at) })
    at = end
  })
  return out
}

function renderLeaf(leaf: Leaf, marks: SavedMark[], linkState: unknown): React.ReactNode {
  const nodes = pieces(leaf, marks).map((p, i) => {
    if (p === 'br') return <br key={`br-${leaf.start}-${i}`} />
    if (!p.text) return null
    if (p.mark) return <SavedPhrase key={p.start} start={p.start} text={p.text} mark={p.mark} linkState={linkState} />
    return (
      <span key={p.start} data-o={p.start}>
        {p.text}
      </span>
    )
  })
  if (leaf.type === 'bold') return <strong key={`b-${leaf.start}`}>{nodes}</strong>
  if (leaf.type === 'italic') return <em key={`i-${leaf.start}`}>{nodes}</em>
  return <Fragment key={`t-${leaf.start}`}>{nodes}</Fragment>
}

/**
 * The paragraph body, rendered from its Markdown subset. Every text run is a leaf with `data-o`
 * (its offset in the plain text), so a DOM selection maps back to the text exactly.
 * Focusable, so keyboard users can pick words with the arrow keys (useBodySelection).
 */
export const ParagraphBody = forwardRef<
  HTMLDivElement,
  {
    layout: BodyLayout
    marks: SavedMark[]
    linkState?: unknown
    describedBy?: string
    /** False for a read-only preview (Must Remember): not focusable, no region. Default true. */
    interactive?: boolean
    /** Replaces the reading size (PROSE), e.g. for a smaller preview. */
    proseClassName?: string
    className?: string
  } & Pick<React.HTMLAttributes<HTMLDivElement>, 'onKeyDown' | 'onPointerDown' | 'onFocus' | 'onBlur'>
>(function ParagraphBody(props, ref) {
  const { layout, marks, linkState, describedBy, className, interactive = true, proseClassName, ...handlers } = props
  return (
    <div
      ref={ref}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'region' : undefined}
      aria-label={interactive ? 'Paragraph text' : undefined}
      aria-describedby={describedBy}
      data-testid="paragraph-body"
      className={cn(proseClassName ?? PROSE, WRAP, 'rounded-sm focus-visible:outline-offset-[6px]', className)}
      {...handlers}
    >
      {layout.blocks.map((block, b) => {
        const gap = b > 0 ? 'mt-[0.8em]' : undefined
        const key = `${block.type}-${block.lines[0]?.[0]?.start ?? b}-${b}`
        if (block.type === 'p') {
          return (
            <p key={key} className={gap}>
              {block.lines[0]?.map((leaf) => renderLeaf(leaf, marks, linkState))}
            </p>
          )
        }
        const items = block.lines.map((line, l) => (
          <li key={`${key}-${l}`}>{line.map((leaf) => renderLeaf(leaf, marks, linkState))}</li>
        ))
        const listClass = cn('pl-7 marker:text-graphite', block.type === 'ul' ? 'list-disc' : 'list-decimal', gap)
        return block.type === 'ul' ? (
          <ul key={key} className={listClass}>
            {items}
          </ul>
        ) : (
          <ol key={key} className={listClass}>
            {items}
          </ol>
        )
      })}
    </div>
  )
})
