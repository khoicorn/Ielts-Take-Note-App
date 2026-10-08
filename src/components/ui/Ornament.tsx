import type React from 'react'
import { cn } from './cn'
import { CrescentIcon, SparkIcon } from './icons'

export type OrnamentVariant = 'star' | 'moon' | 'constellation'

/* Brass hairlines that fade out toward the ends (gold at 55% by day, 38% by night). */
const LINE_IN = 'h-px max-w-28 flex-1 bg-linear-to-r from-transparent to-gold/55 dark:to-gold/38'
const LINE_OUT = 'h-px max-w-28 flex-1 bg-linear-to-r from-gold/55 to-transparent dark:from-gold/38'
const DOT = 'size-[3px] rounded-full bg-gold opacity-70'

/**
 * A short centered celestial rule (owner refinement 2026-10-08, design v1.2). Decorative only. Use at most one
 * per screen area. Everything is brass (the decorative `gold` token); lavender is retired.
 * - star: hairline — ✦ — hairline (section break)
 * - moon: hairline — crescent — hairline (end of a page or session)
 * - constellation: hairline · ✦ · hairline, with two small brass dots (quiet celestial divider)
 */
export function Ornament(props: { className?: string; symbol?: string; variant?: OrnamentVariant }): React.JSX.Element {
  const { className, symbol, variant = 'star' } = props
  const center =
    symbol && symbol !== '✦' ? (
      <span className="text-small leading-none">{symbol}</span>
    ) : variant === 'moon' ? (
      <CrescentIcon className="size-3.5" strokeWidth={1.25} />
    ) : (
      <SparkIcon className="size-[11px] fill-current stroke-none" />
    )
  return (
    <div aria-hidden="true" className={cn('flex items-center justify-center gap-3 text-gold', className)}>
      <span className={LINE_IN} />
      {variant === 'constellation' ? <span className={DOT} /> : null}
      {center}
      {variant === 'constellation' ? <span className={DOT} /> : null}
      <span className={LINE_OUT} />
    </div>
  )
}

/** A plain hairline separator. */
export function Divider(props: { className?: string }): React.JSX.Element {
  return <hr className={cn('h-px border-0 bg-line', props.className)} />
}
