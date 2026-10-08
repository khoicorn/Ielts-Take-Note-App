import type React from 'react'
import { forwardRef } from 'react'
import { Link } from 'react-router'
import { NoteRow } from '@/components/notes/NoteRow'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Ornament } from '@/components/ui/Ornament'
import { MODE_LABELS } from '@/lib/taxonomy'
import type { Mode, Note } from '@/lib/types'
import { againLine, backLabel, otherMode, otherModeLine, reviewedLine, streakLine } from './copy'

/** Undoes the one-line truncation of a compact NotePair, so the mistake and the upgrade show in full. */
const FULL_TEXT = '[&_[data-testid^=note-]]:whitespace-normal'

/** "Session complete" (mockup 06): what was done, a calm way out, and the notes to see again soon. */
export const SessionComplete = forwardRef<
  HTMLHeadingElement,
  {
    reviewed: number
    again: Note[]
    streak: number | undefined
    moreDue: boolean
    onReviewMore: () => void
    now: Date
  }
>(function SessionComplete(props, headingRef) {
  const { reviewed, again, streak, moreDue, onReviewMore, now } = props
  const streakText = streakLine(streak)
  const back = backLabel(again, now)
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-14 pb-16 sm:pt-28">
      <div className="text-center">
        <Ornament variant="moon" className="mb-7" />
        <h1 ref={headingRef} tabIndex={-1} className="font-serif text-title font-normal text-ink outline-none">
          Session complete
        </h1>
        <div className="mt-5 space-y-1">
          <p className="text-body-lg text-ink">{reviewedLine(reviewed)}</p>
          {again.length > 0 ? <p className="text-body-lg text-graphite">{againLine(again.length)}</p> : null}
          {streakText ? <p className="text-body-lg text-graphite">{streakText}</p> : null}
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink to="/" variant="primary" size="lg">
            Back to Today
          </ButtonLink>
          {moreDue ? (
            <Button size="lg" onClick={onReviewMore}>
              Review more
            </Button>
          ) : null}
        </div>
      </div>

      {again.length > 0 ? (
        <section aria-labelledby="again-title" className="mt-16">
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
            <h2 id="again-title" className="font-serif text-section font-normal text-ink">
              To see again soon
            </h2>
            {back ? <p className="text-small text-graphite">{back}</p> : null}
          </div>
          <ul>
            {again.map((note) => (
              <li key={note.id}>
                {/* Compact rows, but the sentences wrap in full (mockup 06): this list is short. */}
                <NoteRow note={note} to={`/notes/${note.id}`} showMode className={FULL_TEXT} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
})

/** Nothing due (plan C2): when the next review is, or how notes get here. */
export function NothingDue(props: {
  body: string | null
  mode?: Mode
  otherCount: number
  onAdd: () => void
}): React.JSX.Element {
  const { body, mode, otherCount, onAdd } = props
  const other = mode ? otherMode(mode) : null
  return (
    <div className="px-4 pt-10 sm:pt-24">
      <EmptyState
        decoration="moon"
        title="Nothing is waiting for review."
        body={body ?? ' '}
        action={
          <>
            <ButtonLink to="/" variant="primary">
              Back to Today
            </ButtonLink>
            <Button onClick={onAdd}>Add a note</Button>
          </>
        }
      />
      {other && otherCount > 0 ? (
        <p className="-mt-6 text-center text-small text-graphite">
          {otherModeLine(MODE_LABELS[other], otherCount)}{' '}
          <Link to={`/review?mode=${other}`} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Review {MODE_LABELS[other]}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
