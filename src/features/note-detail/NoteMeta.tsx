import { ArrowRight, ChevronDown } from 'lucide-react'
import type React from 'react'
import { Link } from 'react-router'
import { cn, WRAP } from '@/components/ui/cn'
import { RIBBON_ON } from '@/components/ui/FavoriteStar'
import { ICON_STROKE, RibbonIcon, type SvgIcon } from '@/components/ui/icons'
import { MasteryGlyph } from '@/components/ui/MasteryMark'
import { Menu } from '@/components/ui/Popover'
import { Tag } from '@/components/ui/Tag'
import { formatDue, formatLongDate, formatShortDate, toDayKey, todayKey } from '@/lib/dates'
import { errorTypeSlug } from '@/lib/mistakes'
import { MASTERY, MASTERY_ORDER, noteTypeLabel, taskTypeLabel } from '@/lib/taxonomy'
import type { MasteryStatus, Note } from '@/lib/types'
import { times } from './detail'

/** Menu icons: the drawn mastery marks (the mastered ✦ stays brass). */
const GLYPH_ICONS: Readonly<Record<MasteryStatus, SvgIcon>> = {
  new: () => <MasteryGlyph status="new" />,
  learning: () => <MasteryGlyph status="learning" />,
  familiar: () => <MasteryGlyph status="familiar" />,
  mastered: () => <MasteryGlyph status="mastered" />,
}

function Item(props: { label: string; children: React.ReactNode; className?: string }): React.JSX.Element {
  return (
    <div className={cn('[&+&]:mt-4', props.className)}>
      <dt className="text-meta text-graphite">{props.label}</dt>
      <dd className={cn('mt-0.5 text-small text-ink', WRAP)}>{props.children}</dd>
    </div>
  )
}

function Sub(props: { children: React.ReactNode }): React.JSX.Element {
  return <span className="block text-graphite">{props.children}</span>
}

function MasteryMenu(props: { status: MasteryStatus; onChange: (m: MasteryStatus) => void }): React.JSX.Element {
  const { status, onChange } = props
  const label = MASTERY[status].label
  return (
    <Menu
      aria-label="Change mastery"
      align="start"
      items={MASTERY_ORDER.map((m) => ({
        label: MASTERY[m].label,
        icon: GLYPH_ICONS[m],
        disabled: m === status,
        onSelect: () => onChange(m),
      }))}
      trigger={
        <button
          type="button"
          aria-label={`Mastery: ${label}. Change`}
          title="Change mastery"
          className={cn(
            '-mx-1.5 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 text-small text-ink',
            'transition-colors duration-150 hover:bg-stone max-sm:min-h-11',
          )}
        >
          <MasteryGlyph status={status} />
          <span>{label}</span>
          <ChevronDown className="size-3.5 text-graphite" strokeWidth={ICON_STROKE} aria-hidden="true" />
        </button>
      }
    />
  )
}

/**
 * The narrow metadata column (brief §33): what the note is about, its review state, and when it was made.
 * Empty values are left out. Groups are separated by hairlines; on tablets they sit side by side.
 */
