import { describe, expect, it } from 'vitest'
import { makeNote } from './fixtures'
import { buildLedger, errorTypeSlug, mostRepeatedIssue } from './mistakes'
import { ERROR_TYPES } from './taxonomy'

const NOW = new Date(2026, 9, 7, 12, 0)

function visitorsNote(i: number, extra = {}) {
  return makeNote({
    id: `v${i}`,
    mode: 'writing',
    error_type: 'Prepositions',
    error_pattern: 'visitors of + place',
    fix_pattern: i === 3 ? 'visitors to + place' : '',
    created_at: new Date(2026, 9, i).toISOString(),
    ...extra,
  })
}

describe('mistakes', () => {
  it('X1 groups four notes into one pattern seen 4 times', () => {
    const notes = [1, 2, 3, 4].map((i) => visitorsNote(i))
    const ledger = buildLedger(notes, ERROR_TYPES)
    expect(ledger).toHaveLength(1)
    const [group] = ledger
    expect(group.error_type).toBe('Prepositions')
    expect(group.seen).toBe(4)
    expect(group.loose).toEqual([])
    expect(group.patterns).toHaveLength(1)
    const [pattern] = group.patterns
    expect(pattern).toMatchObject({ error_pattern: 'visitors of + place', fix_pattern: 'visitors to + place', seen: 4 })
    expect(pattern.notes.map((n) => n.id)).toEqual(['v4', 'v3', 'v2', 'v1'])
    expect(pattern.last_seen_at).toBe(new Date(2026, 9, 4).toISOString())
  })

  it('X1b sums times_seen and takes the newest fix pattern', () => {
    const notes = [
      visitorsNote(1, { fix_pattern: 'old fix', times_seen: 3 }),
      visitorsNote(2, { fix_pattern: 'visitors to + place' }),
      visitorsNote(5, { fix_pattern: '' }),
    ]
    const [pattern] = buildLedger(notes, ERROR_TYPES)[0].patterns
    expect(pattern.seen).toBe(5)
    expect(pattern.fix_pattern).toBe('visitors to + place')
  })

  it('X2 groups patterns that differ only in case and spacing', () => {
    const notes = [visitorsNote(1), visitorsNote(2, { error_pattern: 'Visitors of + place ' }), visitorsNote(3, { error_pattern: ' visitors  OF + place' })]
    const [group] = buildLedger(notes, ERROR_TYPES)
    expect(group.patterns).toHaveLength(1)
    expect(group.patterns[0].key).toBe('visitors of + place')
    expect(group.patterns[0].seen).toBe(3)
  })

  it('X3 orders groups by the error type list, custom types A–Z, Other last', () => {
    const notes = [
      makeNote({ id: 'o', error_pattern: 'no type' }),
      makeNote({ id: 'z', error_type: 'Zebra habits' }),
      makeNote({ id: 't', error_type: 'Tenses' }),
      makeNote({ id: 'c', error_type: 'Custom thing' }),
      makeNote({ id: 'p', error_type: 'Prepositions', error_pattern: 'in online' }),
      makeNote({ id: 'a', error_type: 'Articles' }),
      makeNote({ id: 'skip' }),
      makeNote({ id: 'arch', error_type: 'Tenses', is_archived: true }),
    ]
    const ledger = buildLedger(notes, ERROR_TYPES)
    expect(ledger.map((g) => g.error_type)).toEqual(['Prepositions', 'Articles', 'Tenses', 'Custom thing', 'Zebra habits', 'Other'])
    expect(ledger.find((g) => g.error_type === 'Tenses')?.loose.map((n) => n.id)).toEqual(['t'])
    expect(ledger.find((g) => g.error_type === 'Other')?.patterns[0].error_pattern).toBe('no type')
  })

  it('X3b sorts patterns by how often they were seen', () => {
    const notes = [
      makeNote({ error_type: 'Prepositions', error_pattern: 'in online' }),
      ...[1, 2].map((i) => visitorsNote(i)),
      makeNote({ error_type: 'Prepositions', error_pattern: 'interested about', times_seen: 2, created_at: '2026-09-01T00:00:00.000Z' }),
    ]
    const [group] = buildLedger(notes, ERROR_TYPES)
    expect(group.patterns.map((p) => [p.error_pattern, p.seen])).toEqual([
      ['visitors of + place', 2],
      ['interested about', 2],
      ['in online', 1],
    ])
    expect(group.seen).toBe(5)
  })

  it('X4 finds the most repeated issue this week', () => {
    const thisWeek = ['2026-10-07', '2026-10-05', '2026-10-03', '2026-10-01']
    const notes = [
      ...thisWeek.map((d) => makeNote({ error_type: 'Prepositions', date_created: d })),
      makeNote({ error_type: 'Articles', date_created: '2026-10-06' }),
      ...Array.from({ length: 6 }, () => makeNote({ error_type: 'Prepositions', date_created: '2026-09-27' })),
      makeNote({ error_type: 'Articles', date_created: '2026-09-30' }),
    ]
    expect(mostRepeatedIssue(notes, NOW)).toEqual({ error_type: 'Prepositions', count: 4 })
    expect(mostRepeatedIssue(notes, NOW, 30)).toEqual({ error_type: 'Prepositions', count: 10 })
  })

  it('X5 returns null when nothing repeats', () => {
    expect(mostRepeatedIssue([makeNote({ error_type: 'Articles', date_created: '2026-10-07' })], NOW)).toBeNull()
    const tie = [
      makeNote({ error_type: 'Tenses', date_created: '2026-10-07' }),
      makeNote({ error_type: 'Tenses', date_created: '2026-10-06' }),
      makeNote({ error_type: 'Articles', date_created: '2026-10-07' }),
      makeNote({ error_type: 'Articles', date_created: '2026-10-06' }),
      makeNote({ error_type: 'Articles', date_created: '2026-10-05', is_archived: true }),
    ]
    expect(mostRepeatedIssue(tie, NOW)).toEqual({ error_type: 'Articles', count: 2 })
  })

  it('X6 makes anchor slugs', () => {
    expect(errorTypeSlug('Word Forms')).toBe('word-forms')
    expect(errorTypeSlug('Academic Task 1')).toBe('academic-task-1')
    expect(errorTypeSlug('Other')).toBe('other')
  })
})
