import type React from 'react'
import { cn } from './cn'
import { CrescentIcon, SparkIcon } from './icons'

export type OrnamentVariant = 'star' | 'moon' | 'constellation'

/**
 * A short centered celestial rule (owner refinement 2026-10-08). Decorative only. Use at most one per screen area.
 * - star: hairline — ✦ — hairline (section break)
 * - moon: hairline — crescent — hairline (end of a page or session)
 * - constellation: hairline · ✦ · hairline, the dots in muted lavender (quiet celestial divider)
 */
export function Ornament(props: { className?: string; symbol?: string; variant?: OrnamentVariant }): React.JSX.Element {
  const { className, symbol, variant = 'star' } = props
  const center =
    symbol && symbol !== '✦' ? (
      <span className="text-small leading-none">{symbol}</span>
    ) : variant === 'moon' ? (
      <CrescentIcon className="size-3.5" strokeWidth={1.25} />
    ) : (
      <SparkIcon className="size-2.5 fill-current stroke-none" />
    )
  return (
    <div aria-hidden="true" className={cn('flex items-center justify-center gap-3 text-gold', className)}>
      <span className="h-px max-w-20 flex-1 bg-line-strong" />
      {variant === 'constellation' ? <span className="size-[3px] rounded-full bg-lavender" /> : null}
      {center}
      {variant === 'constellation' ? <span className="size-[3px] rounded-full bg-lavender" /> : null}
      <span className="h-px max-w-20 flex-1 bg-line-strong" />
    </div>
  )
}

/** A plain hairline separator. */
export function Divider(props: { className?: string }): React.JSX.Element {
  return <hr className={cn('h-px border-0 bg-line', props.className)} />
}
