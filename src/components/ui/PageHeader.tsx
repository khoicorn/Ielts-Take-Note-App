import type React from 'react'
import { SMALL_CAPS, SMALL_CAPS_QUIET, TITLE_INITIAL } from './candlelit'
import { cn } from './cn'
import { SparkIcon } from './icons'

export type EyebrowTone = 'plum' | 'graphite' | 'rubric' | 'rubric-quiet'

const EYEBROW: Record<EyebrowTone, string> = {
  plum: 'font-serif text-note italic text-plum',
  graphite: 'font-serif text-note italic text-graphite',
  // Design v1.2 italic small caps (garnet by day, sand by night), as on Today's kicker.
  rubric: SMALL_CAPS,
  'rubric-quiet': SMALL_CAPS_QUIET,
}

/**
 * Page title block: an optional decorative eyebrow ("Error Ledger"), the serif title, a short description,
 * actions on the right, and a slot for tabs below.
 * Design v1.2: the title is 36px and its first letter is a rubric initial (garnet by day, brass by night).
 */
export function PageHeader(props: {
  title: string
  eyebrow?: string
  /** Eyebrow style. Plum italic serif by default; graphite for a quieter label; rubric for italic small caps. */
  eyebrowTone?: EyebrowTone
  /** A tiny brass ✦ before the eyebrow. Use on at most one heading per screen (owner refinement 2026-10-08). */
  mark?: boolean
  /** Set false to drop the rubric initial (a title that starts with a number or a quote). */
  initial?: boolean
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}): React.JSX.Element {
  const { title, eyebrow, eyebrowTone = 'plum', mark, initial = true, description, actions, children, className } = props
  return (
    <header className={cn('mb-8 sm:mb-10', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className={cn('mb-1', EYEBROW[eyebrowTone])}>
              {mark ? <SparkIcon aria-hidden="true" className="mr-1.5 inline-block size-2.5 -translate-y-px fill-current stroke-none align-middle text-brass" /> : null}
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn('font-serif text-title font-normal tracking-[-0.01em] text-ink', initial && TITLE_INITIAL)}
          >
            {title}
          </h1>
          {description ? <p className="mt-2 max-w-[62ch] text-body text-graphite">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  )
}
