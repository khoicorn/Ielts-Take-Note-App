import type React from 'react'
import { cn } from './cn'
import { SparkIcon } from './icons'

/** A titled block with a hairline under the heading (journal style, no box). Spacing is set by the caller. */
export function Section(props: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  id?: string
  /** A tiny gold ✦ before the title. At most one per screen (owner refinement 2026-10-08). */
  mark?: boolean
}): React.JSX.Element {
  const { title, action, children, className, id, mark } = props
  return (
    <section id={id} className={cn('scroll-mt-20', className)} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {title || action ? (
        <div className="mb-1 flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
          {title ? (
            <h2 id={id ? `${id}-title` : undefined} className="font-serif text-section font-normal text-ink">
              {mark ? <SparkIcon aria-hidden="true" className="mr-1.5 inline-block size-2.5 -translate-y-px fill-current stroke-none align-middle text-gold" /> : null}
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action ? <div className="shrink-0 text-small">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
