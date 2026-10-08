import type React from 'react'
import { useEffect, useState } from 'react'
import { BRASS_RULE, SMALL_CAPS } from '@/components/ui/candlelit'
import { cn } from '@/components/ui/cn'

export interface IndexItem {
  slug: string
  label: string
  count: number
}

/**
 * Tracks which ledger section is at the top of the screen, so the index can mark it.
 * Without IntersectionObserver (tests, old browsers) the first section stays marked.
 */
function useActiveSection(slugs: string[]): string | undefined {
  const key = slugs.join('|')
  const [active, setActive] = useState<string | undefined>(slugs[0])
  useEffect(() => {
    setActive(slugs[0])
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        }
        const first = slugs.find((s) => visible.has(s))
        if (first) setActive(first)
      },
      { rootMargin: '-72px 0px -55% 0px' },
    )
    for (const s of slugs) {
      const el = document.getElementById(s)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
    // `key` stands for `slugs`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return active
}

function IndexList(props: { label: string; items: IndexItem[]; active?: string }): React.JSX.Element | null {
  const { label, items, active } = props
  if (items.length === 0) return null
  return (
    <div className="mb-5">
      {/* Like the sidebar groups: italic small caps, then a brass hairline to the edge (design v1.2). */}
      <p className={cn('mb-1.5 flex items-center gap-2.5 pr-2 pl-3', SMALL_CAPS)}>
        {label}
        <span aria-hidden="true" className={cn('h-px flex-1', BRASS_RULE)} />
      </p>
      <ul>
        {items.map((it) => {
          const isActive = it.slug === active
          return (
            <li key={it.slug}>
              <a
                href={`#${it.slug}`}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'relative flex h-8 items-center justify-between gap-3 rounded-sm pr-2 pl-3 text-small transition-colors duration-150',
                  'hover:bg-stone/60 hover:text-ink',
                  isActive
                    ? 'text-ink before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brass'
                    : 'text-graphite',
                )}
              >
                <span className="truncate">{it.label}</span>
                <span className="text-meta text-graphite tabular-nums">{it.count}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Sticky index of error types beside the ledger (≥1024px). Mockup 15. */
export function LedgerIndex(props: { repeated: IndexItem[]; once: IndexItem[] }): React.JSX.Element {
  const { repeated, once } = props
  const active = useActiveSection([...repeated, ...once].map((i) => i.slug))
  return (
    <nav aria-label="Error types" className="sticky top-8 pt-0.5">
      <IndexList label="Repeated" items={repeated} active={active} />
      <IndexList label="Not yet repeated" items={once} active={active} />
    </nav>
  )
}

/** One labeled group of the inline index: "Repeated" or "Not yet repeated", as on the desktop index. */
function InlineGroup(props: { label: string; items: IndexItem[] }): React.JSX.Element | null {
  const { label, items } = props
  if (items.length === 0) return null
  return (
    <div>
      <p className={cn('mb-0.5 flex items-center gap-2.5', SMALL_CAPS)}>
        {label}
        <span aria-hidden="true" className={cn('h-px flex-1', BRASS_RULE)} />
      </p>
      <ul className="-ml-2 flex flex-wrap gap-x-1 gap-y-0.5">
        {items.map((it) => (
          <li key={it.slug}>
            <a
              href={`#${it.slug}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-small text-graphite transition-colors duration-150 hover:bg-stone/60 hover:text-ink max-sm:min-h-11"
            >
              {it.label}
              <span className="text-meta tabular-nums">{it.count}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The same index below 1024px: the two groups, each a labeled, wrapped line of links above the ledger. */
export function LedgerIndexInline(props: { repeated: IndexItem[]; once: IndexItem[] }): React.JSX.Element | null {
  const { repeated, once } = props
  if (repeated.length + once.length < 2) return null
  return (
    <nav aria-label="Error types" className="mb-8 space-y-2">
      <InlineGroup label="Repeated" items={repeated} />
      <InlineGroup label="Not yet repeated" items={once} />
    </nav>
  )
}
