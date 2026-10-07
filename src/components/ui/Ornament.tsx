import type React from 'react'
import { cn } from './cn'
import { SparkIcon } from './icons'

/** A short centered rule: hairline — ✦ — hairline, with the symbol in antique gold. Decorative only. */
export function Ornament(props: { className?: string; symbol?: string }): React.JSX.Element {
  const { className, symbol } = props
  return (
    <div aria-hidden="true" className={cn('flex items-center justify-center gap-3 text-gold', className)}>
      <span className="h-px max-w-20 flex-1 bg-line-strong" />
      {symbol && symbol !== '✦' ? (
        <span className="text-small leading-none">{symbol}</span>
      ) : (
        <SparkIcon className="size-2.5 fill-current stroke-none" />
      )}
      <span className="h-px max-w-20 flex-1 bg-line-strong" />
    </div>
  )
}

/** A plain hairline separator. */
export function Divider(props: { className?: string }): React.JSX.Element {
  return <hr className={cn('h-px border-0 bg-line', props.className)} />
}
