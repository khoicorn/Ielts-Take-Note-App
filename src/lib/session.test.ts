import { describe, expect, it } from 'vitest'
import { makeNote } from './fixtures'
import { buildSessionQueue } from './session'
import type { Mode, Note } from './types'

const NOW = new Date(2026, 9, 7, 18, 0)

function dueNote(i: number, mode: Mode = 'speaking', extra: Partial<Note> = {}): Note {
  return makeNote({
    id: `${mode}-${i}`,
    mode,
    next_review_at: new Date(2026, 9, 1, 8, i).toISOString(),
    created_at: new Date(2026, 8, 1, 8, i).toISOString(),
    ...extra,
  })
}

describe('session', () => {
  it('Q1 takes the oldest due notes up to the session size', () => {
    const due = Array.from({ length: 30 }, (_, i) => dueNote(i))
    const notDue = Array.from({ length: 5 }, (_, i) =>
      makeNote({ id: `later-${i}`, next_review_at: new Date(2026, 9, 9).toISOString() }),
    )
    const queue = buildSessionQueue([...notDue, ...due].reverse(), { now: NOW, size: 20 })
    expect(queue).toHaveLength(20)
    expect(queue.every((n) => n.id.startsWith('speaking-'))).toBe(true)
    expect(queue.map((n) => n.id)).toEqual(due.slice(0, 20).map((n) => n.id))
  })

  it('Q1b breaks ties on next_review_at by created_at', () => {
    const same = new Date(2026, 9, 6).toISOString()
    const a = makeNote({ id: 'a', next_review_at: same, created_at: new Date(2026, 9, 2).toISOString() })
    const b = makeNote({ id: 'b', next_review_at: same, created_at: new Date(2026, 9, 1).toISOString() })
    expect(buildSessionQueue([a, b], { now: NOW, size: 10 }).map((n) => n.id)).toEqual(['b', 'a'])
  })

  it('Q2 alternates Speaking and Writing, starting with the oldest', () => {
    const notes = [
      dueNote(1, 'writing'),
      dueNote(2, 'writing'),
      dueNote(3, 'writing'),
      dueNote(4, 'speaking'),
      dueNote(5, 'speaking'),
      dueNote(6, 'speaking'),
    ]
    const queue = buildSessionQueue(notes, { now: NOW, size: 20 })
    expect(queue.map((n) => n.mode)).toEqual(['writing', 'speaking', 'writing', 'speaking', 'writing', 'speaking'])
    expect(queue.map((n) => n.id)).toEqual(['writing-1', 'speaking-4', 'writing-2', 'speaking-5', 'writing-3', 'speaking-6'])
  })

  it('Q2b appends the rest when one mode runs out', () => {
    const notes = [dueNote(1, 'speaking'), dueNote(2, 'writing'), dueNote(3, 'speaking'), dueNote(4, 'speaking')]
    expect(buildSessionQueue(notes, { now: NOW, size: 20 }).map((n) => n.id)).toEqual([
      'speaking-1',
      'writing-2',
      'speaking-3',
      'speaking-4',
    ])
  })

  it('Q3 limits the session to one mode', () => {
    const notes = [dueNote(1, 'speaking'), dueNote(2, 'writing'), dueNote(3, 'writing')]
    const queue = buildSessionQueue(notes, { now: NOW, size: 20, mode: 'writing' })
    expect(queue.map((n) => n.id)).toEqual(['writing-2', 'writing-3'])
  })

  it('Q4 leaves out archived and unscheduled notes', () => {
    const notes = [
      dueNote(1, 'speaking', { is_archived: true, archived_at: NOW.toISOString() }),
      dueNote(2, 'speaking', { next_review_at: null }),
      dueNote(3, 'speaking'),
    ]
    expect(buildSessionQueue(notes, { now: NOW, size: 20 }).map((n) => n.id)).toEqual(['speaking-3'])
  })
})
