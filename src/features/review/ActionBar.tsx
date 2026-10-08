import type React from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { Kbd } from '@/components/ui/Kbd'
import { formatInterval } from '@/lib/dates'
import { previewIntervals } from '@/lib/srs'
import { RATINGS } from '@/lib/taxonomy'
import type { Mode, Note, Rating } from '@/lib/types'
import { RATE_HINT, revealHint } from './copy'

/**
 * Under 640px the bar is fixed to the bottom, above the safe area (mockup m02).
 * From 640px it follows the card, under a hairline (mockups 04–05).
 */
const BAR = cn(
  'border-t border-line bg-page',
  'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-10 max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
  'sm:mt-auto sm:pt-7',
)

export function RevealBar(props: {
  onReveal: () => void
  typing: boolean
  /** The card's notebook: Speaking says it aloud, Writing writes or says it. */
  mode: Mode
  revealRef?: React.Ref<HTMLButtonElement>
}): React.JSX.Element {
  return (
    <div className={BAR}>
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-2.5">
        <p className="text-small text-graphite max-sm:text-center">
          {props.typing ? 'Type it, then reveal.' : revealHint(props.mode)}
        </p>
        <Button
          ref={props.revealRef}
          variant="primary"
          size="lg"
          kbd={props.typing ? 'Enter' : 'Space'}
          onClick={props.onReveal}
          className="sm:min-w-42 max-sm:w-full"
        >
          Reveal
        </Button>
      </div>
    </div>
  )
}

/** Again · Hard · Good · Easy, each with its key and the next gap (plan C2). Good is the default. */
export function RatingBar(props: {
  note: Note
  onRate: (r: Rating) => void
  goodRef: React.Ref<HTMLButtonElement>
  disabled?: boolean
}): React.JSX.Element {
  const intervals = previewIntervals(props.note)
  return (
    <div className={BAR}>
      <div className="flex items-center justify-between gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-2.5">
        <p id="rate-hint" className="shrink-0 text-small text-graphite max-sm:text-center">
          {RATE_HINT}
        </p>
        <div role="group" aria-labelledby="rate-hint" className="grid grid-cols-4 gap-2 sm:w-[504px]">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              ref={r.value === 'good' ? props.goodRef : undefined}
              type="button"
              aria-keyshortcuts={r.key}
              disabled={props.disabled}
              onClick={() => props.onRate(r.value)}
              className={cn(
                'relative flex cursor-pointer flex-col rounded-sm border border-line-strong bg-paper text-ink transition-colors duration-150 hover:bg-stone/60',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'min-h-12 items-center justify-center px-1 py-1.5 sm:min-h-[58px] sm:items-start sm:px-3.5 sm:py-2',
              )}
            >
              <span className="text-body leading-tight">{r.label}</span>
              <span className="text-meta text-graphite">{formatInterval(intervals[r.value])}</span>
              <span aria-hidden="true" className="absolute top-2 right-2 hidden sm:inline-flex">
                <Kbd>{r.key}</Kbd>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
