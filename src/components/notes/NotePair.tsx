import type React from 'react'
import { Markdown } from '@/lib/markdown'
import { FIELD_LABELS } from '@/lib/taxonomy'
import type { Note } from '@/lib/types'
import { cn, WRAP } from '@/components/ui/cn'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { Quote } from './Quote'

/** Small uppercase field label used above or before note text ("WHAT I SAID"). */
export const NOTE_LABEL = 'text-meta font-medium uppercase tracking-[0.08em] text-graphite'

/** Hangs the opening quote mark into the left margin so wrapped lines align with the label. */
const HANG = '-indent-[0.36em]'

/** Collapses line breaks so a compact row stays on one line. */
function oneLine(s: string): string {
  return s.replace(/\s*\n+\s*/g, ' ')
}

/**
 * The mistake and its upgrade (brief §18). The mistake is crimson, smaller and labeled; the upgrade is
 * larger and stands out more. With no original, only the upgrade shows. All text wraps (long URLs too).
 *
 * compact: one line each, truncated. reading: full text plus the example in graphite. detail: large, labeled.
 */
export function NotePair(props: {
  note: Note
  size?: 'compact' | 'reading' | 'detail'
  showLabels?: boolean
  highlight?: string
  className?: string
}): React.JSX.Element {
  const { note, size = 'reading', highlight, className } = props
  const labels = FIELD_LABELS[note.mode]
  const original = (note.original_text ?? '').trim()
  const upgraded = (note.upgraded_text ?? '').trim()
  const example = (note.example_sentence ?? '').trim()
  const showLabels = props.showLabels ?? size !== 'compact'

  if (size === 'compact') {
    return (
      <div className={cn('min-w-0', className)}>
        {original ? (
          <p data-testid="note-original" className={cn('truncate text-small text-crimson', WRAP)}>
            {showLabels ? <span className={cn(NOTE_LABEL, 'mr-2')}>{labels.original}</span> : <VisuallyHidden>{`${labels.original}: `}</VisuallyHidden>}
            <Markdown text={oneLine(original)} inline highlight={highlight} />
          </p>
        ) : null}
        <p data-testid="note-upgraded" className={cn('truncate text-body text-ink', original && 'mt-0.5', WRAP)}>
          <VisuallyHidden>{`${labels.upgraded}: `}</VisuallyHidden>
          <Markdown text={oneLine(upgraded)} inline highlight={highlight} />
        </p>
      </div>
    )
  }

  if (size === 'reading') {
    return (
      <div className={cn('min-w-0', className)}>
        {original ? (
          <p data-testid="note-original" className={cn('text-body text-crimson', WRAP)}>
            {showLabels ? (
              <span className={cn(NOTE_LABEL, 'mr-2.5 align-[0.08em]')}>{labels.original}</span>
            ) : (
              <VisuallyHidden>{`${labels.original}: `}</VisuallyHidden>
            )}
            <Quote text={original} highlight={highlight} />
          </p>
        ) : null}
        <p data-testid="note-upgraded" className={cn('text-note text-upgrade', HANG, original && 'mt-1', WRAP)}>
          <VisuallyHidden>{`${labels.upgraded}: `}</VisuallyHidden>
          <Quote text={upgraded} highlight={highlight} />
        </p>
        {example ? (
          <p data-testid="note-example" className={cn('mt-1.5 text-small text-graphite', WRAP)}>
            <VisuallyHidden>{`${labels.example}: `}</VisuallyHidden>
            <Markdown text={example} inline highlight={highlight} />
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      {original ? (
        <div className="mb-7">
          {showLabels ? <p className={cn(NOTE_LABEL, 'mb-2')}>{labels.original}</p> : null}
          <p data-testid="note-original" className={cn('text-body-lg text-crimson', HANG, WRAP)}>
            {showLabels ? null : <VisuallyHidden>{`${labels.original}: `}</VisuallyHidden>}
            <Quote text={original} highlight={highlight} />
          </p>
        </div>
      ) : null}
      <div>
        {showLabels ? <p className={cn(NOTE_LABEL, 'mb-2')}>{labels.upgraded}</p> : null}
        <p data-testid="note-upgraded" className={cn('text-section text-upgrade', HANG, WRAP)}>
          {showLabels ? null : <VisuallyHidden>{`${labels.upgraded}: `}</VisuallyHidden>}
          <Quote text={upgraded} highlight={highlight} />
        </p>
      </div>
    </div>
  )
}
