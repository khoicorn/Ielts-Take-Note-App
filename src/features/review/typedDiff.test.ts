import { describe, expect, it } from 'vitest'
import { typedMarks } from './typedDiff'

const PATTERN = 'The number of visitors to ___ increased steadily from ___ to ___.'

function marked(typed: string, expected: string) {
  const tokens = typedMarks(typed, expected)
  return {
    extra: tokens.filter((t) => t.kind === 'removed').map((t) => t.text),
    missing: tokens.filter((t) => t.kind === 'added').map((t) => t.text),
  }
}

describe('typedMarks', () => {
  it('T1 words typed in the slots of a pattern count as matching', () => {
    expect(marked('The number of visitors to the museum increased steadily from 2010 to 2020.', PATTERN)).toEqual({
      extra: [],
      missing: [],
    })
  })

  it('T2 a missing fixed word of the pattern is still marked', () => {
    expect(marked('The number of visitors to the zoo increased from 2010 to 2020.', PATTERN)).toEqual({
      extra: [],
      missing: ['steadily'],
    })
  })

  it('T3 a slot left empty shows as missing', () => {
    expect(marked('The number of visitors to increased steadily from 2010 to 2020.', PATTERN)).toEqual({
      extra: [],
      missing: ['___'],
    })
  })

  it('T4 without slots, extra and missing words are marked as before', () => {
    expect(marked('The scenery is beautiful', 'The scenery was beautiful.')).toEqual({ extra: ['is'], missing: ['was'] })
  })
})
