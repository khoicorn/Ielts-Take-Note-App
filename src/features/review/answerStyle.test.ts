import { describe, expect, it } from 'vitest'
import { isSerifAnswer, SERIF_ANSWER_MAX_CHARS } from './answerStyle'

describe('isSerifAnswer', () => {
  it('A1 short answers use the serif', () => {
    expect(isSerifAnswer('The scenery was beautiful.')).toBe(true)
    expect(isSerifAnswer('just under 30%')).toBe(true)
  })

  it('A2 the limit is under 90 characters of plain text', () => {
    expect(SERIF_ANSWER_MAX_CHARS).toBe(90)
    expect(isSerifAnswer('a'.repeat(89))).toBe(true)
    expect(isSerifAnswer('a'.repeat(90))).toBe(false)
    const long = 'In conclusion, governments should introduce stricter policies to tackle this issue in the long term.'
    expect(long.length).toBeGreaterThanOrEqual(90)
    expect(isSerifAnswer(long)).toBe(false)
  })

  it('A3 Markdown marks and extra spaces do not count', () => {
    // 85 letters, plus 4 bold marks and 6 extra spaces: 95 raw characters, 86 plain ones.
    const md = `**${'a'.repeat(40)}**       ${'b'.repeat(45)}`
    expect(md.length).toBeGreaterThanOrEqual(90)
    expect(isSerifAnswer(md)).toBe(true)
    expect(isSerifAnswer(`  ${'a'.repeat(80)}\n\n${'b'.repeat(5)}  `)).toBe(true)
  })
})
