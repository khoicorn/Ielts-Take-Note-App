import type React from 'react'
import { cn } from '@/components/ui/cn'
import { Section } from '@/components/ui/Section'
import { useNoteReviews } from '@/lib/hooks'
import { RATINGS, REVIEW_TYPE_LABELS } from '@/lib/taxonomy'
import type { Rating } from '@/lib/types'
import { formatDayWithWeekday } from './detail'

function ratingLabel(r: Rating): string {
  return RATINGS.find((x) => x.value === r)?.label ?? r
}

/** Past reviews of one note: date · rating · review type, newest first. */
export function ReviewHistory(props: { noteId: string; now?: Date; className?: string }): React.JSX.Element {
  const { noteId, now = new Date(), className } = props
  const reviews = useNoteReviews(noteId)
  const has = Boolean(reviews && reviews.length > 0)
  return (
    <Section
      id="review-history"
      title="Review history"
      className={className}
      action={has ? <span className="text-graphite">Newest first</span> : undefined}
    >
      {reviews === undefined ? (
        <div className="h-12" aria-hidden="true" />
      ) : has ? (
        <>
          <ol aria-label="Review history">
            {reviews.map((r) => (
              <li
                key={r.id}
                className={cn(
                  'grid grid-cols-[6.5rem_4.25rem_minmax(0,1fr)] items-baseline gap-3 border-b border-line py-3',
                  'sm:grid-cols-[120px_96px_minmax(0,1fr)] sm:gap-4',
                )}
              >
                <time dateTime={r.review_date} className="text-small text-graphite tabular-nums">
                  {formatDayWithWeekday(r.review_date, now)}
                </time>
                <span className="text-body text-ink">{ratingLabel(r.rating)}</span>
                <span className="text-small text-graphite">{REVIEW_TYPE_LABELS[r.review_type] ?? ''}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-meta text-graphite">Editing the wording keeps this history and the mastery level.</p>
        </>
      ) : (
        <p className="py-4 text-small text-graphite">No reviews yet.</p>
      )}
    </Section>
  )
}
