import { describe, expect, it } from 'vitest'
import { makeNote, TRAVEL_NOTE } from './fixtures'
import { availableReviewTypes, buildReviewCard, compareAnswer, findBlank, pickReviewType } from './reviewTypes'
import type { ReviewCard } from './reviewTypes'

function expectClean(card: ReviewCard) {
  for (const [key, value] of Object.entries(card)) {
    expect(value, key).not.toBeUndefined()
    if (typeof value === 'string') {
      expect(value.trim(), key).not.toBe('')
      expect(value, key).not.toContain('undefined')
    }
  }
}

describe('reviewTypes', () => {
  it('R1 uses Mistake → Upgrade for the brief §16 Travel note', () => {
    const note = makeNote(TRAVEL_NOTE)
    const available = availableReviewTypes(note)
    expect(available[0]).toBe('upgrade')
    expect(available).not.toContain('phrase_to_sentence')
    const card = buildReviewCard(note, 'upgrade')
    expect(card).toEqual({
      type: 'upgrade',
      promptLabel: 'Recall the better version',
      prompt: 'We enjoyed the scenario.',
      promptHint: 'What I Said',
      answerLabel: 'Better English',
      answer: 'The scenery was beautiful.',
      context: 'The scenery along the coast was beautiful.',
      explanation: '"Scenery" refers to the landscape or views. "Scenario" refers to a situation.',
    })
    expect(buildReviewCard(makeNote({ ...TRAVEL_NOTE, mode: 'writing' }), 'upgrade').promptHint).toBe('My Sentence')
  })

  it('R2 blanks the bold words in the example first', () => {
    const note = makeNote({
      upgraded_text: 'experienced a steady decline',
      example_sentence: 'The National Gallery **experienced** a steady decline.',
    })
    expect(findBlank(note)).toEqual({
      sentence: 'The National Gallery **experienced** a steady decline.',
      start: 21,
      end: 32,
      answer: 'experienced',
    })
    const card = buildReviewCard(note, 'fill_blank')
    expect(card.prompt).toBe('The National Gallery _____ a steady decline.')
    expect(card.blank).toEqual({ before: 'The National Gallery ', after: ' a steady decline.', answer: 'experienced' })
    expect(card.answerLabel).toBe('Answer')
    expect(card.promptLabel).toBe('Fill in the blank')
  })

  it('R3 blanks the upgraded phrase inside the example', () => {
    const note = makeNote({ upgraded_text: 'remained relatively stable', example_sentence: 'Visitor numbers remained relatively stable.' })
    const blank = findBlank(note)
    expect(blank?.answer).toBe('remained relatively stable')
    expect(blank?.start).toBe(16)
    const card = buildReviewCard(note, 'fill_blank')
    expect(card.blank).toEqual({ before: 'Visitor numbers ', after: '.', answer: 'remained relatively stable' })
    expect(card.context).toBe('Visitor numbers remained relatively stable.')
  })

  it('R3b matches the phrase case-insensitively, on word edges, without its full stop', () => {
    const note = makeNote({ upgraded_text: 'Rose.', example_sentence: 'Sales of roses rose in May.' })
    expect(findBlank(note)).toMatchObject({ answer: 'rose', start: 15, end: 19 })
    const long = makeNote({
      upgraded_text: 'The number of car owners rose sharply in the city',
      example_sentence: 'The number of car owners rose sharply in the city.',
    })
    expect(findBlank(long)).toBeNull()
  })

  it('R2b leaves the full stop of a bold span outside the blank', () => {
    const note = makeNote({ upgraded_text: 'remained stable', example_sentence: 'Numbers **remained stable.**' })
    expect(findBlank(note)?.answer).toBe('remained stable')
    expect(buildReviewCard(note, 'fill_blank').prompt).toBe('Numbers _____.')
  })

  it('R3c treats hyphens as part of a word and curly apostrophes as straight ones', () => {
    expect(findBlank(makeNote({ upgraded_text: 'known', example_sentence: 'It is a well-known fact.' }))).toBeNull()
    expect(findBlank(makeNote({ upgraded_text: 'it', example_sentence: "It's clear that it rose." }))).toMatchObject({ answer: 'it', start: 16 })
    const curly = makeNote({ upgraded_text: 'I’m pretty flexible', example_sentence: "I'm pretty flexible about the rest." })
    expect(findBlank(curly)).toMatchObject({ answer: "I'm pretty flexible", start: 0, end: 19 })
    expect(availableReviewTypes(curly)).toEqual(['phrase_to_sentence', 'fill_blank'])
    expect(findBlank(makeNote({ upgraded_text: 'visitors', example_sentence: "The visitors' numbers rose." }))?.answer).toBe('visitors')
  })

  it('R4 blanks the changed words from the word diff', () => {
    const note = makeNote({
      original_text: 'The number of visitors of the City Zoo increased steadily.',
      upgraded_text: 'The number of visitors to the City Zoo increased steadily.',
    })
    expect(findBlank(note)?.answer).toBe('to')
    expect(buildReviewCard(note, 'fill_blank').blank).toEqual({
      before: 'The number of visitors ',
      after: ' the City Zoo increased steadily.',
      answer: 'to',
    })
  })

  it('R4b skips punctuation-only runs and runs longer than 4 words', () => {
    const punct = makeNote({ original_text: 'I like it', upgraded_text: 'I like it!' })
    expect(findBlank(punct)).toBeNull()
    const whole = makeNote({ original_text: "I don't customize other factors.", upgraded_text: "I'm pretty flexible about the rest." })
    expect(findBlank(whole)).toBeNull()
    const second = makeNote({
      original_text: 'In general we see that sales go up fast.',
      upgraded_text: 'Overall, it is quite clear that sales rose rapidly.',
    })
    expect(findBlank(second)?.answer).toBe('rose rapidly')
  })

  it('R5 offers Phrase → Sentence when there is no original', () => {
    const note = makeNote({ upgraded_text: 'remained relatively stable', example_sentence: 'Visitor numbers remained relatively stable.' })
    const available = availableReviewTypes(note)
    expect(available).toEqual(['phrase_to_sentence', 'fill_blank'])
    const card = buildReviewCard(note, 'phrase_to_sentence')
    expect(card).toMatchObject({
      promptLabel: 'Use it in a full sentence',
      prompt: 'remained relatively stable',
      answerLabel: 'In context',
      answer: 'Visitor numbers remained relatively stable.',
    })
    expect(card.context).toBeUndefined()
  })

  it('R6 uses the recall prompt for Pattern Recall', () => {
    const note = makeNote({
      upgraded_text: 'remained relatively stable',
      reusable_pattern: '___ remained relatively stable at around ___.',
      recall_prompt: 'Describe a stable trend.',
      example_sentence: 'Visitor numbers remained relatively stable.',
      topic: 'Stability',
    })
    expect(availableReviewTypes(note)).toContain('pattern_recall')
    const card = buildReviewCard(note, 'pattern_recall')
    expect(card).toMatchObject({
      promptLabel: 'Pattern recall',
      prompt: 'Describe a stable trend.',
      answerLabel: 'Pattern',
      answer: '___ remained relatively stable at around ___.',
      context: 'Visitor numbers remained relatively stable.',
    })
    expect(card.pattern).toBeUndefined()
    expect(buildReviewCard({ ...note, recall_prompt: '' }, 'pattern_recall').prompt).toBe('Use your pattern for: Stability')
    expect(buildReviewCard({ ...note, recall_prompt: '', topic: '' }, 'pattern_recall').prompt).toBe('Use your pattern in a sentence.')
  })

  it('R7 uses the first type for the first two reviews', () => {
    const note = makeNote({ ...TRAVEL_NOTE, reusable_pattern: 'The ___ was beautiful.' })
    expect(pickReviewType({ ...note, times_reviewed: 0 }, 'mixed')).toBe('upgrade')
    expect(pickReviewType({ ...note, times_reviewed: 1 }, 'mixed')).toBe('upgrade')
  })

  it('R8 rotates through every available type after that', () => {
    const note = makeNote({
      original_text: 'The number of visitors of the City Zoo increased steadily.',
      upgraded_text: 'The number of visitors to the City Zoo increased steadily.',
      reusable_pattern: 'The number of visitors to ___ increased steadily from ___ to ___.',
    })
    expect(availableReviewTypes(note)).toEqual(['upgrade', 'fill_blank', 'pattern_recall'])
    const picked = [2, 3, 4].map((t) => pickReviewType({ ...note, times_reviewed: t }, 'mixed'))
    expect(picked).toEqual(['upgrade', 'fill_blank', 'pattern_recall'])
    expect(pickReviewType({ ...note, times_reviewed: 5 }, 'mixed')).toBe('upgrade')
    expect(pickReviewType({ ...note, times_reviewed: 3 }, 'upgrade_only')).toBe('upgrade')
  })

  it('R9 renders a note with only the upgrade cleanly', () => {
    const note = makeNote({ upgraded_text: 'I’m glued to my phone' })
    expect(availableReviewTypes(note)).toEqual(['phrase_to_sentence'])
    expect(findBlank(note)).toBeNull()
    for (const type of ['upgrade', 'phrase_to_sentence', 'fill_blank', 'pattern_recall'] as const) {
      const card = buildReviewCard(note, type)
      expectClean(card)
      expect(card.type).toBe('phrase_to_sentence')
      expect(card.answer).toBe('I’m glued to my phone')
      expect(Object.keys(card).sort()).toEqual(['answer', 'answerLabel', 'prompt', 'promptLabel', 'type'])
    }
  })

  it('R10 compares a typed answer with the expected one', () => {
    const d = compareAnswer('The scenery is beautiful', 'The scenery was beautiful.')
    expect(d.filter((t) => t.kind === 'removed').map((t) => t.text)).toEqual(['is'])
    expect(d.filter((t) => t.kind === 'added').map((t) => t.text)).toEqual(['was', '.'])
    expect(compareAnswer('the **scenery**', 'The scenery').every((t) => t.kind === 'same')).toBe(true)
  })
})
