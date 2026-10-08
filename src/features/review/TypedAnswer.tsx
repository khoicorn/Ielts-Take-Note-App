import { Check } from 'lucide-react'
import type React from 'react'
import { NOTE_LABEL } from '@/components/notes/NotePair'
import { cn, WRAP } from '@/components/ui/cn'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import type { DiffToken } from '@/lib/diff'
import { isWordToken, joinTokens } from '@/lib/diff'
import { compareAnswer } from '@/lib/reviewTypes'

/** True when a space goes between two tokens (no space before "," or after "("). */
function spaced(prev: string, next: string): boolean {
  return joinTokens([prev, next]).length > prev.length + next.length
}

/**
 * Only words count. A missing full stop is not a mistake worth marking.
 * Missing punctuation is left out; extra punctuation shows as typed.
 */
function visibleTokens(tokens: DiffToken[]): DiffToken[] {
  return tokens
    .filter((t) => isWordToken(t.text) || t.kind !== 'added')
    .map((t) => (isWordToken(t.text) ? t : { ...t, kind: 'same' as const }))
}

function Token(props: { token: DiffToken }): React.JSX.Element {
  const { token } = props
  if (token.kind === 'added') {
    return (
      <span className="text-upgrade underline decoration-upgrade decoration-[1.5px] underline-offset-4">
        <VisuallyHidden>missing: </VisuallyHidden>
        {token.text}
      </span>
    )
  }
  if (token.kind === 'removed') {
    return (
      <span className="text-crimson underline decoration-crimson decoration-dotted decoration-[1.5px] underline-offset-4">
        <VisuallyHidden>extra: </VisuallyHidden>
        {token.text}
      </span>
    )
  }
  return <>{token.text}</>
}

/**
 * The learner's typed answer next to the real one (design §5). Typing is optional.
 * Matching words stay plain; missing words are underlined in deep sage, extra words get a dotted crimson line.
 * Each mark also has a screen reader word, so the state is not shown by color alone (brief §39).
 */
export function TypedAnswer(props: { typed: string; expected: string; compare: boolean; className?: string }): React.JSX.Element {
  const typed = props.typed.trim()
  const tokens = props.compare ? visibleTokens(compareAnswer(typed, props.expected)) : []
  const matches = props.compare && tokens.length > 0 && tokens.every((t) => t.kind === 'same')
  const differs = props.compare && !matches
  return (
    <div data-testid="typed-answer" className={props.className}>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={NOTE_LABEL}>Your answer</span>
        <span className={cn('min-w-0 text-body', WRAP, matches ? 'text-upgrade' : 'text-ink')}>
          {props.compare
            ? tokens.map((t, i) => (
                <span key={i}>
                  {i > 0 && spaced(tokens[i - 1].text, t.text) ? ' ' : null}
                  <Token token={t} />
                </span>
              ))
            : typed}
        </span>
        {matches ? (
          <span className="inline-flex items-center gap-1 self-center text-small text-graphite">
            <Check className="size-3.5 text-upgrade" strokeWidth={2} aria-hidden="true" />
            Matches
          </span>
        ) : null}
      </p>
      {differs ? (
        <p className="mt-1 text-meta text-graphite">Underlined words are missing. Dotted words are not in the answer.</p>
      ) : null}
    </div>
  )
}
