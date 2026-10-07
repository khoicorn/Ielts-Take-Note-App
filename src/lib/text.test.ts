import { describe, expect, it } from 'vitest'
import { OPPOSITE_TRENDS } from './fixtures'
import {
  cleanSentence,
  extractSentence,
  htmlToMarkdown,
  normalizeTag,
  normalizeText,
  parseSmartPaste,
  plainText,
  stripWrappingQuotes,
} from './text'

describe('htmlToMarkdown', () => {
  it('T1 keeps bold labels', () => {
    expect(htmlToMarkdown('<p><strong>Better:</strong> The scenery was beautiful.</p>')).toBe('**Better:** The scenery was beautiful.')
  })

  it('T2 turns bullet lists into dashes', () => {
    expect(htmlToMarkdown('<ul><li>one</li><li>two</li></ul>')).toBe('- one\n- two')
  })

  it('T3 numbers ordered lists', () => {
    expect(htmlToMarkdown('<ol><li>a</li><li>b</li></ol>')).toBe('1. a\n2. b')
  })

  it('T4 separates paragraphs with a blank line', () => {
    expect(htmlToMarkdown('<p>a</p><p>b</p>')).toBe('a\n\nb')
  })

  it('T5 keeps line breaks', () => {
    expect(htmlToMarkdown('line<br>next')).toBe('line\nnext')
  })

  it('T6 turns headings into paragraphs and nbsp into spaces', () => {
    expect(htmlToMarkdown('<h3>Why</h3><p>x&nbsp;y</p>')).toBe('Why\n\nx y')
  })

  it('T7 flattens nested lists', () => {
    const md = htmlToMarkdown('<ul><li>a<ul><li>b</li></ul></li></ul>')
    expect(md).toContain('- a')
    expect(md).toContain('- b')
    expect(md).toBe('- a\n- b')
  })

  it('T8 keeps weight-600 spans, code text and emoji', () => {
    expect(htmlToMarkdown('<span style="font-weight:600">bold</span> <code>x</code> 😊')).toBe('**bold** x 😊')
  })

  it('T9 drops scripts and styles', () => {
    expect(htmlToMarkdown('<script>alert(1)</script><style>p{}</style><p>keep</p>')).toBe('keep')
  })

  it('T9b handles a ChatGPT-style answer without losing words', () => {
    const html = [
      '<meta charset="utf-8"><h3>✅ Better version</h3>',
      '<p>The <strong>scenery</strong> was <em>beautiful</em>.</p>',
      '<ol><li><p><strong>Why:</strong> "Scenery" means views.</p></li><li><p>Use <code>scenario</code> for situations.</p></li></ol>',
      '<p>See <a href="https://example.com">this</a>.<br><br><br></p>',
    ].join('')
    expect(htmlToMarkdown(html)).toBe(
      '✅ Better version\n\nThe **scenery** was *beautiful*.\n\n1. **Why:** "Scenery" means views.\n2. Use scenario for situations.\n\nSee this.',
    )
  })

  it('T9c ignores Google Docs normal-weight wrappers and moves spaces outside bold', () => {
    const html = '<b style="font-weight:normal" id="docs-internal-guid-1"><p><span>Plain </span><span style="font-weight:700"> strong </span><span>text</span></p></b>'
    expect(htmlToMarkdown(html)).toBe('Plain **strong** text')
  })

  it('T9d keeps continuation paragraphs inside list items and nested ordered lists', () => {
    const html = '<ul><li><p>first</p><p>more</p></li><li>second<ol><li>x</li><li>y</li></ol></li></ul><p>after</p>'
    expect(htmlToMarkdown(html)).toBe('- first\nmore\n- second\n1. x\n2. y\n\nafter')
  })

  it('T9e returns plain text untouched', () => {
    expect(htmlToMarkdown('just text')).toBe('just text')
    expect(htmlToMarkdown('')).toBe('')
  })
})

describe('quotes and cleaning', () => {
  it('T10 strips one pair of curly quotes', () => {
    expect(stripWrappingQuotes('“We enjoyed the scenario.”')).toBe('We enjoyed the scenario.')
    expect(stripWrappingQuotes('"The scenery was beautiful."')).toBe('The scenery was beautiful.')
    expect(stripWrappingQuotes('‘I don’t know’')).toBe('I don’t know')
    expect(stripWrappingQuotes("'I don't know'")).toBe("I don't know")
    expect(stripWrappingQuotes('«bonjour»')).toBe('bonjour')
  })

  it('T11 keeps quotes that do not wrap the whole text', () => {
    expect(stripWrappingQuotes('"a" and "b"')).toBe('"a" and "b"')
    expect(stripWrappingQuotes('"unclosed')).toBe('"unclosed')
    expect(stripWrappingQuotes('“mixed"')).toBe('“mixed"')
  })

  it('T11b cleans sentences', () => {
    expect(cleanSentence('   “We   enjoyed the scenario.”  ')).toBe('We enjoyed the scenario.')
    expect(cleanSentence('line one  \n  line two')).toBe('line one\nline two')
    expect(cleanSentence('')).toBe('')
  })

  it('T11c makes plain text from the Markdown subset', () => {
    expect(plainText('The **scenery** was *beautiful*.')).toBe('The scenery was beautiful.')
    expect(plainText('- one\n- two')).toBe('one\ntwo')
    expect(plainText('visitors to ___ from ___')).toBe('visitors to ___ from ___')
    expect(plainText('**unclosed')).toBe('**unclosed')
  })

  it('T11d normalizes tags', () => {
    expect(normalizeTag('  #Trend Language ')).toBe('trend-language')
    expect(normalizeTag('IELTS')).toBe('ielts')
    expect(normalizeTag('#')).toBe('')
  })
})

