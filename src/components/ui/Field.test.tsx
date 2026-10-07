import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { Field, TextArea } from './Field'
afterEach(cleanup)

function Controlled(props: { initial?: string; onPasteText?: (s: string) => void; onValue?: (s: string) => void }) {
  const [value, setValue] = useState(props.initial ?? '')
  return (
    <Field label="Native Upgrade" htmlFor="upgrade">
      <TextArea
        id="upgrade"
        value={value}
        onValueChange={(v) => {
          setValue(v)
          props.onValue?.(v)
        }}
        onPasteText={props.onPasteText}
      />
    </Field>
  )
}

describe('Field and TextArea', () => {
  it('A1 pasting text/html converts it to Markdown and calls onPasteText', () => {
    const onPasteText = vi.fn()
    render(<Controlled onPasteText={onPasteText} />)
    const textarea = screen.getByLabelText('Native Upgrade') as HTMLTextAreaElement
    textarea.focus()
    textarea.setSelectionRange(0, 0)
    const html = '<p><strong>Better:</strong> x</p>'
    fireEvent.paste(textarea, {
      clipboardData: {
        types: ['text/html', 'text/plain'],
        getData: (type: string) => (type === 'text/html' ? html : type === 'text/plain' ? 'Better: x' : ''),
      },
    })
    expect(textarea.value).toBe('**Better:** x')
    expect(onPasteText).toHaveBeenCalledWith('**Better:** x')
  })

  it('A1 pasting inserts at the cursor and keeps the text around it', () => {
    render(<Controlled initial="Start  end" />)
    const textarea = screen.getByLabelText('Native Upgrade') as HTMLTextAreaElement
    textarea.focus()
    textarea.setSelectionRange(6, 6)
    fireEvent.paste(textarea, {
      clipboardData: {
        types: ['text/html', 'text/plain'],
        getData: (type: string) => (type === 'text/html' ? '<em>middle</em>' : 'middle'),
      },
    })
    expect(textarea.value).toBe('Start *middle* end')
  })

  it('A2 Ctrl+B wraps the selection in ** and Ctrl+I in *', () => {
    render(<Controlled initial="hello world" />)
    const textarea = screen.getByLabelText('Native Upgrade') as HTMLTextAreaElement
    textarea.focus()
    textarea.setSelectionRange(0, 5)
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true })
    expect(textarea.value).toBe('**hello** world')

    textarea.setSelectionRange(10, 15)
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true })
    expect(textarea.value).toBe('**hello** *world*')
  })

  it('A2 Ctrl+B on an already bold selection removes the markers', () => {
    render(<Controlled initial="**hello** world" />)
    const textarea = screen.getByLabelText('Native Upgrade') as HTMLTextAreaElement
    textarea.focus()
    textarea.setSelectionRange(2, 7)
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true })
    expect(textarea.value).toBe('hello world')
  })

  it('A1 Field links the hint and error to the control', () => {
    render(
      <Field label="Reusable pattern" htmlFor="pattern" hint="Use ___ for slots" error="Add the better version first.">
        <input id="pattern" />
      </Field>,
    )
    const input = screen.getByLabelText('Reusable pattern')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain('pattern-hint')
    expect(input.getAttribute('aria-describedby')).toContain('pattern-error')
    expect(screen.getByText('Add the better version first.')).toBeInTheDocument()
  })
})
