import { useLiveQuery } from 'dexie-react-hooks'
import type React from 'react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/app/documentTitle'
import { isTypingTarget } from '@/app/hotkeys'
import { useQuickAdd } from '@/app/overlays'
import { cn } from '@/components/ui/cn'
import { isAnyDialogOpen } from '@/components/ui/Dialog'
import { MasteryGlyph } from '@/components/ui/MasteryMark'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/lib/db'
import { useDueCounts, useStudyStreak } from '@/lib/hooks'
import { getSettings, rateNote } from '@/lib/repo'
import { buildReviewCard, pickReviewType } from '@/lib/reviewTypes'
import { buildSessionQueue } from '@/lib/session'
import { computeDueCounts } from '@/lib/stats'
import { MODE_LABELS, REVIEW_TYPE_LABELS } from '@/lib/taxonomy'
import type { Mode, Note, Rating } from '@/lib/types'
import { RatingBar, RevealBar } from './ActionBar'
import { AGAIN_FEEDBACK, emptyBody, MASTERED_FEEDBACK, otherMode, RATING_NOT_SAVED } from './copy'
import { ReviewCardView } from './ReviewCard'
import { ReviewTopBar } from './ReviewTopBar'
import { INITIAL_SESSION, type QueueItem, sessionReducer } from './session'
import { NothingDue, SessionComplete } from './SessionEnd'

const RATING_KEYS: Record<string, Rating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
const FEEDBACK_MS = 1500

function modeFrom(v: string | null): Mode | undefined {
  return v === 'speaking' || v === 'writing' ? v : undefined
}

/** Space and Enter belong to a focused button or link; elsewhere they reveal. */
function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('a[href],button,[role="button"],[role="radio"],summary')
}

/**
 * Full-screen review (brief §24–27, plan C2). The queue is a snapshot taken when the session starts.
 * Space or Enter reveals, 1–4 rate, Esc leaves. Each rating is saved at once, so leaving never loses progress.
 */
