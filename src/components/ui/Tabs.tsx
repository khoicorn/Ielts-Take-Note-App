import React, { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Mode } from '@/lib/types'
import { cn } from './cn'
import { ICON_STROKE, type IconType } from './icons'

export interface TabItem {
  value: string
  label: string
  to?: string
  count?: number
  /** A small glyph before the label (mockup m01 mode tabs). */
  icon?: IconType
}

/** Moves focus (and selection, for tablists) with the arrow keys. */
function arrowNav(e: React.KeyboardEvent, index: number, count: number): number | null {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') return (index + 1) % count
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') return (index - 1 + count) % count
  if (e.key === 'Home') return 0
  if (e.key === 'End') return count - 1
  return null
}

/**
 * Brief §4: plain text tabs. Active = ink text and a 2px brass underline that draws in from the left (200ms,
 * design v1.2) each time a tab becomes active. Inactive = graphite. No pills.
 * Items with `to` render as links (aria-current) inside a nav.
 */
export function UnderlineTabs(props: {
  items: TabItem[]
  value: string
  onChange?: (v: string) => void
  'aria-label': string
  size?: 'md' | 'lg'
  className?: string
}): React.JSX.Element {
  const { items, value, onChange, size = 'md', className } = props
  const listRef = useRef<HTMLDivElement>(null)
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null)
  const isNav = items.some((i) => i.to)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const el = list.querySelector<HTMLElement>('[data-active="true"] [data-tab-label]')
      if (!el) return setBar(null)
      const parent = list.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      setBar({ x: r.left - parent.left + list.scrollLeft, w: r.width })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(list)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro?.disconnect()
  }, [value, items])

  const focusTab = (i: number) => {
    const el = listRef.current?.querySelectorAll<HTMLElement>('[data-tab]')[i]
    el?.focus()
    return el
  }

  const tabClass = cn(
    'relative inline-flex shrink-0 cursor-pointer items-baseline gap-1.5 pt-1 pb-2.5 whitespace-nowrap transition-colors duration-150',
    'text-graphite hover:text-ink data-[active=true]:text-ink max-sm:min-h-11',
    size === 'lg' ? 'text-body-lg' : 'text-body',
  )

  const content = (item: TabItem) => (
    <>
      {item.icon ? <item.icon className="size-4 shrink-0 self-center" strokeWidth={ICON_STROKE} aria-hidden="true" /> : null}
      <span data-tab-label="">{item.label}</span>
      {item.count !== undefined ? <span className="text-meta text-graphite tabular-nums">{item.count}</span> : null}
    </>
  )

  const list = (
    <div
      ref={listRef}
      role={isNav ? undefined : 'tablist'}
      aria-label={isNav ? undefined : props['aria-label']}
      className={cn(
        'relative flex overflow-x-auto border-b border-line [scrollbar-width:none]',
        size === 'lg' ? 'gap-8' : 'gap-6',
        !isNav && className,
      )}
    >
      {items.map((item, i) => {
        const active = item.value === value
        const onKeyDown = (e: React.KeyboardEvent) => {
          const next = arrowNav(e, i, items.length)
          if (next === null) return
          e.preventDefault()
          focusTab(next)
          if (!isNav) onChange?.(items[next].value)
        }
        return item.to ? (
          <Link
            key={item.value}
            to={item.to}
            data-tab=""
            data-active={active}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange?.(item.value)}
            onKeyDown={onKeyDown}
            className={tabClass}
          >
            {content(item)}
          </Link>
        ) : (
          <button
            key={item.value}
            type="button"
            role="tab"
            data-tab=""
            data-active={active}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange?.(item.value)}
            onKeyDown={onKeyDown}
            className={tabClass}
          >
            {content(item)}
          </button>
        )
      })}
      {bar ? (
        // Keyed on the active value: a new tab mounts a new bar, so the draw-in plays again. Placed with `left`,
        // because the animation owns `transform` (scaleX). Re-measuring (resize, fonts) moves it without a replay.
        <span
          key={value}
          aria-hidden="true"
          data-tab-underline=""
          className="pointer-events-none absolute bottom-0 h-0.5 origin-left animate-draw bg-brass"
          style={{ left: bar.x, width: bar.w }}
        />
      ) : null}
    </div>
  )

  return isNav ? (
    <nav aria-label={props['aria-label']} className={className}>
      {list}
    </nav>
  ) : (
    list
  )
}

/** Speaking / Writing switch at the top of notebook screens (brief §4). */
export function ModeTabs(props: { value: Mode; className?: string }): React.JSX.Element {
  return (
    <UnderlineTabs
      aria-label="Notebook"
      size="lg"
      value={props.value}
      className={props.className}
      items={[
        { value: 'speaking', label: 'Speaking', to: '/speaking' },
        { value: 'writing', label: 'Writing', to: '/writing' },
      ]}
    />
  )
}

export function SegmentedControl<T extends string>(props: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: IconType }[]
  'aria-label': string
  className?: string
}): React.JSX.Element {
  const { value, onChange, options, className } = props
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={props['aria-label']}
      className={cn('inline-flex shrink-0 rounded-sm border border-line-strong bg-paper p-0.5', className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const next = arrowNav(e, i, options.length)
              if (next === null) return
              e.preventDefault()
              onChange(options[next].value)
              ref.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
            }}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-xs px-3 text-small whitespace-nowrap transition-colors duration-150 max-sm:h-11',
              // Selected: a stone surface with a faint brass edge (design v1.2). Text is ink, never graphite on stone.
              selected
                ? 'bg-stone text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--gold)_32%,transparent)]'
                : 'text-graphite hover:text-ink',
            )}
          >
            {Icon ? <Icon className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" /> : null}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
