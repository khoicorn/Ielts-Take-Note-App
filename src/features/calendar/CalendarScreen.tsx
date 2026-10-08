import { ChevronLeft, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NoteRow } from '@/components/notes/NoteRow'
import { Button } from '@/components/ui/Button'
import { cn, READING_PAGE as PAGE } from '@/components/ui/cn'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { dayKeyToDate, formatLongDate, todayKey } from '@/lib/dates'
import { useNotes, useReviewsBetween } from '@/lib/hooks'
import type { DayKey } from '@/lib/types'
import {
  aggregateMonth,
  type DayStats,
  dayAriaLabel,
  daySummary,
  daysInMonth,
  monthGrid,
  monthRange,
  monthSummary,
  monthTitle,
  noteDay,
  shiftDay,
  shiftMonth,
  weekdayIndex,
} from './aggregate'


const WEEKDAYS: readonly { short: string; long: string }[] = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
]

const EMPTY: DayStats = { reviews: 0, notesAdded: 0 }

/** Studied day: a small indigo dot. */
function StudiedDot(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 6 6" className={cn('size-1.5 shrink-0 text-indigo', props.className)} aria-hidden="true" focusable="false">
      <circle cx="3" cy="3" r="3" fill="currentColor" />
    </svg>
  )
}

/**
 * Notes added: a tiny gold glint (a thin plus). Not ✦, which means Mastered only (owner refinement 2026-10-08).
 */
function AddedGlint(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 10 10" className={cn('size-2 shrink-0 text-gold', props.className)} aria-hidden="true" focusable="false">
      <path d="M5 0.75V9.25M0.75 5H9.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function dayTitle(day: DayKey, now: Date): string {
  const d = dayKeyToDate(day)
  const long = formatLongDate(d)
  return d.getFullYear() === now.getFullYear() ? long : `${long} ${d.getFullYear()}`
}

/** Where the keyboard moves from a day, or null for keys the grid does not handle. */
function targetDay(day: DayKey, key: string): DayKey | null {
  switch (key) {
    case 'ArrowLeft':
      return shiftDay(day, -1)
    case 'ArrowRight':
      return shiftDay(day, 1)
    case 'ArrowUp':
      return shiftDay(day, -7)
    case 'ArrowDown':
      return shiftDay(day, 7)
    case 'Home':
      return shiftDay(day, -weekdayIndex(day))
    case 'End':
      return shiftDay(day, 6 - weekdayIndex(day))
    case 'PageUp':
    case 'PageDown': {
      const d = dayKeyToDate(day)
      const m = shiftMonth(d.getFullYear(), d.getMonth(), key === 'PageUp' ? -1 : 1)
      return todayKey(new Date(m.year, m.month, Math.min(d.getDate(), daysInMonth(m.year, m.month))))
    }
    default:
      return null
  }
}

function DayButton(props: {
  day: DayKey
  stats: DayStats
  selected: boolean
  today: boolean
  onSelect: (day: DayKey, focus: boolean) => void
}): React.JSX.Element {
  const { day, stats, selected, today, onSelect } = props
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const next = targetDay(day, e.key)
    if (!next) return
    e.preventDefault()
    onSelect(next, true)
  }
  return (
    <button
      type="button"
      data-day={day}
      tabIndex={selected ? 0 : -1}
      aria-label={dayAriaLabel(day, stats)}
      aria-current={today ? 'date' : undefined}
      onClick={() => onSelect(day, false)}
      onKeyDown={onKeyDown}
      className={cn(
        'flex h-12 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border text-body text-ink tabular-nums',
        'transition-colors duration-150 sm:h-16',
        selected ? 'bg-stone font-medium' : 'hover:bg-stone/60',
        today ? 'border-line-strong' : 'border-transparent',
      )}
    >
      <span aria-hidden="true" className="leading-none">
        {dayKeyToDate(day).getDate()}
      </span>
      <span aria-hidden="true" className="flex h-2 items-center gap-1">
        {stats.reviews > 0 ? <StudiedDot /> : null}
        {stats.notesAdded > 0 ? <AddedGlint /> : null}
      </span>
    </button>
  )
}

