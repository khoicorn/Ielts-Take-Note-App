import { describe, expect, it } from 'vitest'
import { makeNote } from '@/lib/fixtures'
import type { Rating } from '@/lib/types'
import { INITIAL_SESSION, type QueueItem, type SessionState, sessionReducer } from './session'

const NOTE = makeNote({ id: 'a', original_text: 'We enjoyed the scenario.', upgraded_text: 'The scenery was beautiful.' })

function start(): SessionState {
  const queue: QueueItem[] = [{ key: 'a', note: NOTE, type: 'upgrade', repeat: false }]
  return sessionReducer(INITIAL_SESSION, { type: 'start', queue })
}

/** Reveals the current card and rates it. Again asks for a second showing, like rateNote does. */
function rate(state: SessionState, rating: Rating): SessionState {
  const revealed = sessionReducer(state, { type: 'reveal' })
  const item = revealed.queue[revealed.index]
  return sessionReducer(revealed, { type: 'rated', item, rating, note: item.note, requeue: rating === 'again' })
}

describe('sessionReducer', () => {
  it('S1 a note rated Again, then Good on its second showing, is not listed to see again soon', () => {
    const done = rate(rate(start(), 'again'), 'good')
    expect(done.phase).toBe('done')
    expect(done.reviewed).toEqual(['a'])
    expect(done.again).toEqual([])
  })

  it('S2 a note rated Again on both showings is listed once', () => {
    const done = rate(rate(start(), 'again'), 'again')
    expect(done.phase).toBe('done')
    expect(done.queue).toHaveLength(2)
    expect(done.again).toEqual(['a'])
  })
})