export function NoteMeta(props: {
  note: Note
  now?: Date
  onMasteryChange: (m: MasteryStatus) => void
  className?: string
}): React.JSX.Element {
  const { note, now = new Date(), onMasteryChange, className } = props
  const topic = note.topic.trim()
  const subtopic = note.subtopic.trim()
  const task = note.mode === 'writing' ? taskTypeLabel(note.task_type) : ''
  const genre = note.mode === 'writing' ? note.task_genre.trim() : ''
  const errorType = note.error_type.trim()
  const errorPattern = note.error_pattern.trim()
  const fixPattern = note.fix_pattern.trim()
  const recall = note.recall_prompt.trim()
  const tags = note.tags.filter((t) => t.trim())

  // Next review: archived notes are never due. A date line only when it adds something.
  const nextMain = note.is_archived ? 'Archived' : formatDue(note.next_review_at, now)
  let nextSub: string | null = null
  if (note.is_archived) nextSub = 'Hidden from review'
  else if (note.next_review_at) {
    const due = new Date(note.next_review_at)
    if (toDayKey(due) > todayKey(now)) nextSub = formatLongDate(due)
  }

  const groups: React.ReactNode[][] = [
    [
      topic ? (
        <Item key="topic" label="Topic">
          {topic}
        </Item>
      ) : null,
      subtopic ? (
        <Item key="subtopic" label="Subtopic">
          {subtopic}
        </Item>
      ) : null,
      task || genre ? (
        <Item key="task" label="Task">
          {task || genre}
          {task && genre ? <Sub>{genre}</Sub> : null}
        </Item>
      ) : null,
      <Item key="type" label="Note type">
        {noteTypeLabel(note.note_type)}
      </Item>,
      errorType ? (
        <Item key="error" label="Error type">
          {errorType}
        </Item>
      ) : null,
      errorPattern || fixPattern ? (
        <Item key="pattern" label="Pattern">
          {errorPattern ? <span className="block text-crimson">{errorPattern}</span> : null}
          {fixPattern ? (
            <span className="flex items-baseline gap-1.5 text-upgrade">
              <ArrowRight className="size-3.5 shrink-0 translate-y-0.5 text-graphite" strokeWidth={ICON_STROKE} aria-hidden="true" />
              <span className="sr-only">Use instead: </span>
              <span className="min-w-0">{fixPattern}</span>
            </span>
          ) : null}
        </Item>
      ) : null,
      recall ? (
        <Item key="recall" label="Recall prompt">
          {recall}
        </Item>
      ) : null,
    ],
    [
      <Item key="mastery" label="Mastery">
        <MasteryMenu status={note.mastery_status} onChange={onMasteryChange} />
      </Item>,
      <Item key="next" label="Next review">
        {nextMain}
        {nextSub ? <Sub>{nextSub}</Sub> : null}
      </Item>,
      <Item key="reviewed" label="Reviewed">
        {note.times_reviewed > 0 ? times(note.times_reviewed) : 'Not yet'}
        {note.times_reviewed > 0 && note.last_reviewed_at ? <Sub>Last on {formatShortDate(note.last_reviewed_at, now)}</Sub> : null}
      </Item>,
      note.times_seen > 1 ? (
        <Item key="seen" label="Mistake seen">
          {times(note.times_seen)}
          {errorType || errorPattern ? (
            <Link
              to={`/mistakes#${errorTypeSlug(errorType || 'Other')}`}
              className="mt-0.5 flex w-fit items-center gap-1 rounded-xs text-indigo hover:underline max-sm:min-h-11"
            >
              Related notes
              <ArrowRight className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
            </Link>
          ) : null}
        </Item>
      ) : null,
    ],
    [
      tags.length > 0 ? (
        <Item key="tags" label="Tags">
          <span className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </span>
        </Item>
      ) : null,
      <Item key="created" label="Created">
        {formatShortDate(note.date_created, now)}
      </Item>,
      note.is_favorite ? (
        <Item key="favorite" label="Must Remember">
          <span className="flex items-center gap-2">
            <RibbonIcon aria-hidden="true" data-ribbon="on" className={cn('size-3.5 shrink-0', RIBBON_ON)} strokeWidth={1.25} />
            Yes
          </span>
        </Item>
      ) : null,
    ],
  ]

  return (
    <aside
      aria-label="Note details"
      className={cn(
        'border-t border-line pt-6 sm:grid sm:grid-cols-3 sm:gap-8',
        'lg:block lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8',
        className,
      )}
    >
      {groups
        .map((items) => items.filter(Boolean))
        .filter((items) => items.length > 0)
        .map((items, i) => (
          <dl
            key={i}
            className={cn(
              'min-w-0',
              i > 0 && 'mt-6 border-t border-line pt-6 sm:mt-0 sm:border-t-0 sm:pt-0 lg:mt-6 lg:border-t lg:pt-6',
            )}
          >
            {items}
          </dl>
        ))}
    </aside>
  )
}
