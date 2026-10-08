import { ArrowRight, ChevronRight, Keyboard } from 'lucide-react'
import type React from 'react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ModeMark } from '@/components/notes/ModeMark'
import { NOTE_LABEL } from '@/components/notes/NotePair'
import { Quote } from '@/components/notes/Quote'
import { cn, WRAP } from '@/components/ui/cn'
import { TextArea } from '@/components/ui/Field'
import { MustRememberMark } from '@/components/ui/FavoriteStar'
import { ICON_STROKE } from '@/components/ui/icons'
import { useParagraph } from '@/lib/hooks'
import { Markdown } from '@/lib/markdown'
import type { ReviewCard } from '@/lib/reviewTypes'
import { FIELD_LABELS, taskTypeLabel } from '@/lib/taxonomy'
import { normalizeText } from '@/lib/text'
import type { Note } from '@/lib/types'
import { TypedAnswer } from './TypedAnswer'

/** A vertical rule that hangs just left of the text column, so the sentence lines up with its label. */
const RULE = 'border-l-2 pl-4 -ml-[18px]'
/** The opening quote mark hangs into the padding, like NotePair. */
const HANG = '-indent-[0.36em]'

function Dot(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="text-graphite">
      ·
    </span>
  )
}

/** "Speaking · Travel · Must Remember" (mockups 04, 07). Empty parts are left out. */
function Eyebrow(props: { note: Note }): React.JSX.Element {
  const { note } = props
  const task = note.mode === 'writing' ? taskTypeLabel(note.task_type, 'short') : ''
  const topic = note.topic.trim()
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small text-graphite">
      <ModeMark mode={note.mode} />
      {task ? (
        <>
          <Dot />
          <span>{task}</span>
        </>
      ) : null}
      {topic ? (
        <>
          <Dot />
          <span className={cn('min-w-0', WRAP)}>{topic}</span>
        </>
      ) : null}
      {note.is_favorite ? (
        <>
          <Dot />
          <MustRememberMark />
        </>
      ) : null}
    </p>
  )
}

/** The fill-in-the-blank sentence. The blank becomes the answer on reveal. */
function BlankSentence(props: { blank: NonNullable<ReviewCard['blank']>; revealed: boolean }): React.JSX.Element {
  const { blank, revealed } = props
  return (
    <>
      {blank.before}
      {revealed ? (
        <span className="animate-ink text-upgrade underline decoration-sage decoration-[1.5px] underline-offset-[6px]">
          {blank.answer}
        </span>
      ) : (
        <span role="img" aria-label="blank" className="mx-0.5 inline-block w-[4.5em] border-b-[1.5px] border-graphite align-baseline">
          <span className="sr-only">_____</span>
        </span>
      )}
      {blank.after}
    </>
  )
}

function Labeled(props: { label: string; children: React.ReactNode; className?: string }): React.JSX.Element {
  return (
    <div className={props.className}>
      <p className={cn(NOTE_LABEL, 'mb-2')}>{props.label}</p>
      {props.children}
    </div>
  )
}

/** "Why" stays folded until asked for (plan C2, state 2). */
function WhyToggle(props: { explanation: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="-ml-1.5 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 text-small text-graphite hover:text-ink max-sm:min-h-11"
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform duration-150', open && 'rotate-90')}
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
        />
        Why
      </button>
      {open ? (
        <div id={id} className={cn('animate-fade mt-2 max-w-[62ch] text-body text-ink', WRAP)}>
          <Markdown text={props.explanation} />
        </div>
      ) : null}
    </div>
  )
}

/** "From Task 1 — Opposite Trends →", when the note came from a model paragraph. */
function FromParagraph(props: { id: string }): React.JSX.Element | null {
  const paragraph = useParagraph(props.id)
  if (!paragraph) return null
  return (
    <Link
      to={`/writing/paragraphs/${paragraph.id}`}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-sm text-small text-graphite hover:text-ink max-sm:min-h-11"
    >
      From <span className={cn('font-serif text-body-lg text-ink italic', WRAP)}>{paragraph.title}</span>
      <ArrowRight className="size-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
    </Link>
  )
}

function same(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b)
}

export interface ReviewCardViewProps {
  note: Note
  card: ReviewCard
  revealed: boolean
  /** The optional typed answer (design §5). */
  typing: boolean
  typed: string
  onTyped: (v: string) => void
  onStartTyping: () => void
  /** Enter in the answer field reveals. */
  onSubmitTyped: () => void
  answerRef: React.RefObject<HTMLTextAreaElement | null>
  /** Where "Open note" returns to. */
  from: string
}

