import { ChevronRight, Plus } from 'lucide-react'
import type React from 'react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { cn } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'
import { plural } from './notebook'

export interface TopicIndexItem {
  key: string
  label: string
  count: number
}

export interface TopicIndexProps {
  /** Accessible name, e.g. "Speaking topics". */
  label: string
  allCount: number
  items: TopicIndexItem[]
  /** Known topics without notes. Shown collapsed under "N empty topics". */
  empty: string[]
  /** Key of the selected topic (lowercase), or null for "All topics". */
  selected: string | null
  hrefFor: (topic: string | null) => string
}

const ITEM = cn(
  'relative flex h-8 items-center justify-between gap-3 rounded-sm pr-2 pl-3 text-small transition-colors duration-150',
  'hover:bg-stone/60 hover:text-ink',
)
const ACTIVE_BAR = 'before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brass'

/**
 * Sticky topic index beside the notebook at 1024px and wider (mockup 16): "All topics", topics with notes
 * (most notes first), then the empty default topics, collapsed. Same look as the sidebar nav, one size smaller.
 */
export function TopicIndex(props: TopicIndexProps): React.JSX.Element {
  const { label, allCount, items, empty, selected, hrefFor } = props
  const selectedEmpty = selected !== null && !items.some((i) => i.key === selected)
  const [showEmpty, setShowEmpty] = useState(selectedEmpty)
  const emptyId = useId()
  const link = (to: string, text: string, count: number | null, active: boolean, quiet = false) => (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(ITEM, active ? cn('text-ink', ACTIVE_BAR) : quiet ? 'text-graphite' : 'text-ink')}
    >
      <span className="truncate">{text}</span>
      {count !== null ? <span className="text-meta text-graphite tabular-nums">{count}</span> : null}
    </Link>
  )
  return (
    <nav aria-label={label} className="sticky top-8">
      <div className="mb-1">{link(hrefFor(null), 'All topics', allCount, selected === null)}</div>
      <ul>
        {items.map((it) => (
          <li key={it.key}>{link(hrefFor(it.label), it.label, it.count, it.key === selected)}</li>
        ))}
      </ul>
      {empty.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={showEmpty}
            aria-controls={emptyId}
            onClick={() => setShowEmpty((v) => !v)}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-sm px-2 text-small text-graphite transition-colors duration-150 hover:text-ink"
          >
            <ChevronRight
              className={cn('size-3.5 transition-transform duration-150', showEmpty && 'rotate-90')}
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
            />
            {plural(empty.length, 'empty topic')}
          </button>
          {showEmpty ? (
            <ul id={emptyId} className="mt-1">
              {empty.map((t) => (
                <li key={t}>{link(hrefFor(t), t, null, t.toLowerCase() === selected, true)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <Link
        to="/settings#topics"
        className="mt-1 inline-flex h-8 items-center gap-2 rounded-sm px-3 text-small text-indigo transition-colors duration-150 hover:bg-stone/60"
      >
        <Plus className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
        Add a topic
      </Link>
    </nav>
  )
}

/**
 * The same index under 1024px: one line of topic links that scrolls sideways inside itself
 * (the page never scrolls sideways). Empty topics are left out to keep it short.
 */
export function TopicStrip(props: Omit<TopicIndexProps, 'empty'> & { selectedLabel?: string }): React.JSX.Element | null {
  const { label, allCount, items, selected, hrefFor, selectedLabel } = props
  if (items.length < 2 && selected === null) return null
  const selectedExtra = selected !== null && !items.some((i) => i.key === selected)
  const link = (key: string, to: string, text: string, count: number | null, active: boolean) => (
    <li key={key} className="shrink-0">
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-small whitespace-nowrap transition-colors duration-150 hover:bg-stone/60 max-sm:min-h-11',
          active
            ? 'text-ink after:absolute after:inset-x-2.5 after:bottom-1 after:h-0.5 after:bg-brass max-sm:after:bottom-2'
            : 'text-graphite hover:text-ink',
        )}
      >
        {text}
        {count !== null ? <span className="text-meta text-graphite tabular-nums">{count}</span> : null}
      </Link>
    </li>
  )
  return (
    <nav aria-label={label} className="-mx-4 mb-6 sm:-mx-2">
      <ul className="flex overflow-x-auto px-2 [scrollbar-width:none] sm:px-0">
        {link('all', hrefFor(null), 'All topics', allCount, selected === null)}
        {items.map((it) => link(it.key, hrefFor(it.label), it.label, it.count, it.key === selected))}
        {selectedExtra ? link(selected, hrefFor(selectedLabel ?? selected), selectedLabel ?? selected, 0, true) : null}
      </ul>
    </nav>
  )
}
