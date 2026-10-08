import { describe, expect, it } from 'vitest'
import { makeNote, makeParagraph, OPPOSITE_TRENDS } from './fixtures'
import { matchRanges, searchAll, stem } from './search'

describe('search', () => {
  it('F1 finds "stable" across stems and topics', () => {
    const notes = [
      makeNote({ id: 'a', mode: 'writing', upgraded_text: 'remained relatively stable', topic: 'Stability' }),
      makeNote({ id: 'b', mode: 'writing', upgraded_text: 'remained broadly unchanged', topic: 'Stability' }),
      makeNote({ id: 'c', mode: 'writing', upgraded_text: 'maintained a stable level', topic: 'Comparison' }),
      makeNote({ id: 'd', mode: 'writing', upgraded_text: 'increased sharply', topic: 'Increase' }),
    ]
    const hits = searchAll('stable', notes, [])
    expect(hits.map((h) => (h.kind === 'note' ? h.note.id : h.paragraph.id)).sort()).toEqual(['a', 'b', 'c'])
    const b = hits.find((h) => h.kind === 'note' && h.note.id === 'b')
    expect(b?.field).toBe('topic')
    expect(b?.snippet).toBe('Stability')
    expect(hits[0].field).toBe('upgraded_text')
  })

  it('F2 ranks a phrase match above single-word matches', () => {
    const notes = [
      makeNote({ id: 'loose', upgraded_text: 'Visitor numbers rose to 30,000.', updated_at: '2026-10-07T10:00:00.000Z' }),
      makeNote({ id: 'phrase', upgraded_text: 'The number of visitors to the City Zoo increased steadily.', updated_at: '2026-10-01T10:00:00.000Z' }),
    ]
    const hits = searchAll('visitors to', notes, [])
    expect(hits.map((h) => (h.kind === 'note' ? h.note.id : ''))).toEqual(['phrase', 'loose'])
    expect(hits[0].score).toBeGreaterThan(hits[1].score)
  })

  it('F3 tolerates partial words', () => {
    const notes = [
      makeNote({ id: 'scenery', upgraded_text: 'The scenery was beautiful.' }),
      makeNote({ id: 'scenario', upgraded_text: 'In this scenario, prices fall.' }),
      makeNote({ id: 'other', upgraded_text: 'Prices rose.' }),
    ]
    expect(
      searchAll('scen', notes, [])
        .map((h) => (h.kind === 'note' ? h.note.id : ''))
        .sort(),
    ).toEqual(['scenario', 'scenery'])
  })

  it('F4 leaves out archived notes and paragraphs', () => {
    const notes = [makeNote({ id: 'gone', upgraded_text: 'remained relatively stable', is_archived: true })]
    const paragraphs = [makeParagraph({ body: 'remained relatively stable', is_archived: true })]
    expect(searchAll('stable', notes, paragraphs)).toEqual([])
  })

  it('F5 finds paragraphs and shows a snippet around the match', () => {
    const p = makeParagraph({ id: 'p1', title: 'Task 1 — Opposite Trends', body: `${OPPOSITE_TRENDS} ${OPPOSITE_TRENDS}` })
    const hits = searchAll('markedly different', [], [p])
    expect(hits).toHaveLength(1)
    const hit = hits[0]
    expect(hit.kind).toBe('paragraph')
    expect(hit.field).toBe('body')
    expect(hit.snippet).toContain('markedly different')
    expect(hit.snippet.length).toBeLessThan(160)
    expect(hit.snippet.endsWith('…')).toBe(true)
  })

  it('F6 returns ranges of whole matched words in the original text', () => {
    expect(matchRanges('Remained relatively STABLE', 'stable')).toEqual([[20, 26]])
    expect(matchRanges('visitors to the zoo', 'visitors to')).toEqual([[0, 11]])
    expect(matchRanges('The scenery, the scenario', 'scen')).toEqual([
      [4, 11],
      [17, 25],
    ])
    expect(matchRanges('anything', '   ')).toEqual([])
  })

  it('F7 stems related word forms to the same root', () => {
    expect(stem('stability')).toBe(stem('stable'))
    expect(stem('stably')).toBe('stab')
    expect(stem('stable')).toBe('stab')
    expect(stem('Increased')).toBe(stem('increase'))
    expect(stem('increasing')).toBe(stem('increases'))
    expect(stem('studies')).toBe('study')
    expect(stem('the')).toBe('the')
  })

  it('F7b matches y and i word forms: steady finds steadily and back', () => {
    expect(stem('steadily')).toBe(stem('steady'))
    expect(stem('heavily')).toBe(stem('heavy'))
    expect(stem('easily')).toBe(stem('easy'))
    const notes = [
      makeNote({ id: 'adverb', upgraded_text: 'The number of visitors increased steadily.' }),
      makeNote({ id: 'adjective', upgraded_text: 'a steady rise' }),
      makeNote({ id: 'other', upgraded_text: 'Prices rose.' }),
    ]
    const ids = (q: string) => searchAll(q, notes, []).map((h) => (h.kind === 'note' ? h.note.id : '')).sort()
    expect(ids('steady increase')).toEqual(['adverb'])
    expect(ids('steady')).toEqual(['adjective', 'adverb'])
    expect(ids('steadily')).toEqual(['adjective', 'adverb'])
    expect(matchRanges('Visitors increased steadily.', 'steady')).toEqual([[19, 27]])
  })

  it('F6b does not highlight a closing quote, but keeps a plural possessive', () => {
    expect(matchRanges("the 'stable' trend", 'stable')).toEqual([[5, 11]])
    expect(matchRanges("the visitors' numbers", 'visitors')).toEqual([[4, 13]])
    expect(matchRanges("it's stable", 'it')).toEqual([[0, 4]])
  })

  it('F8 needs every query word to match and uses Markdown-free snippets', () => {
    const notes = [
      makeNote({ id: 'x', upgraded_text: 'The **scenery** was beautiful.', topic: 'Travel', tags: ['nha-trang'] }),
      makeNote({ id: 'y', upgraded_text: 'The scenery was dull.', topic: 'Work' }),
    ]
    const hits = searchAll('scenery travel', notes, [])
    expect(hits.map((h) => (h.kind === 'note' ? h.note.id : ''))).toEqual(['x'])
    expect(hits[0].snippet).toBe('The scenery was beautiful.')
    expect(searchAll('nha trang', notes, []).length).toBe(1)
    expect(searchAll('', notes, [])).toEqual([])
  })

  it('F9 respects the limit and breaks ties by newer updated_at', () => {
    const notes = Array.from({ length: 60 }, (_, i) =>
      makeNote({ id: `n${i}`, upgraded_text: 'stable', updated_at: new Date(2026, 9, 1, 0, i).toISOString() }),
    )
    const hits = searchAll('stable', notes, [])
    expect(hits).toHaveLength(50)
    expect(hits[0].kind === 'note' && hits[0].note.id).toBe('n59')
    expect(searchAll('stable', notes, [], 5)).toHaveLength(5)
  })
})
