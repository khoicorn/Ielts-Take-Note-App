/**
 * Review session state (plan Task C2). Pure: the reducer never reads the clock or the database.
 * The queue is a snapshot taken when the session starts. Live data changes do not reshuffle it.
 */
import type { Note, Rating, ReviewType } from '@/lib/types'

export interface QueueItem {
  /** Unique per position: a note shown again after "Again" gets a second key. */
  key: string
  note: Note
  type: ReviewType
  /** True for the second showing of a note rated Again. */
  repeat: boolean
}

export type Feedback = { kind: 'again' | 'mastered'; id: number }

export interface SessionState {
  phase: 'loading' | 'review' | 'empty' | 'done'
  queue: QueueItem[]
  index: number
  revealed: boolean
  /** Note ids rated at least once, in order. */
  reviewed: string[]
  /**
   * Note ids whose latest rating in this session is Again, in order ("To see again soon").
   * A note rated Again and then Good on its second showing is not listed: it is not due soon.
   */
  again: string[]
  /** Note ids already appended once after Again. */
  requeued: string[]
  /** The newest copy of each rated note (after scheduling). */
  latest: Record<string, Note>
  feedback: Feedback | null
  /** Bumped by every new feedback message, so the same message can show twice in a row. */
  feedbackCount: number
}

export type SessionAction =
  | { type: 'loading' }
  | { type: 'start'; queue: QueueItem[] }
  | { type: 'reveal' }
  | { type: 'rated'; item: QueueItem; rating: Rating; note: Note; requeue: boolean }
  | { type: 'skip' }
  | { type: 'clear-feedback'; id: number }

export const INITIAL_SESSION: SessionState = {
  phase: 'loading',
  queue: [],
  index: 0,
  revealed: false,
  reviewed: [],
  again: [],
  requeued: [],
  latest: {},
  feedback: null,
  feedbackCount: 0,
}

function addOnce(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id]
}

/** Moves to the next card, or ends the session after the last one. */
function advance(state: SessionState, queue: QueueItem[]): Pick<SessionState, 'index' | 'revealed' | 'phase' | 'queue'> {
  const index = state.index + 1
  return { queue, index, revealed: false, phase: index >= queue.length ? 'done' : 'review' }
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'loading':
      return { ...INITIAL_SESSION, feedbackCount: state.feedbackCount }
    case 'start':
      return {
        ...INITIAL_SESSION,
        feedbackCount: state.feedbackCount,
        queue: action.queue,
        phase: action.queue.length > 0 ? 'review' : 'empty',
      }
    case 'reveal':
      if (state.phase !== 'review' || state.revealed) return state
      return { ...state, revealed: true, feedback: null }
    case 'rated': {
      if (state.phase !== 'review' || state.queue[state.index]?.key !== action.item.key) return state
      const { item, rating, note } = action
      let queue = state.queue
      let requeued = state.requeued
      // "Again" shows the note once more at the end of this session, never a third time.
      if (action.requeue && !requeued.includes(note.id)) {
        queue = [...queue, { key: `${item.key}:again`, note, type: item.type, repeat: true }]
        requeued = [...requeued, note.id]
      }
      const becameMastered = item.note.mastery_status !== 'mastered' && note.mastery_status === 'mastered'
      const feedbackCount = state.feedbackCount + 1
      const feedback: Feedback | null =
        rating === 'again'
          ? { kind: 'again', id: feedbackCount }
          : becameMastered
            ? { kind: 'mastered', id: feedbackCount }
            : null
      return {
        ...state,
        ...advance(state, queue),
        requeued,
        reviewed: addOnce(state.reviewed, note.id),
        again: rating === 'again' ? addOnce(state.again, note.id) : state.again.filter((id) => id !== note.id),
        latest: { ...state.latest, [note.id]: note },
        feedback,
        feedbackCount,
      }
    }
    case 'skip':
      if (state.phase !== 'review') return state
      return { ...state, ...advance(state, state.queue), feedback: null }
    case 'clear-feedback':
      return state.feedback?.id === action.id ? { ...state, feedback: null } : state
  }
}
