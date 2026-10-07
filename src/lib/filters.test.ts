import { describe, expect, it } from 'vitest'
import { makeNote } from './fixtures'
import { applyFilter, countActiveFilters, filterFromSearchParams, filterToSearchParams, sortNotes } from './filters'
import type { NoteFilter } from './types'

const NOW = new Date(2026, 9, 7, 12, 0)

describe('filters', () => {
  it('L1 round-trips every filter key through the URL', () => {
    const f: NoteFilter = {
      mode: 'writing',
      topics: ['Increase', 'Stability'],
      task_type: 'task1',
      error_types: ['Prepositions', 'Word Forms'],
      note_types: ['correction', 'collocation'],
      mastery: ['new', 'mastered'],
      review_status: 'due',
      favorite: true,
      date_from: '2026-10-01',
      date_to: '2026-10-07',
      archived: true,
    }
    const sp = filterToSearchParams(f, new URLSearchParams('view=reading&topic=Old'))
    expect(sp.get('view')).toBe('reading')
    expect(sp.getAll('topic')).toEqual(['Increase', 'Stability'])
    expect(sp.get('fav')).toBe('1')
    expect(sp.get('archived')).toBe('1')
    expect(filterFromSearchParams(new URLSearchParams(sp.toString()))).toEqual(f)
    expect(filterFromSearchParams(new URLSearchParams(''))).toEqual({})
  })

  it('L1b ignores invalid URL values', () => {
    const f = filterFromSearchParams(new URLSearchParams('mode=chat&task=task9&type=nope&mastery=done&status=x&from=yesterday&fav=0'))
    expect(f).toEqual({})
    expect(filterToSearchParams({}).toString()).toBe('')
  })

  it('L2 filters by review status', () => {
    const due = makeNote({ id: 'due', next_review_at: new Date(2026, 9, 7, 23, 0).toISOString(), times_reviewed: 2 })
    const fresh = makeNote({ id: 'new', next_review_at: new Date(2026, 9, 5).toISOString(), times_reviewed: 0 })
    const later = makeNote({ id: 'later', next_review_at: new Date(2026, 9, 8).toISOString(), times_reviewed: 1 })
    const none = makeNote({ id: 'none', next_review_at: null, times_reviewed: 0 })
    const notes = [due, fresh, later, none]
    const ids = (status: NoteFilter['review_status']) => applyFilter(notes, { review_status: status }, NOW).map((n) => n.id)
    expect(ids('due')).toEqual(['due', 'new'])
    expect(ids('new')).toEqual(['new', 'none'])
    expect(ids('scheduled')).toEqual(['later'])
    expect(ids('unscheduled')).toEqual(['none'])
  })

  it('L3 filters by an inclusive date range', () => {
    const notes = ['2026-09-30', '2026-10-01', '2026-10-04', '2026-10-07', '2026-10-08'].map((d) => makeNote({ id: d, date_created: d }))
    expect(applyFilter(notes, { date_from: '2026-10-01', date_to: '2026-10-07' }, NOW).map((n) => n.id)).toEqual([
      '2026-10-01',
      '2026-10-04',
      '2026-10-07',
    ])
    expect(applyFilter(notes, { date_from: '2026-10-07' }, NOW)).toHaveLength(2)
  })

  it('L4 hides archived notes unless asked, then shows only them', () => {
    const notes = [makeNote({ id: 'live' }), makeNote({ id: 'old', is_archived: true })]
    expect(applyFilter(notes, {}, NOW).map((n) => n.id)).toEqual(['live'])
    expect(applyFilter(notes, { archived: false }, NOW).map((n) => n.id)).toEqual(['live'])
    expect(applyFilter(notes, { archived: true }, NOW).map((n) => n.id)).toEqual(['old'])
  })

  it('L5 counts active filters, not archived', () => {
    expect(countActiveFilters({ mode: 'speaking', topics: ['Travel', 'Food'], archived: true })).toBe(2)
    expect(countActiveFilters({})).toBe(0)
    expect(countActiveFilters({ topics: [], date_from: '2026-10-01', date_to: '2026-10-07', favorite: true })).toBe(2)
  })

  it('L6 filters by mode, topic, task, error, type, mastery and favorite', () => {
    const notes = [
      makeNote({ id: 's1', mode: 'speaking', topic: 'Travel', note_type: 'correction', mastery_status: 'learning', is_favorite: true }),
      makeNote({ id: 'w1', mode: 'writing', topic: 'Increase', task_type: 'task1', error_type: 'Prepositions', note_type: 'collocation' }),
      makeNote({ id: 'w2', mode: 'writing', topic: 'Thesis', task_type: 'task2', error_type: 'Articles', mastery_status: 'mastered' }),
    ]
    const ids = (f: NoteFilter) => applyFilter(notes, f, NOW).map((n) => n.id)
    expect(ids({ mode: 'writing' })).toEqual(['w1', 'w2'])
    expect(ids({ topics: ['travel', 'Thesis'] })).toEqual(['s1', 'w2'])
    expect(ids({ task_type: 'task1' })).toEqual(['w1'])
    expect(ids({ error_types: ['Articles'] })).toEqual(['w2'])
    expect(ids({ note_types: ['collocation'] })).toEqual(['w1'])
    expect(ids({ mastery: ['learning', 'mastered'] })).toEqual(['s1', 'w2'])
    expect(ids({ favorite: true })).toEqual(['s1'])
    expect(ids({ mode: 'writing', mastery: ['learning'] })).toEqual([])
  })

  it('L7 sorts notes without changing the input', () => {
    const a = makeNote({ id: 'a', date_created: '2026-10-01', created_at: '2026-10-01T08:00:00.000Z', topic: 'Work', mastery_status: 'mastered', next_review_at: null })
    const b = makeNote({ id: 'b', date_created: '2026-10-03', created_at: '2026-10-03T08:00:00.000Z', topic: 'art', mastery_status: 'new', next_review_at: '2026-10-09T00:00:00.000Z' })
    const c = makeNote({ id: 'c', date_created: '2026-10-03', created_at: '2026-10-03T09:00:00.000Z', topic: '', mastery_status: 'learning', next_review_at: '2026-10-02T00:00:00.000Z' })
    const input = [a, b, c]
    const ids = (k: Parameters<typeof sortNotes>[1]) => sortNotes(input, k).map((n) => n.id)
    expect(ids('created_desc')).toEqual(['c', 'b', 'a'])
    expect(ids('created_asc')).toEqual(['a', 'b', 'c'])
    expect(ids('next_review')).toEqual(['c', 'b', 'a'])
    expect(ids('topic')).toEqual(['b', 'a', 'c'])
    expect(ids('mastery')).toEqual(['b', 'c', 'a'])
    expect(input.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })
})
