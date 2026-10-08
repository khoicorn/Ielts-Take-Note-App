import { describe, expect, it } from 'vitest'
import { makeNote } from '@/lib/fixtures'
import { againLine, backLabel, emptyBody, reviewedLine, streakLine, whenPhrase } from './copy'

const NOW = new Date(2026, 9, 8, 20, 0)

describe('review copy', () => {
  it('K1 counts read naturally', () => {
    expect(reviewedLine(1)).toBe('1 note reviewed.')
    expect(reviewedLine(12)).toBe('12 notes reviewed.')
    expect(againLine(2)).toBe('2 to see again soon.')
    expect(streakLine(1)).toBeNull()
    expect(streakLine(undefined)).toBeNull()
    expect(streakLine(4)).toBe('4 days of consistent study.')
  })

  it('K2 next review phrase uses local days', () => {
    expect(whenPhrase(new Date(2026, 9, 9, 0, 0).toISOString(), NOW)).toBe('tomorrow')
    expect(whenPhrase(new Date(2026, 9, 11, 0, 0).toISOString(), NOW)).toBe('in 3 days')
    expect(whenPhrase(new Date(2026, 9, 30, 0, 0).toISOString(), NOW)).toBe('on 30 Oct')
    const counts = { total: 0, speaking: 0, writing: 0, nextDueAt: new Date(2026, 9, 9).toISOString(), nextDueCount: 3 }
    expect(emptyBody(counts, NOW)).toBe('Next review tomorrow · 3 notes')
    expect(emptyBody({ ...counts, nextDueAt: null, nextDueCount: 0 }, NOW)).toBe('Add notes and they will appear here.')
  })

  it('K3 "Back tomorrow" only when every note returns tomorrow', () => {
    const tomorrow = makeNote({ next_review_at: new Date(2026, 9, 9).toISOString() })
    const later = makeNote({ next_review_at: new Date(2026, 9, 11).toISOString() })
    expect(backLabel([tomorrow], NOW)).toBe('Back tomorrow')
    expect(backLabel([tomorrow, later], NOW)).toBeNull()
    expect(backLabel([], NOW)).toBeNull()
  })
})
