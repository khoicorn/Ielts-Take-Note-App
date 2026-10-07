import type React from 'react'
import { Markdown } from '@/lib/markdown'
import { cn } from '@/components/ui/cn'

const OPENERS = /^["“‘'«]/
const CLOSERS = /["”’'»]$/

/** Typographic quotes around a sentence. Skips them when the text already carries its own. */
export function Quote(props: { text: string; className?: string; inline?: boolean; highlight?: string }): React.JSX.Element {
  const { className, inline = true, highlight } = props
  const text = props.text.trim()
  const quoted = OPENERS.test(text) && CLOSERS.test(text)
  const body = (
    <>
      {quoted ? null : <span aria-hidden="true">“</span>}
      <Markdown text={text} inline highlight={highlight} />
      {quoted ? null : <span aria-hidden="true">”</span>}
    </>
  )
  return inline ? <span className={className}>{body}</span> : <span className={cn('block', className)}>{body}</span>
}
