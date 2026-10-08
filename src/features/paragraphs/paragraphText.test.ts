import { describe, expect, it } from 'vitest'
import { makeNote, makeParagraph, OPPOSITE_TRENDS } from '@/lib/fixtures'
import { plainText } from '@/lib/text'
import {
  findSavedPhrases,
  layoutBody,
  paragraphMeta,
  paragraphPreview,
  selectionNoteOptions,
  trimRange,
  wordCount,
  wordRanges,
} from './paragraphText'

describe('paragraphText', () => {
  it('PT1 layoutBody gives the same plain text as plainText, with each leaf at its offset', () => {
    const body = 'First **bold** part.\nNext line.\n\n- one\n- *two*\n\nLast ___ slot.'
    const layout = layoutBody(body)
    expect(layout.text).toBe(plainText(body))
    for (const block of layout.blocks) {
      for (const line of block.lines) {
        for (const leaf of line) {
          expect(layout.text.slice(leaf.start, leaf.start + leaf.text.length)).toBe(leaf.text)
        }
      }
    }
    expect(layout.blocks.map((b) => b.type)).toEqual(['p', 'ul', 'p'])
  })

  it('PT2 wordRanges drops punctuation at word edges and keeps numbers whole', () => {
    const text = 'From 2012 to 2022, the “three” attractions rose to 75,000.'
    const words = wordRanges(text).map(([s, e]) => text.slice(s, e))
    expect(words).toEqual(['From', '2012', 'to', '2022', 'the', 'three', 'attractions', 'rose', 'to', '75,000'])
  })

  it('PT3 trimRange removes outer spaces and collapses line breaks', () => {
    const text = 'Alpha beta.\nGamma delta'
    expect(trimRange(text, 5, 18)).toEqual({ start: 6, end: 17, text: 'beta. Gamma' })
    expect(trimRange(text, 5, 6)).toBeNull()
  })

  it('PT4 findSavedPhrases marks phrases and full-sentence upgrades, never overlapping', () => {
    const notes = [
      makeNote({ id: 'a', upgraded_text: 'remained relatively stable', note_type: 'collocation' }),
      makeNote({ id: 'b', upgraded_text: 'The number of visitors to the City Zoo increased steadily.', note_type: 'correction' }),
      makeNote({ id: 'c', upgraded_text: 'In contrast,', note_type: 'linking_phrase' }),
      makeNote({ id: 'd', upgraded_text: 'visitors to the City Zoo', note_type: 'collocation' }),
      makeNote({ id: 'e', upgraded_text: 'not in the paragraph' }),
    ]
    const marks = findSavedPhrases(OPPOSITE_TRENDS, notes)
    const texts = marks.map((m) => OPPOSITE_TRENDS.slice(m.start, m.end))
    expect(texts).toEqual([
      'In contrast,',
      'the number of visitors to the City Zoo increased steadily',
      'remained relatively stable',
    ])
    expect(marks.map((m) => m.note.id)).toEqual(['c', 'b', 'a'])
  })

  it('PT5 selectionNoteOptions builds the Quick Add prefill from the paragraph', () => {
    const p = makeParagraph({ id: 'p1', task_type: 'task1', task_genre: 'Line Graph', topic: 'Comparison', body: OPPOSITE_TRENDS })
    const text = layoutBody(p.body).text
    const start = text.indexOf('experienced a steady decline')
    const opts = selectionNoteOptions(p, text, { start, end: start + 28, text: 'experienced a steady decline' }, 'collocation')
    expect(opts).toEqual({
      mode: 'writing',
      title: 'New note from paragraph',
      sourceParagraphId: 'p1',
      prefill: {
        upgraded_text: 'experienced a steady decline',
        example_sentence:
          'The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions.',
        note_type: 'collocation',
        task_type: 'task1',
        task_genre: 'Line Graph',
        topic: 'Comparison',
        source_paragraph_id: 'p1',
      },
    })
  })

  it('PT6 a selection that is the whole sentence does not repeat itself as the example', () => {
    const p = makeParagraph({ id: 'p2', body: 'One sentence here. Another one.' })
    const opts = selectionNoteOptions(p, p.body, { start: 0, end: 18, text: 'One sentence here.' }, 'sentence_pattern')
    expect(opts.prefill?.example_sentence).toBeUndefined()
  })

  it('PT7 meta, preview and word count', () => {
    const p = makeParagraph({ task_type: 'task2', task_genre: 'Opinion', topic: '', body: '**Admittedly**, it works.\n\nSecond.' })
    expect(paragraphMeta(p)).toBe('Task 2 · Opinion')
    expect(paragraphMeta(makeParagraph({ task_type: '', task_genre: '', topic: '' }))).toBe('')
    expect(paragraphPreview(p.body)).toBe('Admittedly, it works.')
    expect(wordCount(OPPOSITE_TRENDS)).toBe(83)
  })
})
