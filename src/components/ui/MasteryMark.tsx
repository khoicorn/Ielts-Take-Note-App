import type React from 'react'
import { MASTERY } from '@/lib/taxonomy'
import type { MasteryStatus } from '@/lib/types'
import { cn } from './cn'

/**
 * Drawn versions of ○ ◔ ◑ ✦ (brief §27). Font glyphs for these differ between systems,
 * so the marks are SVG and always line up with the text.
 */
export function MasteryGlyph(props: { status: MasteryStatus; className?: string }): React.JSX.Element {
  const { status, className } = props
  if (status === 'mastered') {
    return (
      <svg viewBox="0 0 12 12" className={cn('size-3 shrink-0 text-gold', className)} aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M6 0.6C6.25 3.6 8.4 5.75 11.4 6C8.4 6.25 6.25 8.4 6 11.4C5.75 8.4 3.6 6.25 0.6 6C3.6 5.75 5.75 3.6 6 0.6Z"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 12 12" className={cn('size-3 shrink-0', className)} aria-hidden="true" focusable="false">
      <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      {status === 'learning' ? <path d="M6 6V1.4A4.6 4.6 0 0 1 10.6 6Z" fill="currentColor" /> : null}
      {status === 'familiar' ? <path d="M6 1.4A4.6 4.6 0 0 1 6 10.6Z" fill="currentColor" /> : null}
    </svg>
  )
}

/**
 * Symbol plus word ("✦ Mastered"). With showLabel=false the word moves to aria-label (brief §39).
 * Set the text size with `size`, not className: cn() does not resolve two text-* classes.
 */
export function MasteryMark(props: {
  status: MasteryStatus
  showLabel?: boolean
  size?: 'small' | 'meta'
  className?: string
}): React.JSX.Element {
  const { status, showLabel = true, size = 'small', className } = props
  const label = MASTERY[status].label
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-graphite',
        size === 'meta' ? 'text-meta' : 'text-small',
        className,
      )}
      role={showLabel ? undefined : 'img'}
      aria-label={showLabel ? undefined : label}
      title={showLabel ? undefined : label}
    >
      <MasteryGlyph status={status} />
      {showLabel ? <span>{label}</span> : null}
    </span>
  )
}
