import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, ChevronRight, Download, Plus } from 'lucide-react'
import type React from 'react'
import { Link } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { streakText } from '@/app/Sidebar'
import { ModeMark } from '@/components/notes/ModeMark'
import { NOTE_LABEL } from '@/components/notes/NotePair'
import { NoteRow } from '@/components/notes/NoteRow'
import { Button, ButtonLink } from '@/components/ui/Button'
import { cn, READING_PAGE as PAGE, WRAP } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'
import { Ornament } from '@/components/ui/Ornament'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { formatLongDate } from '@/lib/dates'
import { db } from '@/lib/db'
import { useDueCounts, useLastExportAt, useLastStudied, useNotes, useStudyStreak } from '@/lib/hooks'
import type { DueCounts } from '@/lib/hooks'
import { errorTypeSlug, mostRepeatedIssue } from '@/lib/mistakes'
import { MODE_LABELS } from '@/lib/taxonomy'
import type { LastStudied, Mode, Note } from '@/lib/types'
import { FirstRun } from './FirstRun'
import { backupLine, continueTarget, dueLine, lastStudiedLine, nextReviewLine, notesCount } from './todayCopy'

const RECENT_COUNT = 5
const MODES: readonly Mode[] = ['speaking', 'writing']

/** Today mixes long and short notes: the upgrade may take two lines here, the mistake stays on one. */
const UPGRADE_TWO_LINES =
  '[&_[data-testid=note-upgraded]]:line-clamp-2 [&_[data-testid=note-upgraded]]:whitespace-normal'

/** Small text link that stays 44px tall on phones without changing the layout. */
function TextLink(props: { to: string; tone?: 'quiet' | 'accent'; children: React.ReactNode; className?: string }): React.JSX.Element {
  const { to, tone = 'accent', children, className } = props
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1 rounded-xs text-small transition-colors duration-150 max-sm:-my-3 max-sm:min-h-11',
        tone === 'quiet' ? 'text-graphite hover:text-ink' : 'text-indigo hover:underline hover:underline-offset-[3px]',
        className,
      )}
    >
      {children}
      <ArrowRight className="size-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
    </Link>
  )
}

function DueColumn(props: { mode: Mode; count: number; second: boolean }): React.JSX.Element {
  const { mode, count, second } = props
  const body = (
    <>
      <ModeMark mode={mode} />
      <span className="text-section text-ink tabular-nums">
        {count} <span className="text-body text-graphite">due</span>
      </span>
    </>
  )
  const box = cn(
    'relative flex min-w-0 flex-col gap-0.5 py-4 pr-8 sm:py-[18px] sm:pr-12',
    second && 'border-l border-line pl-4 sm:pl-6',
  )
  if (count === 0) return <div className={box}>{body}</div>
  return (
    <Link
      to={`/review?mode=${mode}`}
      aria-label={`Review ${MODE_LABELS[mode]} only, ${count} due`}
      className={cn(box, 'group rounded-xs')}
    >
      {body}
      <ChevronRight
        className="absolute top-1/2 right-2 size-4 -translate-y-1/2 text-graphite transition-colors duration-150 group-hover:text-ink sm:right-4"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    </Link>
  )
}

function ReviewBlock(props: { due: DueCounts; now: Date; onAdd: () => void }): React.JSX.Element {
  const { due, now, onAdd } = props
  if (due.total === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-line py-4 sm:py-[18px]">
        <p className="text-body-lg text-ink">{nextReviewLine(due.nextDueAt, due.nextDueCount, now)}</p>
        <Button variant="secondary" icon={Plus} kbd="N" onClick={onAdd}>
          Add a note
        </Button>
      </div>
    )
  }
  return (
    <>
      {/* The strongest element on the page (brief §5). */}
      <ButtonLink to="/review" variant="primary" size="lg" iconRight={ArrowRight} className="w-full sm:w-auto sm:min-w-[200px]">
        <span className="flex-1 text-left">Begin Review</span>
      </ButtonLink>
      <div role="group" aria-label="Due today by mode" className="mt-8 grid grid-cols-2 border-y border-line sm:mt-10">
        {MODES.map((mode, i) => (
          <DueColumn key={mode} mode={mode} count={due[mode]} second={i > 0} />
        ))}
      </div>
    </>
  )
}

function ContinueStudying(props: { last: LastStudied; now: Date }): React.JSX.Element {
  const { last, now } = props
  const target = continueTarget(last)
  return (
    <Section title="Continue studying" id="continue" className="mt-12 sm:mt-16">
      <Link
        to={target.to}
        className="group -mx-3 mt-1 flex min-h-11 items-center gap-3 rounded-sm px-3 py-3.5 transition-colors duration-150 hover:bg-stone/60 sm:gap-4 sm:py-4"
      >
        <span className="block min-w-0 flex-1">
          <span className="block text-small text-graphite">{target.kicker}</span>
          <span className={cn('block font-serif text-recall leading-[1.2] text-ink', WRAP)}>{target.title}</span>
          <span className="mt-0.5 block text-meta text-graphite">{lastStudiedLine(last.at, now)}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-small text-indigo">
          <span className="hidden sm:inline">Continue</span>
          <ArrowRight className="size-[18px] sm:size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
        </span>
      </Link>
    </Section>
  )
}

