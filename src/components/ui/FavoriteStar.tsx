import type React from 'react'
import { cn } from './cn'
import { RibbonIcon } from './icons'

function Ribbon(props: { active: boolean; className?: string }): React.JSX.Element {
  return (
    <RibbonIcon
      aria-hidden="true"
      className={cn(
        'shrink-0 transition-[fill,color] duration-180',
        props.active ? 'fill-current text-gold' : 'fill-transparent text-graphite',
        props.className,
      )}
    />
  )
}

/** "▮ Must Remember": the static gold ribbon with its word (brief §39), for meta lines and legends. */
export function MustRememberMark(props: { className?: string }): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-small whitespace-nowrap text-graphite', props.className)}>
      <RibbonIcon aria-hidden="true" className="size-3.5 shrink-0 fill-current text-gold" strokeWidth={1.25} />
      Must Remember
    </span>
  )
}

/**
 * Must Remember marker: a slim antique-gold book ribbon (owner refinement 2026-10-08; brief §29 used ✦,
 * which clashed with ✦ Mastered). The component keeps its name for API stability.
 * With onToggle it is a toggle button (outline graphite → filled gold, 180ms).
 * Without onToggle it is a static mark, shown only when active.
 *
 * With `label`, the toggle shows its word next to the ribbon (mockups 03, 08, 09). The state is also in
 * aria-pressed, so it is never shown by color alone.
 * - variant "ghost" (default): a quiet header action. Under 640px the word is for screen readers only.
 * - variant "field": a bordered control for forms (Quick Add, edit mode).
 */
export function FavoriteStar(props: {
  active: boolean
  onToggle?: () => void
  className?: string
  label?: string
  variant?: 'ghost' | 'field'
}): React.JSX.Element {
  const { active, onToggle, className, label, variant = 'ghost' } = props
  if (!onToggle) {
    if (!active) return <></>
    return (
      <span role="img" aria-label="Must Remember" title="Must Remember" className={cn('inline-flex text-gold', className)}>
        <RibbonIcon className="size-3.5 fill-current" strokeWidth={1.25} />
      </span>
    )
  }
  const title = active ? 'Remove from Must Remember' : 'Add to Must Remember'
  if (label) {
    return (
      <button
        type="button"
        aria-pressed={active}
        title={title}
        onClick={onToggle}
        className={cn(
          'inline-flex shrink-0 cursor-pointer items-center rounded-sm text-small text-ink',
          variant === 'field'
            ? cn(
                'h-8.5 gap-2 border bg-paper pr-3.5 pl-2.5 transition-[background-color,border-color] duration-180 hover:bg-stone/40 max-sm:min-h-11',
                active ? 'border-gold/60' : 'border-line-strong',
              )
            : 'h-8 gap-1.5 px-2.5 transition-colors duration-150 hover:bg-stone max-sm:min-h-11 max-sm:min-w-11 max-sm:justify-center max-sm:px-0',
          className,
        )}
      >
        <Ribbon active={active} className="size-4" />
        <span className={variant === 'ghost' ? 'max-sm:sr-only' : undefined}>{label}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label="Must Remember"
      title={title}
      onClick={onToggle}
      className={cn(
        'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors duration-180 max-sm:size-11',
        active ? 'text-gold hover:bg-stone' : 'text-graphite hover:bg-stone hover:text-ink',
        className,
      )}
    >
      <RibbonIcon
        className={cn('size-[1.125rem] transition-[fill,color] duration-180', active ? 'fill-current' : 'fill-transparent')}
      />
    </button>
  )
}
