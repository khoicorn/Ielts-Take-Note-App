import { ArrowDown } from 'lucide-react'
import type React from 'react'
import { forwardRef } from 'react'
import { Link } from 'react-router'
import type { SortKey } from '@/lib/filters'
import { Markdown } from '@/lib/markdown'
import { isDue } from '@/lib/srs'
import { FIELD_LABELS, noteTypeLabel } from '@/lib/taxonomy'
import type { Note } from '@/lib/types'
import { cn, WRAP } from '@/components/ui/cn'
import { FavoriteStar } from '@/components/ui/FavoriteStar'
import { ICON_STROKE } from '@/components/ui/icons'
import { MasteryMark } from '@/components/ui/MasteryMark'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { dueCell, modeOrTask } from './notebook'

/**
 * Columns (mockup 14): Topic · Mistake · Upgrade · Type · Next review · Mastery · ribbon.
 * The upgrade column takes the free space (the upgrade is the hero). Type appears from 1280px.
 */
const COLUMNS = cn(
  'grid items-baseline gap-x-4',
  'grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.3fr)_5.75rem_6rem_1rem]',
  'xl:grid-cols-[6.75rem_13.75rem_minmax(0,1fr)_7.5rem_6.25rem_6rem_1rem]',
)

const HEAD = 'text-meta font-medium uppercase tracking-[0.08em] text-graphite'

function oneLine(s: string): string {
  return s.replace(/\s*\n+\s*/g, ' ').trim()
}

/** A column label; the sorted column is ink with a small arrow. */
function SortedHead(props: { label: string; active: boolean }): React.JSX.Element {
  const { label, active } = props
  return (
    <span className={cn(HEAD, active && 'inline-flex items-center gap-1 text-ink')}>
      {label}
      {active ? <ArrowDown className="size-3" strokeWidth={ICON_STROKE + 0.5} aria-hidden="true" /> : null}
    </span>
  )
}

function TableRow(props: { note: Note; to: string; linkState?: unknown; highlight?: string; now: Date }): React.JSX.Element {
  const { note, to, linkState, highlight, now } = props
  const labels = FIELD_LABELS[note.mode]
  const topic = note.topic.trim()
  const original = oneLine(note.original_text)
  const due = isDue(note, now)
  return (
    <li className="-mx-3 rounded-sm px-3 transition-colors duration-150 hover:bg-stone/60">
      <Link
        to={to}
        state={linkState}
        className="-mx-3 block rounded-sm px-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo"
      >
        {/* The hairline sits on the inner grid, so it lines up with the column labels, not the hover surface. */}
        <span className={cn(COLUMNS, 'border-b border-line py-3.5')}>
        <span className="min-w-0">
          <span className={cn('block text-small text-ink', WRAP)}>{topic || <span className="text-graphite">No topic</span>}</span>
          <span className="block text-meta text-graphite">{modeOrTask(note)}</span>
        </span>
        <span className={cn('line-clamp-2 min-w-0 text-small text-crimson', WRAP)}>
          {original ? (
            <>
              <VisuallyHidden>{`${labels.original}: `}</VisuallyHidden>
              <Markdown text={original} inline highlight={highlight} />
            </>
          ) : null}
        </span>
        <span className={cn('line-clamp-2 min-w-0 text-body text-ink', WRAP)}>
          <VisuallyHidden>{`${labels.upgraded}: `}</VisuallyHidden>
          <Markdown text={oneLine(note.upgraded_text)} inline highlight={highlight} />
        </span>
        <span className="hidden min-w-0 truncate text-small text-graphite xl:block">{noteTypeLabel(note.note_type)}</span>
        <span className={cn('min-w-0 text-small', due ? 'text-ink' : 'text-graphite')}>
          <VisuallyHidden>Next review: </VisuallyHidden>
          {dueCell(note, now)}
        </span>
        <span className="min-w-0">
          <MasteryMark status={note.mastery_status} />
        </span>
        <span className="flex justify-end self-center">
          <FavoriteStar active={note.is_favorite} />
        </span>
        </span>
      </Link>
    </li>
  )
}

/**
 * All Notes compact view at 1024px and wider: a refined table where each row is one link (brief §32).
 * Column labels are visual; each row link carries its own labels for screen readers.
 */
export const NotesTable = forwardRef<
  HTMLUListElement,
  {
    notes: Note[]
    sort: SortKey
    linkState: (note: Note) => unknown
    highlight?: string
    now: Date
    onKeyDown?: (e: React.KeyboardEvent) => void
  }
>(function NotesTable(props, ref) {
  const { notes, sort, linkState, highlight, now, onKeyDown } = props
  return (
    <div>
      <div aria-hidden="true" className={cn(COLUMNS, 'border-b border-line-strong pb-2.5')}>
        <SortedHead label="Topic" active={sort === 'topic'} />
        <span className={HEAD}>Mistake</span>
        <span className={HEAD}>Upgrade</span>
        <span className={cn(HEAD, 'hidden xl:block')}>Type</span>
        <SortedHead label="Next review" active={sort === 'next_review'} />
        <SortedHead label="Mastery" active={sort === 'mastery'} />
        <span />
      </div>
      <ul ref={ref} aria-label="Notes" data-view="table" onKeyDown={onKeyDown}>
        {notes.map((n) => (
          <TableRow key={n.id} note={n} to={`/notes/${n.id}`} linkState={linkState(n)} highlight={highlight} now={now} />
        ))}
      </ul>
    </div>
  )
})
