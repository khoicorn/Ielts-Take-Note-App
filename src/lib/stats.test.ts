import { describe, expect, it } from 'vitest'
import { makeNote } from './fixtures'
import { computeDueCounts, mergeLabels, studyStreak } from './stats'

const NOW = new Date(2026, 9, 7, 9, 0)

describe('stats', () => {
  it('ST-1 counts due notes by mode and finds the next due day', () => {
    const notes = [
      makeNote({ mode: 'speaking', next_review_at: new Date(2026, 9, 7, 23, 0).toISOString() }),
      makeNote({ mode: 'writing', next_review_at: new Date(2026, 9, 1).toISOString() }),
      makeNote({ mode: 'writing', next_review_at: new Date(2026, 9, 2).toISOString(), is_archived: true }),
      makeNote({ mode: 'writing', next_review_at: new Date(2026, 9, 8).toISOString() }),
      makeNote({ mode: 'speaking', next_review_at: new Date(2026, 9, 8, 0, 0).toISOString() }),
      makeNote({ mode: 'speaking', next_review_at: new Date(2026, 9, 12).toISOString() }),
      makeNote({ mode: 'speaking', next_review_at: null }),
    ]
    expect(computeDueCounts(notes, NOW)).toEqual({
      total: 2,
      speaking: 1,
      writing: 1,
      nextDueAt: new Date(2026, 9, 8).toISOString(),
      nextDueCount: 2,
    })
    expect(computeDueCounts([], NOW)).toEqual({ total: 0, speaking: 0, writing: 0, nextDueAt: null, nextDueCount: 0 })
  })

  it('ST-2 counts consecutive study days ending today or yesterday', () => {
    expect(studyStreak(new Set(['2026-10-07', '2026-10-06', '2026-10-05', '2026-10-03']), NOW)).toBe(3)
    expect(studyStreak(new Set(['2026-10-06', '2026-10-05']), NOW)).toBe(2)
    expect(studyStreak(new Set(['2026-10-05', '2026-10-04']), NOW)).toBe(0)
    expect(studyStreak(new Set(), NOW)).toBe(0)
    expect(studyStreak(new Set(['2026-03-09', '2026-03-08', '2026-03-07']), new Date(2026, 2, 9, 8))).toBe(3)
  })

  it('ST-3 merges label lists without case duplicates, keeping the first spelling', () => {
    expect(mergeLabels(['Travel', 'Food'], ['travel ', 'Pets'], ['', 'FOOD', 'Nha Trang'])).toEqual(['Travel', 'Food', 'Pets', 'Nha Trang'])
  })
})
