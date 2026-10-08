import type React from 'react'
import { Link } from 'react-router'
import type { Note } from '@/lib/types'
import { cn } from '@/components/ui/cn'
import { FavoriteStar } from '@/components/ui/FavoriteStar'
import { MasteryMark } from '@/components/ui/MasteryMark'
import { ModeMark } from './ModeMark'
import { NotePair } from './NotePair'

/**
 * A full-width link row with a hairline under it and a gentle hover (brief §32, §37).
 * The hover surface reaches 12px past the text column; the hairline stays aligned with it.
 * `showMode` puts the Speaking or Writing mark before the topic, for lists that mix both (Today,
 * Calendar, Session complete; mockups 06, 11, m03). Without a topic, the mode's word stands in for it.
 */
export function NoteRow(props: {
  note: Note
  view?: 'compact' | 'reading'
  to: string
  linkState?: unknown
  highlight?: string
  trailing?: React.ReactNode
  showMode?: boolean
  className?: string
}): React.JSX.Element {
  const { note, view = 'compact', to, linkState, highlight, trailing, showMode = false, className } = props
  const topic = note.topic.trim()
  const reading = view === 'reading'
  const mode = showMode ? <ModeMark mode={note.mode} showLabel={!topic} /> : null
  const topicLabel = (cls: string) =>
    mode || topic ? (
      <span className="flex min-w-0 items-center gap-1.5">
        {mode}
        {topic ? <span className={cls}>{topic}</span> : null}
      </span>
    ) : null
  return (
    <div className={cn('group -mx-3 flex items-stretch rounded-sm px-3 transition-colors duration-150 hover:bg-stone/60', className)}>
      <div className="flex min-w-0 flex-1 items-stretch border-b border-line">
        <Link
          to={to}
          state={linkState}
          className={cn(
            // No outline-none here: in Tailwind 4 it sets --tw-outline-style to none, which also hides the focus ring.
            'flex min-w-0 flex-1 items-start gap-6 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus',
            // The link reaches into the row's 12px side padding, so the focus ring frames the hover surface, not the text edge.
            '-ml-3 pl-3',
            trailing ? null : '-mr-3 pr-3',
            reading ? 'py-5' : 'py-3.5',
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <NotePair note={note} size={view} highlight={highlight} className="flex-1" />
              {note.is_favorite ? (
                <span className="flex pt-1 sm:hidden">
                  <FavoriteStar active />
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 flex items-center gap-2 text-meta text-graphite sm:hidden">
              {topicLabel('truncate')}
              {mode || topic ? <span aria-hidden="true">·</span> : null}
              <MasteryMark status={note.mastery_status} size="meta" />
            </p>
          </div>
          <div
            className={cn(
              'hidden shrink-0 sm:flex',
              reading ? 'flex-col items-end gap-1.5 pt-0.5' : 'items-center gap-4 self-center',
            )}
          >
            {reading ? (
              // Favorite mark beside the topic, mastery on its own line: the two ✦ never touch.
              <>
                <span className="flex items-center gap-2">
                  {topicLabel('max-w-40 truncate text-small text-graphite')}
                  <FavoriteStar active={note.is_favorite} />
                </span>
                <MasteryMark status={note.mastery_status} />
              </>
            ) : (
              topicLabel('max-w-40 truncate text-small text-graphite')
            )}
            {reading ? null : (
              // Fixed width so the mastery words line up from row to row.
              <span className="w-[5.5rem]">
                <MasteryMark status={note.mastery_status} />
              </span>
            )}
          </div>
          {!reading ? (
            <span className="hidden w-3.5 shrink-0 self-center sm:flex">
              <FavoriteStar active={note.is_favorite} />
            </span>
          ) : null}
        </Link>
        {trailing ? <div className="flex shrink-0 items-center pl-3">{trailing}</div> : null}
      </div>
    </div>
  )
}
