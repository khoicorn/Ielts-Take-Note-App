import { Plus, Search } from 'lucide-react'
import type React from 'react'
import { Link, NavLink } from 'react-router'
import { useDueCounts, useStudyStreak } from '@/lib/hooks'
import { BRASS_RULE, SMALL_CAPS } from '@/components/ui/candlelit'
import { cn } from '@/components/ui/cn'
import { BrandMark, ICON_STROKE } from '@/components/ui/icons'
import { Kbd, modLabel } from '@/components/ui/Kbd'
import { Tooltip } from '@/components/ui/Tooltip'
import { NAV_GROUPS, navItem, SETTINGS_ITEM, type NavItem } from './nav'
import { useQuickAdd, useSearch } from './overlays'

/** "10 days of consistent study." Shown only from 2 days (brief §36). */
export function streakText(days: number | undefined): string | null {
  return days !== undefined && days >= 2 ? `${days} days of consistent study.` : null
}

export function Wordmark(props: { className?: string; compact?: boolean }): React.JSX.Element {
  return (
    <Link
      to="/"
      aria-label="Upgrade Notebook, Today"
      className={cn('inline-flex items-center gap-2.5 rounded-sm text-ink', props.className)}
    >
      <BrandMark className="size-[1.375rem] shrink-0 text-indigo" />
      {props.compact ? null : (
        <span className="font-serif text-[1.375rem] leading-none tracking-[-0.005em] whitespace-nowrap">
          Upgrade Notebook
        </span>
      )}
    </Link>
  )
}

/* ---------- full sidebar (≥1024px) ---------- */