export function ReviewScreen(props: { now?: Date }): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const mode = modeFrom(params.get('mode'))
  const toast = useToast()
  const quickAdd = useQuickAdd()
  const counts = useDueCounts()
  const streak = useStudyStreak()
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_SESSION)
  const [run, setRun] = useState(0)
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const [rating, setRating] = useState(false)
  const nowMs = props.now?.getTime()
  // A one-mode session names that mode's next review, not the next review of any note.
  const modeCounts = useLiveQuery(async () => {
    if (!mode) return null
    const notes = await db.notes.where('mode').equals(mode).toArray()
    return computeDueCounts(notes, nowMs === undefined ? new Date() : new Date(nowMs))
  }, [mode, nowMs, run])

  const cardRef = useRef<HTMLDivElement>(null)
  const goodRef = useRef<HTMLButtonElement>(null)
  const answerRef = useRef<HTMLTextAreaElement>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)

  // Build the queue once per session. Live changes to the notes do not reshuffle it.
  useEffect(() => {
    let cancelled = false
    dispatch({ type: 'loading' })
    void (async () => {
      const now = nowMs === undefined ? new Date() : new Date(nowMs)
      const [notes, settings] = await Promise.all([db.notes.toArray(), getSettings()])
      if (cancelled) return
      const queue: QueueItem[] = buildSessionQueue(notes, { now, size: settings.session_size, mode }).map((note) => ({
        key: note.id,
        note,
        type: pickReviewType(note, settings.review_style),
        repeat: false,
      }))
      dispatch({ type: 'start', queue })
    })()
    return () => {
      cancelled = true
    }
  }, [mode, run, nowMs])

  const item = state.phase === 'review' ? state.queue[state.index] : undefined
  const card = useMemo(() => (item ? buildReviewCard(item.note, item.type) : null), [item])
  const revealed = state.revealed

  // A new card starts clean. Focus goes to the card (or the answer field), so Space reveals and screen readers read it.
  const itemKey = item?.key
  const typingNow = useRef(typing)
  typingNow.current = typing
  useEffect(() => {
    if (!itemKey) return
    if (window.scrollY > 0) window.scrollTo(0, 0)
    if (typingNow.current) answerRef.current?.focus({ preventScroll: true })
    else cardRef.current?.focus({ preventScroll: true })
  }, [itemKey])

  // Opening the answer field moves focus into it.
  useEffect(() => {
    if (typing) answerRef.current?.focus()
  }, [typing])

  useEffect(() => {
    if (revealed) goodRef.current?.focus({ preventScroll: true })
  }, [revealed])

  useEffect(() => {
    if (state.phase === 'done') doneRef.current?.focus({ preventScroll: true })
  }, [state.phase])

  useDocumentTitle(state.phase === 'done' ? 'Session complete' : mode ? `${MODE_LABELS[mode]} review` : null)

  // "Review again soon." and "Marked as mastered." fade after 1.5s.
  useEffect(() => {
    if (!state.feedback) return
    const id = state.feedback.id
    const t = window.setTimeout(() => dispatch({ type: 'clear-feedback', id }), FEEDBACK_MS)
    return () => window.clearTimeout(t)
  }, [state.feedback])

  const leave = useCallback(() => navigate('/'), [navigate])
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), [])

  const startTyping = useCallback(() => setTyping(true), [])

  const rate = useCallback(
    async (r: Rating) => {
      if (!item || !revealed || rating) return
      setRating(true)
      try {
        const result = await rateNote(item.note.id, r, item.type)
        setTyped('')
        dispatch({ type: 'rated', item, rating: r, note: result.note, requeue: result.requeue })
      } catch {
        // The note was deleted in another tab, for example. Move on without losing the session.
        toast.show(RATING_NOT_SAVED)
        setTyped('')
        dispatch({ type: 'skip' })
      } finally {
        setRating(false)
      }
    },
    [item, revealed, rating, toast],
  )

  // Review keys (design §9). Global keys (N, Ctrl K) still work; these pause while a dialog is open.
  const keyState = useRef({ phase: state.phase, revealed, rate, reveal, leave })
  keyState.current = { phase: state.phase, revealed, rate, reveal, leave }
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
      if (isAnyDialogOpen()) return
      const k = keyState.current
      if (e.key === 'Escape') {
        e.preventDefault()
        // Esc in the answer field leaves the field first; the next Esc leaves the review.
        if (isTypingTarget(e.target)) (e.target as HTMLElement).blur()
        else k.leave()
        return
      }
      if (isTypingTarget(e.target) || k.phase !== 'review') return
      if (!k.revealed) {
        if ((e.key === ' ' || e.key === 'Enter') && !isControl(e.target)) {
          e.preventDefault()
          k.reveal()
        }
        return
      }
      const r = RATING_KEYS[e.key]
      if (r && !e.repeat) {
        e.preventDefault()
        void k.rate(r)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const now = nowMs === undefined ? new Date() : new Date(nowMs)
  const from = `${location.pathname}${location.search}`
  const total = state.queue.length

  let body: React.ReactNode = null
  if (state.phase === 'empty') {
    const nextBody = mode
      ? modeCounts === undefined
        ? null
        : emptyBody(modeCounts, now, MODE_LABELS[mode])
      : counts === undefined
        ? null
        : emptyBody(counts, now)
    body = (
      <NothingDue
        body={nextBody}
        mode={mode}
        otherCount={mode && counts ? counts[otherMode(mode)] : 0}
        onAdd={() => quickAdd.open({ mode, onSaved: () => setRun((n) => n + 1) })}
      />
    )
  } else if (state.phase === 'done') {
    const moreDue = (mode ? counts?.[mode] : counts?.total) ?? 0
    body = (
      <SessionComplete
        ref={doneRef}
        reviewed={state.reviewed.length}
        again={state.again.map((id) => state.latest[id]).filter((n): n is Note => !!n)}
        streak={streak}
        moreDue={moreDue > 0}
        onReviewMore={() => setRun((n) => n + 1)}
        now={now}
      />
    )
  } else if (item && card) {
    body = (
      // 28px side margin on a phone (mockup m02), so the 2px rule left of the prompt has room inside the screen.
      <div className="mx-auto flex w-full max-w-[784px] flex-1 flex-col px-7 sm:px-8">
        <div
          ref={cardRef}
          tabIndex={-1}
          role="group"
          aria-label={`${card.promptLabel}, note ${state.index + 1} of ${total}`}
          className="pt-8 pb-44 outline-none sm:min-h-[min(62vh,560px)] sm:pt-[88px] sm:pb-10"
        >
          <ReviewCardView
            key={item.key}
            note={item.note}
            card={card}
            revealed={revealed}
            typing={typing}
            typed={typed}
            onTyped={setTyped}
            onStartTyping={startTyping}
            onSubmitTyped={reveal}
            answerRef={answerRef}
            from={from}
          />
        </div>
        <div className="sm:pb-16">
          {revealed ? (
            <RatingBar note={item.note} onRate={(r) => void rate(r)} goodRef={goodRef} disabled={rating} />
          ) : (
            <RevealBar onReveal={reveal} typing={typing} mode={item.note.mode} />
          )}
        </div>
      </div>
    )
  }

  const feedback = state.feedback
  return (
    <div className="relative flex min-h-dvh flex-col bg-page">
      {/*
        The count shows cards, and a card rated Again comes back once, so "7 of 7" can cover 6 notes.
        The end screen says "6 notes reviewed." and shows no count, so the two numbers never disagree.
      */}
      <ReviewTopBar
        leaveLabel={state.phase === 'review' ? 'End review' : 'Close'}
        onLeave={leave}
        position={state.phase === 'review' ? state.index + 1 : undefined}
        total={state.phase === 'review' ? total : undefined}
        typeLabel={item ? REVIEW_TYPE_LABELS[item.type] : undefined}
      />
      {/* Short feedback after a rating. Always in the page, so screen readers announce it. */}
      <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-4">
        {feedback ? (
          <p
            key={feedback.id}
            className={cn('animate-fade inline-flex items-center gap-1.5 rounded-sm bg-paper px-3 py-1 text-small text-graphite')}
          >
            {feedback.kind === 'mastered' ? <MasteryGlyph status="mastered" /> : null}
            {feedback.kind === 'mastered' ? MASTERED_FEEDBACK : AGAIN_FEEDBACK}
          </p>
        ) : null}
      </div>
      <main className="flex flex-1 flex-col">
        {/* The page heading for screen readers. "Session complete" is the visible h1 at the end. */}
        {state.phase === 'done' ? null : <h1 className="sr-only">{mode ? `${MODE_LABELS[mode]} review` : 'Review'}</h1>}
        {body}
      </main>
    </div>
  )
}