function RecentNotes(props: { notes: Note[] }): React.JSX.Element {
  const { notes } = props
  const ids = notes.map((n) => n.id)
  const anyMistake = notes.some((n) => n.original_text.trim() !== '')
  return (
    <Section
      title="Recent notes"
      id="recent"
      className="mt-12 sm:mt-16"
      action={
        <TextLink to="/notes" tone="quiet">
          All Notes
        </TextLink>
      }
    >
      {anyMistake ? (
        // One quiet key line, so a first-time reader knows what the two lines are (brief §44).
        <p className={cn(NOTE_LABEL, 'pt-3')}>
          Mistake <span aria-hidden="true">→</span>
          <VisuallyHidden>then</VisuallyHidden> Upgrade
        </p>
      ) : null}
      <div>
        {notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            view="compact"
            to={`/notes/${note.id}`}
            linkState={{ from: '/', ids }}
            showMode
            className={UPGRADE_TWO_LINES}
          />
        ))}
      </div>
    </Section>
  )
}

function RepeatedIssue(props: { errorType: string; count: number }): React.JSX.Element {
  const { errorType, count } = props
  return (
    <Section title="Most repeated issue this week" id="issue" mark className="mt-12 sm:mt-16">
      <div className="flex items-baseline justify-between gap-4 pt-3.5 sm:gap-6 sm:pt-4">
        <p className={cn('min-w-0 font-serif text-recall leading-[1.2] text-ink', WRAP)}>{errorType}</p>
        <TextLink to={`/mistakes#${errorTypeSlug(errorType)}`} className="shrink-0">
          {notesCount(count)}
          <VisuallyHidden>{` about ${errorType} in My Mistakes`}</VisuallyHidden>
        </TextLink>
      </div>
    </Section>
  )
}

/** The quiet end of the page: the backup reminder (design §11) and, where the sidebar is hidden, the streak line. */
function PageEnd(props: { backup: string | null; streak: string | null }): React.JSX.Element | null {
  const { backup, streak } = props
  if (!backup && !streak) return null
  return (
    // The sidebar shows the streak from 1024px, so without a backup line this whole block is phone and tablet only.
    <div className={cn('mt-14 sm:mt-[72px]', !backup && 'lg:hidden')}>
      <Ornament variant="constellation" />
      {backup ? (
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-small text-graphite sm:mt-5">
          <Download className="hidden size-4 shrink-0 sm:block" strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span>{backup}</span>
          <Link
            to="/settings#data"
            className="inline-flex items-center rounded-xs text-indigo underline decoration-indigo/35 decoration-1 underline-offset-[3px] transition-colors duration-150 hover:decoration-indigo max-sm:-my-3 max-sm:min-h-11"
          >
            Export a copy.
          </Link>
        </p>
      ) : null}
      {streak ? <p className="mt-3 text-center text-small text-graphite lg:hidden">{streak}</p> : null}
    </div>
  )
}

/**
 * Today (brief §5): what to study today. One reading column, generous space, no cards.
 * `now` is for tests; the app passes nothing and uses the current time.
 */
export function TodayScreen(props: { now?: Date } = {}): React.JSX.Element {
  const now = props.now ?? new Date()
  const quickAdd = useQuickAdd()
  const notes = useNotes()
  // Archived notes count here: a notebook with only archived notes is not a first run.
  const total = useLiveQuery(() => db.notes.count(), [])
  const due = useDueCounts()
  const lastStudied = useLastStudied()
  const lastExportAt = useLastExportAt()
  const streak = streakText(useStudyStreak())
  const title = formatLongDate(now)

  if (notes === undefined || total === undefined || due === undefined) {
    return (
      <div className={PAGE}>
        <PageHeader title={title} />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className={PAGE}>
        <FirstRun title={title} />
      </div>
    )
  }

  const recent = notes.slice(0, RECENT_COUNT)
  const issue = mostRepeatedIssue(notes, now)
  const backup = lastExportAt === undefined ? null : backupLine(notes.length, lastExportAt, now)

  return (
    <div className={PAGE}>
      <PageHeader title={title} description={dueLine(due.total)} />
      <ReviewBlock due={due} now={now} onAdd={() => quickAdd.open()} />
      {lastStudied ? <ContinueStudying last={lastStudied} now={now} /> : null}
      {recent.length > 0 ? <RecentNotes notes={recent} /> : null}
      {issue ? <RepeatedIssue errorType={issue.error_type} count={issue.count} /> : null}
      <PageEnd backup={backup} streak={streak} />
    </div>
  )
}
