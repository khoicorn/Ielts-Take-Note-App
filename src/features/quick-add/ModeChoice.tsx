import { MessageCircle, PenLine } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { cn } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'
import { Kbd } from '@/components/ui/Kbd'
import { FIELD_LABELS, MODE_LABELS } from '@/lib/taxonomy'
import type { Mode } from '@/lib/types'

const MODES: readonly Mode[] = ['speaking', 'writing']

/** A tiny sample note on each card, so a first-time reader sees what each notebook holds (brief §44). */
const SAMPLE: Readonly<Record<Mode, { mistake: string; upgrade: string; key: string }>> = {
  speaking: { mistake: 'We enjoyed the scenario.', upgrade: 'The scenery was beautiful.', key: 'S' },
  writing: { mistake: 'The figure was about less than 30%.', upgrade: 'The figure was just under 30%.', key: 'W' },
}

export function choiceId(base: string, mode: Mode): string {
  return `${base}-choice-${mode}`
}

/**
 * Step 1, "What are you saving?": two cards side by side (stacked on a phone).
 * Keys S / W or 1 / 2 choose (bound by the dialog). The last used mode has focus, so Enter continues.
 */
export function ModeChoice(props: {
  idBase: string
  lastUsed: Mode | null
  initialFocus: Mode
  onChoose: (mode: Mode) => void
}): React.JSX.Element {
  const { idBase, lastUsed, onChoose } = props
  const [focused, setFocused] = useState<Mode>(props.initialFocus)
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {MODES.map((mode) => {
          const Icon = mode === 'speaking' ? MessageCircle : PenLine
          const id = choiceId(idBase, mode)
          const labels = FIELD_LABELS[mode]
          const sample = SAMPLE[mode]
          const isLast = lastUsed === mode
          return (
            <button
              key={mode}
              id={id}
              type="button"
              onClick={() => onChoose(mode)}
              onFocus={() => setFocused(mode)}
              aria-labelledby={`${id}-name`}
              aria-describedby={cn(`${id}-flow`, isLast && `${id}-last`)}
              aria-keyshortcuts={`${sample.key} ${mode === 'speaking' ? '1' : '2'}`}
              className={cn(
                'flex min-w-0 cursor-pointer flex-col rounded-md border border-line-strong bg-paper px-5 pt-5 pb-4.5 text-left',
                'transition-[background-color,border-color] duration-150 hover:bg-stone/30',
                // The focus token: ink-indigo by day, amber by night (design v1.2 rule 10).
                'focus:border-focus focus:outline-1 focus:outline-offset-0 focus:outline-focus',
                'max-sm:px-4 max-sm:pt-4 max-sm:pb-3.5',
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <Icon
                  className={cn('size-5.5 shrink-0', mode === 'speaking' ? 'text-plum' : 'text-sage')}
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                />
                <span className="inline-flex items-center gap-2">
                  {isLast ? (
                    <span id={`${id}-last`} className="text-meta text-graphite">
                      Last used
                    </span>
                  ) : null}
                  <span aria-hidden="true" className="max-sm:hidden">
                    <Kbd>{sample.key}</Kbd>
                  </span>
                </span>
              </span>
              <span id={`${id}-name`} className="mt-4 font-serif text-section text-ink max-sm:mt-2">
                {MODE_LABELS[mode]}
              </span>
              <span id={`${id}-flow`} className="mt-1 text-small text-graphite">
                {labels.original} <span aria-hidden="true">→</span>
                <span className="sr-only">then</span> {labels.upgraded}
              </span>
              <span aria-hidden="true" className="mt-4 block min-w-0 border-t border-line pt-3.5 max-sm:mt-3 max-sm:pt-3">
                <span className="block truncate text-small text-crimson">{sample.mistake}</span>
                <span className="mt-0.5 block truncate text-body text-ink">{sample.upgrade}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-4 hidden items-center gap-2 text-meta text-graphite sm:flex">
        <Kbd>Enter</Kbd>
        <span>to continue with {MODE_LABELS[focused]}</span>
      </p>
    </div>
  )
}
