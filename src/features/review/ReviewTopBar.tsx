import { X } from 'lucide-react'
import type React from 'react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'

/**
 * The quiet top bar of the full-screen review (mockups 04–07, m02).
 * Left: leave (Esc). Center: "3 of 12". Right: the review type. The bottom hairline is the progress track.
 */
export function ReviewTopBar(props: {
  /** "End review" during a session, "Close" on the end and empty screens. */
  leaveLabel: string
  onLeave: () => void
  /** 1-based position; with `total`, shows "3 of 12" and the progress line. */
  position?: number
  total?: number
  /** Screen reader word before the count: "Note 3 of 12" or "Reviewed 12 of 12". */
  countPrefix?: string
  typeLabel?: string
}): React.JSX.Element {
  const { leaveLabel, onLeave, position, total, countPrefix = 'Note', typeLabel } = props
  const showCount = position !== undefined && total !== undefined && total > 0
  const pct = showCount ? Math.min(100, (position / total) * 100) : 0
  return (
    <header className="relative grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line pr-4 pl-1.5 sm:px-6">
      <div className="justify-self-start">
        <Button variant="ghost" size="sm" icon={X} kbd="Esc" onClick={onLeave} className="-ml-2 max-sm:hidden">
          {leaveLabel}
        </Button>
        <IconButton icon={X} label={leaveLabel} onClick={onLeave} className="sm:hidden" />
      </div>
      {showCount ? (
        <p className="text-small text-graphite tabular-nums">
          <VisuallyHidden>{`${countPrefix} `}</VisuallyHidden>
          {`${position} of ${total}`}
        </p>
      ) : (
        <span aria-hidden="true" />
      )}
      {typeLabel ? (
        <p className="justify-self-end truncate text-meta text-graphite sm:text-small">{typeLabel}</p>
      ) : (
        <span aria-hidden="true" />
      )}
      {showCount ? (
        <div
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={position}
          aria-valuetext={`${position} of ${total}`}
          className="absolute -bottom-px left-0 h-px bg-indigo transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      ) : null}
    </header>
  )
}
