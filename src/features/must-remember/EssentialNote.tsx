import React from 'react'
import { Link } from 'react-router'
import { Markdown } from '@/lib/markdown'
import { isDue } from '@/lib/srs'
import { FIELD_LABELS, noteTypeLabel, taskTypeLabel } from '@/lib/taxonomy'
import type { Note } from '@/lib/types'
import { ModeMark } from '@/components/notes/ModeMark'
import { NOTE_LABEL } from '@/components/notes/NotePair'
import { Quote } from '@/components/notes/Quote'
import { cn, WRAP } from '@/components/ui/cn'
import { MasteryMark } from '@/components/ui/MasteryMark'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { nextReviewLine } from '@/features/all-notes/notebook'

/**
 * Wraps the ribbon toggle. Every item on this page carries the ribbon, so at 1024px and wider it hangs in the
 * left margin and shows on hover or keyboard focus (mockup 17). On touch screens and narrower layouts it stays visible.
 */
export const RIBBON_SLOT = cn(
  'inline-flex shrink-0',
  'lg:absolute lg:-left-12 lg:transition-opacity lg:duration-150',
  'lg:[@media(hover:hover)]:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100',
)

/** "Speaking · Travel · Nha Trang trip" or "Writing · Academic Task 1 · Stability · Collocation". */
function MetaLine(props: { note: Note }): React.JSX.Element {
  const { note } = props
  const parts = [
    note.mode === 'writing' ? taskTypeLabel(note.task_type) : '',
    note.topic.trim(),
    note.subtopic.trim(),
    note.note_type !== 'correction' ? noteTypeLabel(note.note_type) : '',
  ].filter(Boolean)
  return (
    <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-graphite">
      <ModeMark mode={note.mode} />
      {parts.map((p, i) => (
        <React.Fragment key={`${i}-${p}`}>
          <span aria-hidden="true">·</span>
          <span className={WRAP}>{p}</span>
        </React.Fragment>
      ))}
    </p>
  )
}

/** A labeled block under the upgrade: context sentence or reusable pattern. Key words and slots return to ink. */
function Block(props: { label: string; text: string }): React.JSX.Element {
  return (
    <div className="mt-4">
      <p className={cn(NOTE_LABEL, 'mb-1')}>{props.label}</p>
      <Markdown
        text={props.text}
        className={cn(
          'text-body text-graphite [&_strong]:font-medium [&_strong]:text-ink [&_[role=img]]:text-ink [&>*+*]:mt-2',
          WRAP,
        )}
      />
    </div>
  )
}

/**
 * One Must Remember note in the reading layout (mockup 17): meta line, the mistake (crimson, smaller),
 * the upgrade (deep sage, larger, links to the note), then the context sentence and pattern.
 * Mastery and the next review sit in a quiet column on the right.
 */
export function EssentialNote(props: { note: Note; now: Date; linkState: unknown; ribbon: React.ReactNode }): React.JSX.Element {
  const { note, now, linkState, ribbon } = props
  const labels = FIELD_LABELS[note.mode]
  const original = note.original_text.trim()
  const example = note.example_sentence.trim()
  const pattern = note.reusable_pattern.trim()
  const due = isDue(note, now)
  return (
    <article className="group relative grid grid-cols-1 gap-x-8 border-b border-line py-8 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
      <div className="min-w-0">
        <MetaLine note={note} />
        {original ? (
          <p className={cn('text-body text-crimson', WRAP)}>
            <span className={cn(NOTE_LABEL, 'mr-2.5 align-[0.08em]')}>{labels.original}</span>
            <Quote text={original} />
          </p>
        ) : null}
        <p className={cn('text-section text-upgrade -indent-[0.36em]', original && 'mt-1.5', WRAP)}>
          <Link
            to={`/notes/${note.id}`}
            state={linkState}
            className="rounded-xs decoration-1 underline-offset-[5px] hover:underline focus-visible:outline-offset-4"
          >
            <VisuallyHidden>{`${labels.upgraded}: `}</VisuallyHidden>
            <Quote text={note.upgraded_text} />
          </Link>
        </p>
        {example ? <Block label={labels.example} text={example} /> : null}
        {pattern ? <Block label={labels.pattern} text={pattern} /> : null}
      </div>
      <div className="mt-4 flex items-center gap-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-1.5 sm:text-right lg:pt-[2.125rem]">
        <span className={cn(RIBBON_SLOT, 'order-last ml-auto sm:order-first sm:ml-0 lg:top-[1.625rem]')}>{ribbon}</span>
        <MasteryMark status={note.mastery_status} />
        <span className={cn('text-meta', due ? 'text-indigo' : 'text-graphite')}>{nextReviewLine(note, now)}</span>
      </div>
    </article>
  )
}
