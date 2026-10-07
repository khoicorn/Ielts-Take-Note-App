import type React from 'react'
import { cn } from './cn'
import { SparkIcon } from './icons'

/**
 * Must Remember marker (brief §29): a small antique-gold four-point star.
 * With onToggle it is a toggle button (outline graphite → filled gold, 180ms).
 * Without onToggle it is a static mark, shown only when active.
 */
export function FavoriteStar(props: { active: boolean; onToggle?: () => void; className?: string }): React.JSX.Element {
  const { active, onToggle, className } = props
  if (!onToggle) {
    if (!active) return <></>
    return (
      <span role="img" aria-label="Must remember" title="Must remember" className={cn('inline-flex text-gold', className)}>
        <SparkIcon className="size-3.5 fill-current" strokeWidth={1.25} />
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label="Must remember"
      title={active ? 'Remove from Must Remember' : 'Add to Must Remember'}
      onClick={onToggle}
      className={cn(
        'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors duration-180 max-sm:size-11',
        active ? 'text-gold hover:bg-stone' : 'text-graphite hover:bg-stone hover:text-ink',
        className,
      )}
    >
      <SparkIcon
        className={cn('size-[1.125rem] transition-[fill,color] duration-180', active ? 'fill-current' : 'fill-transparent')}
      />
    </button>
  )
}
