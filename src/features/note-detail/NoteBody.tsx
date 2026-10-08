import { ArrowRight, FileText } from 'lucide-react'
import type React from 'react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { ModeMark } from '@/components/notes/ModeMark'
import { NOTE_LABEL, NotePair } from '@/components/notes/NotePair'
import { Quote } from '@/components/notes/Quote'
import { cn, WRAP } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'
import { Ornament } from '@/components/ui/Ornament'
import { useParagraph } from '@/lib/hooks'
import { Markdown } from '@/lib/markdown'
import { FIELD_LABELS, MODE_LABELS, taskTypeLabel } from '@/lib/taxonomy'
import type { Note } from '@/lib/types'

/** "Speaking · Travel" or "Writing · Academic Task 1 · Increase" (brief §18 item 1). */
export function eyebrowParts(note: Note): string[] {
  const parts = [MODE_LABELS[note.mode]]
  if (note.mode === 'writing') {
    const task = taskTypeLabel(note.task_type)
    if (task) parts.push(task)
  }
  if (note.topic.trim()) parts.push(note.topic.trim())
  return parts
}

export function NoteEyebrow(props: { note: Note; className?: string }): React.JSX.Element {
  return (
    <p data-testid="note-eyebrow" className={cn('font-serif text-note text-graphite italic', WRAP, props.className)}>
      {/* The mode word follows in text, so the glyph is decoration here. */}
      <span aria-hidden="true" className="mr-2.5 inline-flex -translate-y-px align-middle">
        <ModeMark mode={props.note.mode} showLabel={false} />
      </span>
      {eyebrowParts(props.note).map((part, i) => (
        <Fragment key={i}>
          {/* The serif's word space is narrow; a little padding keeps "Writing · Task 1" from running together. */}
          {i > 0 ? <span className="px-1">{' · '}</span> : null}
          {part}
        </Fragment>
      ))}
    </p>
  )
}

/** One labeled block of the main column (Why, In context, Reusable pattern…). */
function Block(props: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className={NOTE_LABEL}>{props.label}</h2>
      <div className={cn('mt-2 max-w-[66ch] text-body-lg text-ink', WRAP)}>{props.children}</div>
    </section>
  )
}

/** Link back to the model paragraph this note was made from. Hidden when the paragraph is gone. */
function SourceParagraph(props: { paragraphId: string; from: string }): React.JSX.Element | null {
  const paragraph = useParagraph(props.paragraphId)
  if (!paragraph) return null
  return (
    <div className="mt-11 border-y border-line">
      <Link
        to={`/writing/paragraphs/${paragraph.id}`}
        state={{ from: props.from }}
        className={cn(
          'group -mx-3 flex min-h-11 items-center gap-3 rounded-sm px-3 py-3 transition-colors duration-150 hover:bg-stone/60',
          'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo',
        )}
      >
        <FileText className="size-[1.125rem] shrink-0 text-graphite" strokeWidth={ICON_STROKE} aria-hidden="true" />
        <span className="shrink-0 text-small text-graphite">From paragraph</span>
        <span className="min-w-0 flex-1 truncate font-serif text-note text-ink">{paragraph.title.trim() || 'Untitled paragraph'}</span>
        <ArrowRight
          className="size-4 shrink-0 text-graphite transition-transform duration-150 group-hover:translate-x-0.5"
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
        />
      </Link>
    </div>
  )
}

/**
 * The reading view of the main column, in brief §18 order: topic, mistake, upgrade, then Why,
 * context, pattern and the model paragraph. Empty sections are left out.
 */
export function NoteBody(props: { note: Note; from: string }): React.JSX.Element {
  const { note, from } = props
  const labels = FIELD_LABELS[note.mode]
  const explanation = note.explanation.trim()
  const example = note.example_sentence.trim()
  const pattern = note.reusable_pattern.trim()
  const paragraph = note.model_paragraph.trim()
  const hasMore = Boolean(explanation || example || pattern || paragraph)

  return (
    <div className="min-w-0">
      <NoteEyebrow note={note} className="mb-9" />
      <NotePair note={note} size="detail" />

      {hasMore ? (
        <>
          <Ornament variant="constellation" className="my-11" />
          <div>
            {explanation ? (
              <Block label={labels.explanation}>
                <Markdown text={explanation} />
              </Block>
            ) : null}
            {example ? (
              <Block label={labels.example}>
                <p className="-indent-[0.36em]">
                  <Quote text={example} />
                </p>
              </Block>
            ) : null}
            {pattern ? (
              <Block label={labels.pattern}>
                <Markdown text={pattern} />
              </Block>
            ) : null}
            {paragraph ? (
              <Block label="Model paragraph">
                <Markdown text={paragraph} className="font-serif text-note" />
              </Block>
            ) : null}
          </div>
        </>
      ) : null}

      {note.source_paragraph_id ? <SourceParagraph paragraphId={note.source_paragraph_id} from={from} /> : null}
    </div>
  )
}