export function SidebarLink(props: { item: NavItem; count?: number; onNavigate?: () => void }): React.JSX.Element {
  const { item, count, onNavigate } = props
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      // aria-label on a plain span is not read out, so the link itself carries "Review, 6 due".
      aria-label={count ? `${item.label}, ${count} due` : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-sm pr-2.5 pl-3 text-body transition-colors duration-150 focus-visible:outline-offset-[-2px] max-sm:h-11',
          // Active: a faint lit surface (paper by day, stone by night) and a 2px brass bar (design v1.2).
          isActive ? 'bg-paper/55 text-ink dark:bg-stone/70' : 'text-graphite hover:bg-stone/60 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-[7px] bottom-[7px] left-0 w-0.5 rounded-full bg-brass transition-opacity duration-180',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon
            className={cn('size-[1.125rem] shrink-0', isActive ? 'text-indigo' : 'text-graphite group-hover:text-ink')}
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.label}</span>
          {count ? (
            <span className="text-meta text-graphite tabular-nums" aria-hidden="true">
              {count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

/** The full navigation list, also used by the mobile menu sheet. */
export function NavList(props: { onNavigate?: () => void; reviewCount?: number }): React.JSX.Element {
  return (
    <div className="flex flex-col">
      {NAV_GROUPS.map((g, gi) => (
        <div key={gi} className={gi > 0 ? 'mt-5' : undefined}>
          {g.label ? (
            // Like a book's table of contents: italic small caps, then a brass hairline to the edge.
            <p className={cn('mb-1.5 flex items-center gap-2.5 pr-2 pl-3', SMALL_CAPS)} aria-hidden="true">
              {g.label}
              <span className={cn('h-px flex-1', BRASS_RULE)} />
            </p>
          ) : null}
          <ul className="flex flex-col gap-px">
            {g.keys.map((k) => (
              <li key={k}>
                <SidebarLink
                  item={navItem(k)}
                  count={k === 'review' ? props.reviewCount : undefined}
                  onNavigate={props.onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function FullSidebar(props: { style?: React.CSSProperties }): React.JSX.Element {
  const quickAdd = useQuickAdd()
  const search = useSearch()
  const due = useDueCounts()
  const streak = streakText(useStudyStreak())
  return (
    <aside
      style={props.style}
      className="fixed inset-y-0 left-0 z-30 flex w-58 flex-col border-r border-line px-3 pt-6 pb-4"
    >
      <div className="px-2 pb-6">
        <Wordmark />
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => quickAdd.open()}
          className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-sm border border-line-strong bg-paper pr-2 pl-3 text-body text-ink transition-colors duration-150 hover:bg-stone/60"
        >
          <Plus className="size-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span className="flex-1 text-left">New note</span>
          <Kbd>N</Kbd>
        </button>
        <button
          type="button"
          onClick={() => search.open()}
          className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-sm pr-2 pl-3 text-body text-graphite transition-colors duration-150 hover:bg-stone/60 hover:text-ink"
        >
          <Search className="size-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span className="flex-1 text-left">Search</span>
          <span className="inline-flex gap-1" aria-hidden="true">
            <Kbd>{modLabel()}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>
      <nav aria-label="Main" className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <NavList reviewCount={due?.total} />
      </nav>
      <div className="mt-4 border-t border-line pt-3">
        <SidebarLink item={SETTINGS_ITEM} />
        {streak ? <p className="mt-2 px-3 text-meta text-graphite">{streak}</p> : null}
      </div>
    </aside>
  )
}

/* ---------- icon rail (640–1023px) ---------- */

function RailItem(props: { item: NavItem; count?: number }): React.JSX.Element {
  const { item, count } = props
  const Icon = item.icon
  const label = count ? `${item.label} · ${count} due` : item.label
  return (
    <Tooltip label={label} side="right">
      <NavLink
        to={item.to}
        end={item.end}
        aria-label={label}
        className={({ isActive }) =>
          cn(
            'group relative flex h-11 w-16 items-center justify-center rounded-sm focus-visible:outline-offset-[-4px]',
            isActive ? 'text-indigo' : 'text-graphite hover:text-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-r-full bg-brass transition-opacity duration-180',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
            />
            <span
              className={cn(
                'relative flex size-10 items-center justify-center rounded-sm transition-colors duration-150',
                isActive ? 'bg-paper/55 dark:bg-stone/70' : 'group-hover:bg-stone/60',
              )}
            >
              <Icon className="size-5" strokeWidth={ICON_STROKE} aria-hidden="true" />
              {count ? (
                <span aria-hidden="true" className="absolute top-0.5 right-0 text-meta leading-none text-graphite tabular-nums">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </span>
          </>
        )}
      </NavLink>
    </Tooltip>
  )
}

function RailButton(props: { label: string; onClick: () => void; children: React.ReactNode; strong?: boolean }): React.JSX.Element {
  return (
    <Tooltip label={props.label} side="right">
      <button
        type="button"
        aria-label={props.label}
        onClick={props.onClick}
        className={cn(
          'flex size-10 cursor-pointer items-center justify-center rounded-sm transition-colors duration-150',
          props.strong
            ? 'border border-line-strong bg-paper text-ink hover:bg-stone/60'
            : 'text-graphite hover:bg-stone/60 hover:text-ink',
        )}
      >
        {props.children}
      </button>
    </Tooltip>
  )
}

function Rail(props: { style?: React.CSSProperties }): React.JSX.Element {
  const quickAdd = useQuickAdd()
  const search = useSearch()
  const due = useDueCounts()
  return (
    <aside
      style={props.style}
      className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center border-r border-line pt-5 pb-3"
    >
      <Wordmark compact className="mb-5 p-2" />
      <div className="flex flex-col items-center gap-1.5">
        <RailButton label="New note (N)" onClick={() => quickAdd.open()} strong>
          <Plus className="size-[1.125rem]" strokeWidth={ICON_STROKE} aria-hidden="true" />
        </RailButton>
        <RailButton label={`Search (${modLabel()} K)`} onClick={() => search.open()}>
          <Search className="size-[1.125rem]" strokeWidth={ICON_STROKE} aria-hidden="true" />
        </RailButton>
      </div>
      <div className={cn('my-4 h-px w-8', BRASS_RULE)} aria-hidden="true" />
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
        <ul className="flex flex-col">
          {NAV_GROUPS.flatMap((g) => g.keys).map((k) => (
            <li key={k}>
              <RailItem item={navItem(k)} count={k === 'review' ? due?.total : undefined} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-3 border-t border-line pt-2">
        <RailItem item={SETTINGS_ITEM} />
      </div>
    </aside>
  )
}

export function Sidebar(props: { variant?: 'full' | 'rail'; style?: React.CSSProperties }): React.JSX.Element {
  return props.variant === 'rail' ? <Rail style={props.style} /> : <FullSidebar style={props.style} />
}