/**
 * One review card (brief §24, mockups 04–07). State 1 shows the cue and a lot of space.
 * State 2 adds the answer (deep sage, settling in like ink), then context, pattern and a folded "Why".
 */
export function ReviewCardView(props: ReviewCardViewProps): React.JSX.Element {
  const { note, card, revealed, typing, typed, onTyped, onStartTyping, onSubmitTyped, answerRef, from } = props
  const answerId = useId()
  const labels = FIELD_LABELS[note.mode]
  const isBlank = card.type === 'fill_blank' && card.blank
  const isUpgrade = card.type === 'upgrade'
  // A note with only its upgrade has nothing new to show as the answer. Say so plainly instead of repeating it.
  const answerRepeats = card.type === 'phrase_to_sentence' && same(card.answer, card.prompt)

  return (
    <div>
      <Eyebrow note={note} />
      <h2 className="mt-3 font-serif text-section font-normal text-ink">{card.promptLabel}</h2>

      <div className="mt-8 sm:mt-10">
        {card.promptHint ? <p className={cn(NOTE_LABEL, 'mb-3')}>{card.promptHint}</p> : null}
        <p
          data-testid="review-prompt"
          className={cn(
            WRAP,
            'transition-[font-size,color] duration-200',
            isUpgrade && cn(RULE, HANG, 'border-crimson/70', revealed ? 'text-body-lg text-crimson' : 'text-recall text-ink'),
            isBlank && cn(RULE, 'border-line-strong text-recall text-ink'),
            !isUpgrade && !isBlank && 'text-recall text-ink',
          )}
        >
          {isBlank && card.blank ? (
            <BlankSentence blank={card.blank} revealed={revealed} />
          ) : isUpgrade ? (
            <Quote text={card.prompt} />
          ) : (
            <Markdown text={card.prompt} inline />
          )}
        </p>
      </div>

      {!revealed ? (
        typing ? (
          <div className="mt-8">
            <label htmlFor={answerId} className="mb-1.5 block text-small text-graphite">
              Your answer
            </label>
            <TextArea
              id={answerId}
              ref={answerRef}
              value={typed}
              onValueChange={onTyped}
              minRows={2}
              data-review-answer=""
              aria-describedby={`${answerId}-hint`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  onSubmitTyped()
                }
              }}
            />
            <p id={`${answerId}-hint`} className="mt-1.5 text-meta text-graphite">
              Enter reveals. Shift Enter starts a new line.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartTyping}
            className="-ml-1.5 mt-8 inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-1.5 text-small text-graphite hover:text-ink max-sm:min-h-11"
          >
            <Keyboard className="size-4" strokeWidth={ICON_STROKE} aria-hidden="true" />
            Type your answer (optional)
          </button>
        )
      ) : (
        <div className="animate-ink">
          {isBlank ? null : (
            <Labeled label={card.answerLabel} className="mt-9">
              {answerRepeats ? (
                <p className="text-body-lg text-graphite">No example saved yet. Say your own sentence, then rate it.</p>
              ) : (
                <p className={cn(RULE, HANG, 'border-sage text-recall text-upgrade', WRAP)}>
                  {card.type === 'phrase_to_sentence' ? <Markdown text={card.answer} inline /> : <Quote text={card.answer} />}
                </p>
              )}
            </Labeled>
          )}

          {typed.trim() ? <TypedAnswer typed={typed} expected={card.answer} compare className="mt-5" /> : null}

          {card.context && !isBlank ? (
            <Labeled label={labels.example} className="mt-8">
              <div className={cn('text-body-lg text-ink', WRAP)}>
                <Markdown text={card.context} />
              </div>
            </Labeled>
          ) : null}

          {card.pattern ? (
            <Labeled label={labels.pattern} className="mt-8">
              <div className={cn('text-body-lg text-ink', WRAP)}>
                <Markdown text={card.pattern} />
              </div>
            </Labeled>
          ) : null}

          <div className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-1">
            {card.explanation ? (
              <div className="min-w-0 basis-full">
                <WhyToggle explanation={card.explanation} />
              </div>
            ) : null}
            {note.source_paragraph_id ? <FromParagraph id={note.source_paragraph_id} /> : null}
            <Link
              to={`/notes/${note.id}`}
              state={{ from }}
              className="inline-flex min-h-8 items-center rounded-sm text-small text-graphite underline decoration-line-strong underline-offset-4 hover:text-ink max-sm:min-h-11"
            >
              Open note
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
