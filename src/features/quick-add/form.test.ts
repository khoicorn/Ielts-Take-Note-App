import { beforeEach, describe, expect, it } from 'vitest'
import { buildDraft, emptyValues, firstEmptyField, valuesForNext } from './form'
import { applyOffer, looksLikeNoteText, makeOffer } from './smartPaste'
import { readDraft, writeDraft } from './storage'

const now = new Date(2026, 9, 8, 9, 0)

beforeEach(() => localStorage.clear())

describe('Quick Add form logic', () => {
  it('QF1 Save and add another keeps topic, task type, tags, date and review start; clears the note text', () => {
    const v = {
      ...emptyValues(now, 'task2'),
      topic: 'Concession',
      tags: ['essay'],
      start: 'tomorrow' as const,
      original_text: 'a',
      upgraded_text: 'b',
      explanation: 'c',
      error_pattern: 'd',
      is_favorite: true,
      note_type: 'collocation' as const,
    }
    const next = valuesForNext(v, now)
    expect(next).toMatchObject({ topic: 'Concession', task_type: 'task2', tags: ['essay'], start: 'tomorrow' })
    expect(next).toMatchObject({ original_text: '', upgraded_text: '', explanation: '', error_pattern: '', is_favorite: false, note_type: '' })
  })

  it('QF2 a Speaking draft for createNote has no task type; an unset note type is left to createNote', () => {
    const v = { ...emptyValues(now), task_type: 'task1' as const, task_genre: 'Map', upgraded_text: 'x' }
    const d = buildDraft('speaking', v)
    expect(d.task_type).toBe('')
    expect(d.task_genre).toBe('')
    expect('note_type' in d).toBe(false)
  })

  it('QF3 focus starts in the first empty essential field', () => {
    expect(firstEmptyField('speaking', emptyValues(now))).toBe('topic')
    expect(firstEmptyField('writing', { ...emptyValues(now), upgraded_text: 'x' })).toBe('original_text')
    expect(firstEmptyField('writing', { ...emptyValues(now), original_text: 'a', upgraded_text: 'b' })).toBe('reusable_pattern')
  })

  it('QF4 Windows line ends in a paste still match the field text', () => {
    const offer = makeOffer('original_text', '❌ a b c.\r\n✅ a d c.')
    expect(offer).not.toBeNull()
    const v = { ...emptyValues(now), original_text: '❌ a b c.\n✅ a d c.' }
    const filled = applyOffer(v, offer!)
    expect(filled.original_text).toBe('a b c.')
    expect(filled.upgraded_text).toBe('a d c.')
  })

  it('QF5 sentences and pasted blocks are not topics; short labels are', () => {
    expect(looksLikeNoteText('Travel')).toBe(false)
    expect(looksLikeNoteText('Advantages / Disadvantages')).toBe(false)
    expect(looksLikeNoteText('We enjoyed the scenario.')).toBe(true)
    expect(looksLikeNoteText('a\nb')).toBe(true)
  })

  it('QF6 a draft date left at its default becomes today when restored on a later day', () => {
    const then = new Date(2026, 9, 1, 20, 0)
    writeDraft('speaking', { ...emptyValues(then), original_text: 'x' }, then)
    expect(readDraft(now)?.values.date_created).toBe('2026-10-08')
    writeDraft('speaking', { ...emptyValues(then), original_text: 'x', date_created: '2026-09-30' }, then)
    expect(readDraft(now)?.values.date_created).toBe('2026-09-30')
  })

  it('QF7 a broken or foreign draft is ignored', () => {
    localStorage.setItem('ielts-quickadd-draft', '{not json')
    expect(readDraft(now)).toBeNull()
    localStorage.setItem('ielts-quickadd-draft', JSON.stringify({ mode: 'chat', values: {} }))
    expect(readDraft(now)).toBeNull()
  })
})
