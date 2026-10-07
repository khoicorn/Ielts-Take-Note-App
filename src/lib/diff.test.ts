import { describe, expect, it } from 'vitest'
import { joinTokens, tokenizeWords, wordDiff } from './diff'

describe('diff', () => {
  it('W1 marks the changed preposition', () => {
    const d = wordDiff('The number of visitors of the City Zoo', 'The number of visitors to the City Zoo')
    expect(d.filter((t) => t.kind === 'removed').map((t) => t.text)).toEqual(['of'])
    expect(d.filter((t) => t.kind === 'added').map((t) => t.text)).toEqual(['to'])
    expect(d.filter((t) => t.kind === 'same').map((t) => t.text)).toEqual(['The', 'number', 'of', 'visitors', 'the', 'City', 'Zoo'])
    const removedAt = d.findIndex((t) => t.kind === 'removed')
    expect(d[removedAt + 1]).toEqual({ text: 'to', kind: 'added' })
  })

  it('W2 joins tokens without spaces before punctuation', () => {
    expect(joinTokens(['Hello', ',', 'world', '.'])).toBe('Hello, world.')
    expect(joinTokens(['rose', '(', 'sharply', ')', 'in', '2020', '!'])).toBe('rose (sharply) in 2020!')
    expect(joinTokens([])).toBe('')
  })

  it('W3 ignores case and curly quotes', () => {
    const d = wordDiff('I don’t know “why”.', 'i don\'t KNOW "why".')
    expect(d.every((t) => t.kind === 'same')).toBe(true)
  })

  it('W4 tokenizes words, numbers and punctuation', () => {
    expect(tokenizeWords("  I'm  flexible, from 35,000 to 68,000.\n")).toEqual([
      "I'm",
      'flexible',
      ',',
      'from',
      '35,000',
      'to',
      '68,000',
      '.',
    ])
    expect(tokenizeWords('visitors to ___ increased...')).toEqual(['visitors', 'to', '___', 'increased', '...'])
    expect(tokenizeWords('')).toEqual([])
  })

  it('W5 handles empty sides', () => {
    expect(wordDiff('', 'Good idea.')).toEqual([
      { text: 'Good', kind: 'added' },
      { text: 'idea', kind: 'added' },
      { text: '.', kind: 'added' },
    ])
    expect(wordDiff('Bad', '')).toEqual([{ text: 'Bad', kind: 'removed' }])
  })
})
