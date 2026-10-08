import { describe, expect, it } from 'vitest'
import { lessonForDay } from './curriculum'
import { evaluateLexis } from './lexicalFeedback'

describe('evaluateLexis', () => {
  it('rewards target collocations and flags a lesson-specific awkward phrase', () => {
    const answer =
      'The figure had an increase strongly from 25,000 to 42,000 journeys. It then fell slightly before it climbed sharply to a peak of 61,000. This was the highest point in the period, and the total remained strong overall despite the brief decline. Bus use therefore more than doubled across the decade.'
    const result = evaluateLexis(answer, lessonForDay(1))

    expect(result.usedTargets).toContain('a slight dip / decline')
    expect(result.usedTargets).toContain('a peak / highest point')
    expect(result.sentences[0].upgraded).toContain('rose sharply')
    expect(result.sentences[0].issues[0].why).toContain('concise verb phrase')
  })

  it('labels the score as stronger when the response meets all targets and the word range', () => {
    const answer =
      'Bus use rose sharply from 25,000 to 42,000 journeys during the first four years. This was followed by a slight dip to 40,000 in 2017. The figure then climbed rapidly and peaked at 61,000 journeys in 2020, which was the highest point shown. Overall, the total more than doubled despite the brief decline in the middle of the period. The final increase was particularly notable, adding 21,000 journeys in only three years.'
    const result = evaluateLexis(answer, lessonForDay(1))

    expect(result.inRange).toBe(true)
    expect(result.usedTargets).toHaveLength(4)
    expect(result.band).toBe(7.5)
  })
})
