import type React from 'react'
import { useState } from 'react'
import { cn } from './cn'
import { RibbonIcon } from './icons'

/**
 * Must Remember is a garnet silk ribbon (design v1.2; it replaces the gold ribbon of v1.1).
 * By day: garnet fill and edge. By night: deep wine fill with a gilt edge, so it never reads like the
 * rose-colored mistake text. Garnet is never text in dark mode; here it is only a fill.
 */
export const RIBBON_ON = 'fill-garnet text-garnet dark:text-gold'
const RIBBON_OFF = 'fill-transparent text-graphite'

/**
 * True right after `active` turns on (not on mount), until it turns off. Drives the 2px ribbon drop
 * (animate-ribbon, 180ms): the class is added when the note is marked, so the drop plays once per mark.
 * State is adjusted during render (React's pattern for "derive from the previous prop"), so there is no flash.
 */
function useJustMarked(active: boolean): boolean {
  const [last, setLast] = useState(active)
  const [drop, setDrop] = useState(false)
  if (last !== active) {
    setLast(active)
    setDrop(active)
  }
  return drop
}

function Ribbon(props: { active: boolean; drop: boolean; className?: string; offClass?: string }): React.JSX.Element {
  return (
    <RibbonIcon
      aria-hidden="true"
      data-ribbon={props.active ? 'on' : 'off'}
      className={cn(
        'shrink-0 transition-[fill,color] duration-180',
        props.active ? RIBBON_ON : (props.offClass ?? RIBBON_OFF),
        props.drop && 'animate-ribbon',
        props.className,
      )}
    />
  )
}

/** "▮ Must Remember": the static garnet ribbon with its word (brief §39), for meta lines and legends. */
export function MustRememberMark(props: { className?: string }): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-small whitespace-nowrap text-graphite', props.className)}>
      <RibbonIcon aria-hidden="true" data-ribbon="on" className={cn('size-3.5 shrink-0', RIBBON_ON)} strokeWidth={1.25} />
      Must Remember
    </span>
  )
}

/**
 * Must Remember marker: a slim garnet silk ribbon (owner refinement 2026-10-08, design v1.2; brief §29 used ✦,
 * which clashed with ✦ Mastered). The component keeps its name for API stability.
 * With onToggle it is a toggle button (outline graphite → filled garnet, 180ms, and the ribbon drops 2px).
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
  const drop = useJustMarked(active)
  if (!onToggle) {
    if (!active) return <></>
    return (
      <span role="img" aria-label="Must Remember" title="Must Remember" className={cn('inline-flex', className)}>
        <RibbonIcon data-ribbon="on" className={cn('size-3.5', RIBBON_ON)} strokeWidth={1.25} />
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
                active ? 'border-garnet/45 dark:border-gold/50' : 'border-line-strong',
              )
            : 'h-8 gap-1.5 px-2.5 transition-colors duration-150 hover:bg-stone max-sm:min-h-11 max-sm:min-w-11 max-sm:justify-center max-sm:px-0',
          className,
        )}
      >
        <Ribbon active={active} drop={drop} className="size-4" />
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
        active ? 'hover:bg-stone' : 'text-graphite hover:bg-stone hover:text-ink',
        className,
      )}
    >
      {/* Off: the outline takes the button color, so it turns ink on hover. */}
      <Ribbon active={active} drop={drop} offClass="fill-transparent" className="size-[1.125rem]" />
    </button>
  )
}
