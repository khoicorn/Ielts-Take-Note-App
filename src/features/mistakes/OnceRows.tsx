import { ChevronRight } from 'lucide-react'
import type React from 'react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { cn, WRAP } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import type { OnceGroup, OnceRow } from './ledgerView'
import { plural } from './ledgerView'

/** "habit → fix", linked to its note. The habit is crimson and smaller; the fix is ink and larger (brief §18). */
function Pair(props: { row: OnceRow; to: string; linkState: unknown }): React.JSX.Element {
  const { row, to, linkState } = props
  return (
    <Link
      to={to}
      state={linkState}
      className="group flex min-h-11 min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 rounded-xs py-3 sm:min-h-0"
    >
      {row.habit ? (
        <>
          <span className={cn('text-small text-crimson', WRAP)}>
            <VisuallyHidden>Habit: </VisuallyHidden>
            {row.habit}
          </span>
          <span aria-hidden="true" className="text-small text-graphite">
            →
          </span>
        </>
      ) : null}
      <span className={cn('text-body text-ink decoration-line-strong underline-offset-4 group-hover:underline', WRAP)}>
        <VisuallyHidden>Use instead: </VisuallyHidden>
        {row.fix}
      </span>
    </Link>
  )
}

/**
 * Habits seen once inside a group that has repeated ones, folded into one line (mockup 15):
 * "8 more patterns, seen once each" with a short preview. Opens into a list.
 */
export function MoreOnce(props: { rows: OnceRow[]; linkFrom: string }): React.JSX.Element {
  const { rows, linkFrom } = props
  const [open, setOpen] = useState(false)
  const listId = useId()
  const ids = rows.map((r) => r.note.id)
  const label = `${plural(rows.length, 'more pattern')}, seen once${rows.length > 1 ? ' each' : ''}`
  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full cursor-pointer items-start gap-2.5 rounded-xs py-3 text-left text-small text-graphite"
      >
        <ChevronRight
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className={cn('mt-[3px] size-3.5 shrink-0 transition-transform duration-180', open && 'rotate-90')}
        />
        <span className="shrink-0 text-ink">{label}</span>
        {open ? null : (
          <span aria-hidden="true" className="line-clamp-2 min-w-0">
            {rows.map((r, i) => (
              <span key={r.key}>
                {i > 0 ? ' · ' : null}
                {r.habit ? <span className="text-crimson">{r.habit}</span> : null}
                {r.habit ? <span className="mx-1">→</span> : null}
                {r.fix}
              </span>
            ))}
          </span>
        )}
      </button>
      {open ? (
        <ul id={listId} className="pb-2 pl-6">
          {rows.map((r) => (
            <li key={r.key} className="border-t border-line first:border-t-0">
              <Pair row={r} to={`/notes/${r.note.id}`} linkState={{ ids, from: linkFrom }} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** "Not yet repeated": error types whose habits were seen once. Each type block carries its anchor id. */
export function OnceList(props: { groups: OnceGroup[]; linkFrom: string }): React.JSX.Element {
  const { groups, linkFrom } = props
  const ids = groups.flatMap((g) => g.rows.map((r) => r.note.id))
  return (
    <div className="mt-1">
      {groups.map((g) => (
        <ul key={g.slug} id={g.slug} aria-label={g.error_type} className="scroll-mt-20">
          {g.rows.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-1 items-baseline border-b border-line sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-6"
            >
              {i === 0 ? (
                <span className="pt-3 text-small text-graphite sm:py-3">{g.error_type}</span>
              ) : (
                <span className="hidden sm:block" aria-hidden="true" />
              )}
              <Pair row={r} to={`/notes/${r.note.id}`} linkState={{ ids, from: linkFrom }} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}
