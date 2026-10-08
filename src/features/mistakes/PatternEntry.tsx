import { ChevronDown } from 'lucide-react'
import type React from 'react'
import { useId, useState } from 'react'
import { NOTE_LABEL } from '@/components/notes/NotePair'
import { NoteRow } from '@/components/notes/NoteRow'
import { cn, WRAP } from '@/components/ui/cn'
import { ICON_STROKE, SparkIcon } from '@/components/ui/icons'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { formatRelativeDay } from '@/lib/dates'
import { Markdown } from '@/lib/markdown'
import type { LedgerPattern } from '@/lib/mistakes'
import { FREQUENT_AT, patternWhy, plural } from './ledgerView'

/**
 * One repeated habit (brief §28): the habit in crimson, "Use instead" and the fix in deep sage,
 * a short why, a toggle for the related notes, and a quiet tally column ("Seen 4 times").
 */
export function PatternEntry(props: { pattern: LedgerPattern; now: Date; linkFrom: string }): React.JSX.Element {
  const { pattern, now, linkFrom } = props
  const [open, setOpen] = useState(false)
  const listId = useId()
  const why = patternWhy(pattern)
  const noteCount = pattern.notes.length
  const frequent = pattern.seen >= FREQUENT_AT
  const seenText = `Seen ${plural(pattern.seen, 'time')} in ${plural(noteCount, 'note')}.`
  const ids = pattern.notes.map((n) => n.id)

  return (
    <article className="grid grid-cols-1 gap-x-6 border-b border-line py-6 sm:grid-cols-[minmax(0,1fr)_88px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className={cn('text-body-lg text-crimson', WRAP)}>
            <VisuallyHidden>Habit: </VisuallyHidden>
            {pattern.error_pattern}
          </p>
          {frequent ? (
            <span className="inline-flex items-center gap-1.5 text-meta text-ink">
              <SparkIcon aria-hidden="true" className="size-2.5 fill-current stroke-none text-brass" />
              Frequent
            </span>
          ) : null}
        </div>
        <VisuallyHidden>{seenText}</VisuallyHidden>
        {pattern.fix_pattern ? (
          <>
            <p className={cn(NOTE_LABEL, 'mt-3')}>Use instead</p>
            <p className={cn('mt-0.5 text-section text-upgrade', WRAP)}>{pattern.fix_pattern}</p>
          </>
        ) : null}
        {why ? (
          <p className={cn('mt-2 line-clamp-2 max-w-[60ch] text-small text-graphite', WRAP)}>
            <Markdown text={why} inline />
          </p>
        ) : null}
        <p aria-hidden="true" className="mt-2 text-small text-graphite sm:hidden">
          Seen {plural(pattern.seen, 'time')} · in {plural(noteCount, 'note')}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-graphite">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            onClick={() => setOpen((o) => !o)}
            className="-ml-1.5 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xs px-1.5 text-indigo transition-colors duration-150 hover:bg-stone/60 max-sm:min-h-11"
          >
            Related notes
            <span className="text-graphite tabular-nums">{noteCount}</span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className={cn('size-3.5 transition-transform duration-180', open && 'rotate-180')}
            />
          </button>
          <span>Last seen {formatRelativeDay(pattern.last_seen_at, now)}</span>
        </div>
      </div>

      <div aria-hidden="true" className="hidden flex-col items-center border-l border-line pt-0.5 text-center sm:flex">
        <span className="text-meta text-graphite">Seen</span>
        {/* A brass serif numeral, like the due counts on Today (design v1.2). */}
        <span className="my-0.5 font-serif text-title leading-[1.05] font-normal text-brass tabular-nums lining-nums">{pattern.seen}</span>
        <span className="text-meta text-graphite">{pattern.seen === 1 ? 'time' : 'times'}</span>
        <span className="mt-1 text-meta text-graphite">in {plural(noteCount, 'note')}</span>
      </div>

      {open ? (
        <div id={listId} className="col-span-full mt-3 border-l border-line-strong pl-4">
          {pattern.notes.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              view="compact"
              to={`/notes/${n.id}`}
              linkState={{ ids, from: linkFrom }}
              className="last:[&>div]:border-b-0"
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}
