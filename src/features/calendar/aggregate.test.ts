import { describe, expect, it } from 'vitest'
import { makeNote, makeReview } from '@/lib/fixtures'
import { aggregateMonth, dayAriaLabel, daySummary, monthGrid, monthSummary, shiftMonth } from './aggregate'

describe('calendar aggregate', () => {
  it('K-1 aggregateMonth counts reviews and notes by local day', () => {
    const notes = [
      makeNote({ date_created: '2026-10-07' }),
      makeNote({ date_created: '2026-10-07' }),
      makeNote({ date_created: '2026-10-31' }),
      makeNote({ date_created: '2026-11-01' }),
      makeNote({ date_created: '2026-09-30' }),
    ]
    const lateEvening = new Date(2026, 9, 7, 23, 59)
    const reviews = [
      // Reviewed at 23:59 local: the stored local day wins over the UTC date in created_at.
      makeReview({ note_id: 'a', review_date: '2026-10-07', created_at: lateEvening.toISOString() }),
      makeReview({ note_id: 'a', review_date: '2026-10-07' }),
      makeReview({ note_id: 'b', review_date: '2026-10-08' }),
      makeReview({ note_id: 'b', review_date: '2026-11-01' }),
    ]
    const month = aggregateMonth(2026, 9, notes, reviews)
    expect(month.size).toBe(31)
    expect(month.get('2026-10-07')).toEqual({ reviews: 2, notesAdded: 2 })
    expect(month.get('2026-10-08')).toEqual({ reviews: 1, notesAdded: 0 })
    expect(month.get('2026-10-31')).toEqual({ reviews: 0, notesAdded: 1 })
    expect(month.get('2026-10-01')).toEqual({ reviews: 0, notesAdded: 0 })
    expect(month.has('2026-11-01')).toBe(false)
    expect(month.has('2026-09-30')).toBe(false)
  })

  it('K-1b a note without a valid study date falls back to its local creation day', () => {
    const created = new Date(2026, 9, 3, 23, 30)
    const month = aggregateMonth(2026, 9, [makeNote({ date_created: '', created_at: created.toISOString() })], [])
    expect(month.get('2026-10-03')).toEqual({ reviews: 0, notesAdded: 1 })
  })

  it('K-1c month grid starts on Monday and fills whole weeks', () => {
    const grid = monthGrid(2026, 9)
    // 1 October 2026 is a Thursday: three empty cells before it.
    expect(grid.slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(grid.length % 7).toBe(0)
    expect(grid.filter(Boolean)).toHaveLength(31)
    expect(grid[grid.length - 1]).toBeNull()
    // February 2027 starts on a Monday.
    expect(monthGrid(2027, 1)[0]).toBe('2027-02-01')
  })

  it('K-2 day aria-label text', () => {
    expect(dayAriaLabel('2026-10-07', { reviews: 12, notesAdded: 3 })).toBe('7 October: 12 reviews, 3 notes added')
    expect(dayAriaLabel('2026-10-08', { reviews: 1, notesAdded: 1 })).toBe('8 October: 1 review, 1 note added')
    expect(dayAriaLabel('2026-10-09', { reviews: 0, notesAdded: 0 })).toBe('9 October: nothing recorded')
  })

  it('K-2b day and month summaries', () => {
    expect(daySummary({ reviews: 12, notesAdded: 3 })).toBe('12 reviews completed · 3 notes added')
    expect(daySummary({ reviews: 1, notesAdded: 0 })).toBe('1 review completed')
    expect(daySummary({ reviews: 0, notesAdded: 2 })).toBe('2 notes added')
    expect(daySummary({ reviews: 0, notesAdded: 0 })).toBe('Nothing recorded on this day.')

    const month = new Map([
      ['2026-10-01', { reviews: 4, notesAdded: 0 }],
      ['2026-10-02', { reviews: 0, notesAdded: 2 }],
      ['2026-10-03', { reviews: 6, notesAdded: 1 }],
      ['2026-10-04', { reviews: 0, notesAdded: 0 }],
    ])
    expect(monthSummary(month)).toBe('Studied 2 days · 3 notes added · 10 reviews')
    expect(monthSummary(new Map([['2026-10-01', { reviews: 0, notesAdded: 0 }]]))).toBe('Nothing recorded this month.')
  })

  it('K-1d shiftMonth crosses year ends', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth(2026, 9, 0)).toEqual({ year: 2026, month: 9 })
  })
})