describe('parseSmartPaste', () => {
  it('T12 reads emoji labels', () => {
    expect(parseSmartPaste('❌ We enjoyed the scenario.\n✅ The scenery was beautiful.')).toEqual({
      original_text: 'We enjoyed the scenario.',
      upgraded_text: 'The scenery was beautiful.',
      fieldCount: 2,
    })
  })

  it('T13 maps four labelled fields', () => {
    const text =
      'Original: I don\'t customize other factors.\nMore natural: I\'m pretty flexible about the rest.\nWhy: "customize" sounds technical.\nExample: I normally ask them to cut the sugar down to 30%, but I\'m pretty flexible about the rest.'
    expect(parseSmartPaste(text)).toEqual({
      original_text: "I don't customize other factors.",
      upgraded_text: "I'm pretty flexible about the rest.",
      explanation: '"customize" sounds technical.',
      example_sentence: "I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.",
      fieldCount: 4,
    })
  })

  it('T14 reads bold labels with a pattern', () => {
    const text =
      '**Better version:** The number of visitors to the City Zoo increased steadily.\n**Pattern:** The number of visitors to ___ increased steadily from ___ to ___.'
    expect(parseSmartPaste(text)).toEqual({
      upgraded_text: 'The number of visitors to the City Zoo increased steadily.',
      reusable_pattern: 'The number of visitors to ___ increased steadily from ___ to ___.',
      fieldCount: 2,
    })
  })

  it('T15 returns null for a plain sentence', () => {
    expect(parseSmartPaste('The scenery was beautiful.')).toBeNull()
    expect(parseSmartPaste('Better late than never, I suppose.')).toBeNull()
    expect(parseSmartPaste('')).toBeNull()
  })

  it('T15b needs the upgrade and at least two fields', () => {
    expect(parseSmartPaste('Why: it sounds technical.\nExample: Something here.')).toBeNull()
    expect(parseSmartPaste('✅ The scenery was beautiful.')).toBeNull()
  })

  it('T15c handles multi-line values, quotes, bullets and labels on their own line', () => {
    const text = [
      'Here is a more natural version:',
      '',
      '- **You said:** “We enjoyed the scenario.”',
      '- **Native upgrade:** “The scenery was beautiful.”',
      '',
      '**Explanation**',
      '"Scenery" is the view.',
      '"Scenario" is a situation.',
      '',
      '💡 e.g. The scenery along the coast was beautiful.',
    ].join('\n')
    expect(parseSmartPaste(text)).toEqual({
      original_text: 'We enjoyed the scenario.',
      upgraded_text: 'The scenery was beautiful.',
      explanation: '"Scenery" is the view.\n"Scenario" is a situation.',
      example_sentence: 'The scenery along the coast was beautiful.',
      fieldCount: 4,
    })
  })

  it('T15d accepts dash separators, variation selectors and an emoji before a word label', () => {
    const text = '✔️ Correct – The number of visitors to the City Zoo increased.\n❌ Wrong - The number of visitors of the City Zoo increased.'
    expect(parseSmartPaste(text)).toEqual({
      upgraded_text: 'The number of visitors to the City Zoo increased.',
      original_text: 'The number of visitors of the City Zoo increased.',
      fieldCount: 2,
    })
  })
})

describe('parseSmartPaste edge cases', () => {
  it('T15e ends sentence fields at a blank line, joins explanations, and needs a space after a dash', () => {
    const text = [
      '❌ We enjoyed the scenario.',
      '✅ The scenery was beautiful.',
      'Why: "Scenery" means the views.',
      'Note: "Scenario" is a situation.',
      '',
      'Let me know if you want more examples.',
    ].join('\n')
    expect(parseSmartPaste(text)).toEqual({
      original_text: 'We enjoyed the scenario.',
      upgraded_text: 'The scenery was beautiful.',
      explanation: '"Scenery" means the views.\n"Scenario" is a situation.\n\nLet me know if you want more examples.',
      fieldCount: 3,
    })
    const closing = '❌ We enjoyed the scenario.\n✅ The scenery was beautiful.\n\nHope this helps.'
    expect(parseSmartPaste(closing)?.upgraded_text).toBe('The scenery was beautiful.')
    expect(parseSmartPaste('Better-known brands sold more.\nWrong: x')).toBeNull()
  })
})

describe('extractSentence and normalizeText', () => {
  it('T16 extracts the sentence around a selection', () => {
    const phrase = 'experienced a steady decline'
    const start = OPPOSITE_TRENDS.indexOf(phrase)
    expect(extractSentence(OPPOSITE_TRENDS, start, start + phrase.length)).toBe(
      'The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions.',
    )
  })

  it('T16b returns every sentence a selection touches', () => {
    const start = OPPOSITE_TRENDS.indexOf('trends.')
    const end = OPPOSITE_TRENDS.indexOf('Gallery') + 'Gallery'.length
    const s = extractSentence(OPPOSITE_TRENDS, start, end)
    expect(s.startsWith('From 2012 to 2022')).toBe(true)
    expect(s.endsWith('three attractions.')).toBe(true)
    expect(extractSentence('One line\nSecond line here', 12, 14)).toBe('Second line here')
    expect(extractSentence('No full stop', 3, 7)).toBe('No full stop')
  })

  it('T17 normalizes quotes, case and punctuation', () => {
    expect(normalizeText('“Visitors’ – TO!”')).toBe("visitors' to")
    expect(normalizeText('  Visitors of + place ')).toBe('visitors of + place')
    expect(normalizeText("Café — I'm 'fine'")).toBe("cafe i'm fine")
    expect(normalizeText('Đà Nẵng')).toBe('da nang')
  })
})
