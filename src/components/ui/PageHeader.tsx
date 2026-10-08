import type React from 'react'
import { cn } from './cn'
import { SparkIcon } from './icons'

/**
 * Page title block: an optional decorative italic serif eyebrow ("Error Ledger"),
 * the serif title, a short description, actions on the right, and a slot for tabs below.
 */
export function PageHeader(props: {
  title: string
  eyebrow?: string
  /** Eyebrow color. Plum by default; graphite for a quieter label. */
  eyebrowTone?: 'plum' | 'graphite'
  /** A tiny gold ✦ before the eyebrow. Use on at most one heading per screen (owner refinement 2026-10-08). */
  mark?: boolean
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}): React.JSX.Element {
  const { title, eyebrow, eyebrowTone = 'plum', mark, description, actions, children, className } = props
  return (
    <header className={cn('mb-8 sm:mb-10', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className={cn('mb-1 font-serif text-note italic', eyebrowTone === 'plum' ? 'text-plum' : 'text-graphite')}>
              {mark ? <SparkIcon aria-hidden="true" className="mr-1.5 inline-block size-2.5 -translate-y-px fill-current stroke-none align-middle text-gold" /> : null}
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-serif text-title font-normal tracking-[-0.005em] text-ink">{title}</h1>
          {description ? <p className="mt-2 max-w-[62ch] text-body text-graphite">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  )
}
