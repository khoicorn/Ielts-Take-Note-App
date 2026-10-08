import type React from 'react'
import { Link } from 'react-router'
import { isDue } from '@/lib/srs'
import type { Note } from '@/lib/types'
import { NotePair } from '@/components/notes/NotePair'
import { cn } from '@/components/ui/cn'
import { FavoriteStar, MustRememberMark } from '@/components/ui/FavoriteStar'
import { MasteryMark } from '@/components/ui/MasteryMark'

/**
 * A reading-view note row for the notebooks (mockup 16): the mistake, the upgrade in deep sage and the
 * example on the left; a quiet meta column on the right (subtopic or topic, Must Remember, mastery, "Due today").
 * Same frame as NoteRow (full-width link, hairline under it, gentle hover), with a meta column NoteRow cannot show.
 * Renders an <li>; put it inside a <ul>.
 */
export function NotebookRow(props: {
  note: Note
  to: string
  linkState?: unknown
  highlight?: string
  /** First line of the meta column, e.g. the subtopic ("Nha Trang trip") or the topic. */
  label?: string
  /** A quieter second line, e.g. "Task 1". */
  sublabel?: string
  now: Date
  trailing?: React.ReactNode
}): React.JSX.Element {
  const { note, to, linkState, highlight, now, trailing } = props
  const label = props.label?.trim()
  const sublabel = props.sublabel?.trim()
  const due = isDue(note, now)
  return (
    <li className="group -mx-3 flex rounded-sm px-3 transition-colors duration-150 hover:bg-stone/60">
      <div className="flex min-w-0 flex-1 items-stretch border-b border-line">
        <Link
          to={to}
          state={linkState}
          className={cn(
            'flex min-w-0 flex-1 items-start gap-6 rounded-sm py-5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo',
            // The link reaches into the row's side padding, so the focus ring frames the hover surface.
            '-ml-3 pl-3',
            trailing ? null : '-mr-3 pr-3',
          )}
        >
          <div className="min-w-0 flex-1">
            <NotePair note={note} size="reading" highlight={highlight} />
            {/* Under 640px the meta column folds into one line under the note. */}
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-graphite sm:hidden">
              {label ? <span className="max-w-full truncate">{label}</span> : null}
              {label ? <span aria-hidden="true">·</span> : null}
              <MasteryMark status={note.mastery_status} size="meta" />
              {due ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-indigo">Due today</span>
                </>
              ) : null}
              {note.is_favorite ? <FavoriteStar active className="ml-auto" /> : null}
            </p>
          </div>
          <div className="hidden w-36 shrink-0 flex-col items-end gap-1 pt-0.5 text-right sm:flex">
            {label ? <span className="max-w-full truncate text-small text-graphite">{label}</span> : null}
            {sublabel ? <span className="max-w-full truncate text-meta text-graphite">{sublabel}</span> : null}
            {note.is_favorite ? <MustRememberMark /> : null}
            <MasteryMark status={note.mastery_status} />
            {due ? <span className="text-meta text-indigo">Due today</span> : null}
          </div>
        </Link>
        {trailing ? <div className="flex shrink-0 items-center pl-3">{trailing}</div> : null}
      </div>
    </li>
  )
}