/**
 * Calendar (brief §34): days studied, notes added, reviews completed. Minimal, no planner features.
 * `now` is for tests; the app passes nothing and uses the current time.
 */
export function CalendarScreen(props: { now?: Date } = {}): React.JSX.Element {
  const now = props.now ?? new Date()
  const today = todayKey(now)
  const [view, setView] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }))
  const [selected, setSelected] = useState<DayKey>(today)
  const focusPending = useRef(false)
  const gridRef = useRef<HTMLTableElement>(null)

  const range = monthRange(view.year, view.month)
  const reviews = useReviewsBetween(range.from, range.to)
  const notes = useNotes()
  const loading = reviews === undefined || notes === undefined
  const days = useMemo(
    () => aggregateMonth(view.year, view.month, notes ?? [], reviews ?? []),
    [view.year, view.month, notes, reviews],
  )
  const weeks = useMemo(() => {
    const cells = monthGrid(view.year, view.month)
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  }, [view.year, view.month])
  const added = useMemo(() => (notes ?? []).filter((n) => noteDay(n) === selected), [notes, selected])

  /** Selects a day and shows its month. With focus, keyboard focus follows (arrow keys). */
  const select = (day: DayKey, focus: boolean) => {
    const d = dayKeyToDate(day)
    focusPending.current = focus
    setSelected(day)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  useEffect(() => {
    if (!focusPending.current) return
    focusPending.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${selected}"]`)?.focus()
  }, [selected, view])

  /** Previous or next month: select today when it is in that month, else the 1st. */
  const goMonth = (delta: number) => {
    const m = shiftMonth(view.year, view.month, delta)
    const inMonth = m.year === now.getFullYear() && m.month === now.getMonth()
    select(inMonth ? today : todayKey(new Date(m.year, m.month, 1)), false)
  }

  const stats = days.get(selected) ?? EMPTY

  return (
    <div className={PAGE}>
      <PageHeader title="Calendar" />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 id="calendar-month" className="font-serif text-section font-normal text-ink" aria-live="polite">
            {monthTitle(view.year, view.month)}
          </h2>
          <p className="mt-0.5 min-h-[1.5em] text-small text-graphite">{loading ? null : monthSummary(days)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => select(today, false)} className="mr-1">
            Today
          </Button>
          <IconButton icon={ChevronLeft} label="Previous month" onClick={() => goMonth(-1)} />
          <IconButton icon={ChevronRight} label="Next month" onClick={() => goMonth(1)} />
        </div>
      </div>

      <table ref={gridRef} role="grid" aria-labelledby="calendar-month" className="mt-3 w-full table-fixed border-collapse">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w.short} scope="col" className="pb-2 text-center text-meta font-normal text-graphite">
                <abbr title={w.long} className="no-underline">
                  {w.short}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.find(Boolean) ?? ''}>
              {week.map((day, i) =>
                day ? (
                  <td key={day} role="gridcell" aria-selected={day === selected} className="p-0.5">
                    <DayButton
                      day={day}
                      stats={days.get(day) ?? EMPTY}
                      selected={day === selected}
                      today={day === today}
                      onSelect={select}
                    />
                  </td>
                ) : (
                  <td key={`empty-${i}`} role="gridcell" className="p-0.5" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-meta text-graphite">
        <span className="inline-flex items-center gap-1.5">
          <StudiedDot />
          Studied
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AddedGlint />
          Notes added
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-xs border border-line-strong" aria-hidden="true" />
          Today
        </span>
      </p>

      <Section title={dayTitle(selected, now)} id="calendar-day" className="mt-10 sm:mt-12">
        <p className="pt-3 pb-1 text-small text-graphite">{loading ? null : daySummary(stats)}</p>
        {added.length > 0 ? (
          <div>
            {added.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                view="compact"
                to={`/notes/${note.id}`}
                linkState={{ from: '/calendar', ids: added.map((n) => n.id) }}
                showMode
              />
            ))}
          </div>
        ) : null}
      </Section>
    </div>
  )
}
