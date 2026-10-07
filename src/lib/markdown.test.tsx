import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown, parseInline, parseMarkdown } from './markdown'

describe('markdown', () => {
  it('M1 parses bold, italic and slots', () => {
    expect(parseInline('a **b** *c* ___ d')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', text: 'b' },
      { type: 'text', text: ' ' },
      { type: 'italic', text: 'c' },
      { type: 'text', text: ' ' },
      { type: 'slot', text: '___' },
      { type: 'text', text: ' d' },
    ])
  })

  it('M1b keeps lone asterisks and short underscores as text', () => {
    expect(parseInline('2 * 3 = 6 and snake_case')).toEqual([{ type: 'text', text: '2 * 3 = 6 and snake_case' }])
    expect(parseInline('** not bold **')).toEqual([{ type: 'text', text: '** not bold **' }])
  })

  it('M2 parses lists and paragraphs', () => {
    expect(parseMarkdown('- a\n- b\n\npara')).toEqual([
      { type: 'ul', items: [[{ type: 'text', text: 'a' }], [{ type: 'text', text: 'b' }]] },
      { type: 'p', inline: [{ type: 'text', text: 'para' }] },
    ])
  })

  it('M2b parses ordered lists, continuation lines and line breaks', () => {
    expect(parseMarkdown('Intro line\nsecond line\n1. one\ncontinued\n2) two\n\n\n- dash')).toEqual([
      { type: 'p', inline: [{ type: 'text', text: 'Intro line\nsecond line' }] },
      { type: 'ol', items: [[{ type: 'text', text: 'one\ncontinued' }], [{ type: 'text', text: 'two' }]] },
      { type: 'ul', items: [[{ type: 'text', text: 'dash' }]] },
    ])
    expect(parseMarkdown('')).toEqual([])
    expect(parseMarkdown('a\r\n\r\nb')).toHaveLength(2)
  })

  it('M3 highlights the whole matched word once', () => {
    const { container } = render(<Markdown text="remained relatively stable" highlight="stable" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('stable')
    expect(marks[0].className).toBe('bg-gold/25 text-current rounded-xs')
    expect(container.textContent).toBe('remained relatively stable')
  })

  it('M3b highlights stemmed matches inside bold text', () => {
    const { container } = render(<Markdown text="Visitor numbers showed **stability** overall." highlight="stable" />)
    const marks = container.querySelectorAll('strong mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('stability')
  })

  it('M4 renders an unclosed bold marker as literal text', () => {
    const { container } = render(<Markdown text="**bold" />)
    expect(container.textContent).toBe('**bold')
    expect(container.querySelector('strong')).toBeNull()
  })

  it('M5 renders blocks, slots and inline mode', () => {
    const { container } = render(<Markdown text={'The **number** of visitors to ___\n\n- one\n- two'} className="note" />)
    expect(container.querySelector('div.note')).not.toBeNull()
    expect(container.querySelector('p strong')?.textContent).toBe('number')
    const slot = container.querySelector('span[role="img"]')
    expect(slot?.getAttribute('aria-label')).toBe('blank')
    expect(slot?.className).toBe('inline-block min-w-12 border-b border-current align-baseline')
    expect(container.querySelectorAll('ul li')).toHaveLength(2)

    const inline = render(<Markdown text={'line one\nline two'} inline />)
    expect(inline.container.querySelector('p')).toBeNull()
    expect(inline.container.querySelectorAll('br')).toHaveLength(1)
    expect(inline.container.textContent).toBe('line oneline two')
  })
})
