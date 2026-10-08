import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import type { QuickAddOptions } from '@/app/overlays'
import { ToastProvider } from '@/components/ui/Toast'
import { db, resetDb } from '@/lib/db'
import { QuickAddDialog } from './QuickAddDialog'

const T13 = [
  'Original: I don\'t customize other factors.',
  'More natural: I\'m pretty flexible about the rest.',
  'Why: "customize" sounds technical.',
  'Example: I normally ask them to cut the sugar down to 30%, but I\'m pretty flexible about the rest.',
].join('\n')

const PLAIN: QuickAddOptions = {}

function Harness(props: { options: QuickAddOptions }) {
  const [open, setOpen] = useState(true)
  const [options, setOptions] = useState(props.options)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open quick add
      </button>
      <button
        type="button"
        onClick={() => {
          setOptions(PLAIN)
          setOpen(true)
        }}
      >
        Open plain quick add
      </button>
      <QuickAddDialog open={open} options={options} onClose={() => setOpen(false)} />
    </>
  )
}

function setup(options: QuickAddOptions = {}) {
  const user = userEvent.setup({ delay: null })
  render(
    <MemoryRouter>
      <ToastProvider>
        <Harness options={options} />
      </ToastProvider>
    </MemoryRouter>,
  )
  return { user }
}

const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLTextAreaElement | HTMLInputElement

async function allNotes() {
  return db.notes.toArray()
}

beforeEach(async () => {
  await resetDb()
  localStorage.clear()
})

describe('QuickAddDialog', () => {
  it('Q1 pressing W on the first step shows the Writing fields', async () => {
    const { user } = setup()
    expect(await screen.findByRole('dialog', { name: 'What are you saving?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Speaking/ })).toHaveFocus()
    await user.keyboard('w')
    expect(await screen.findByRole('dialog', { name: 'New Writing note' })).toBeInTheDocument()
    expect(field('My Sentence')).toBeInTheDocument()
    expect(field(/Band 7\+ Upgrade/)).toBeInTheDocument()
    expect(field('Reusable pattern')).toBeInTheDocument()
    expect(field('Example')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Academic Task 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByLabelText('What I Said')).toBeNull()
  })

  it('Q2 Save is disabled while the upgrade is empty; Ctrl+Enter shows the field error', async () => {
    const { user } = setup({ mode: 'speaking' })
    const save = await screen.findByRole('button', { name: 'Save' })
    expect(save).toHaveAttribute('aria-disabled', 'true')
    await user.click(field('What I Said'))
    await user.keyboard('We enjoyed the scenario.')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(await screen.findByText('Add the better version first.')).toBeInTheDocument()
    expect(field(/Native Upgrade/)).toHaveFocus()
    expect(field(/Native Upgrade/)).toHaveAttribute('aria-invalid', 'true')
    expect(await allNotes()).toHaveLength(0)

    await user.keyboard('The scenery was beautiful.')
    expect(screen.queryByText('Add the better version first.')).toBeNull()
    expect(save).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('Q3 Save creates a note with wrapping quotes removed and the chosen topic', async () => {
    const { user } = setup({ mode: 'speaking' })
    const topic = await screen.findByRole('combobox', { name: 'Topic' })
    await user.click(topic)
    await user.keyboard('Travel{Enter}')
    await user.click(field('What I Said'))
    await user.keyboard('"We enjoyed the scenario."')
    await user.click(field(/Native Upgrade/))
    await user.keyboard('“The scenery was beautiful.”')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => expect(await allNotes()).toHaveLength(1))
    const [note] = await allNotes()
    expect(note.mode).toBe('speaking')
    expect(note.topic).toBe('Travel')
    expect(note.original_text).toBe('We enjoyed the scenario.')
    expect(note.upgraded_text).toBe('The scenery was beautiful.')
    expect(await screen.findByText('Note saved.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('Q4 smart paste offers to fill fields; Fill fields fills 4 fields; Undo restores them', async () => {
    const { user } = setup({ mode: 'speaking' })
    await user.click(await screen.findByLabelText('What I Said'))
    await user.paste(T13)
    expect(field('What I Said').value).toBe(T13)

    const bar = await screen.findByText('This looks like a correction. Fill 4 fields from it?')
    expect(bar).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fill fields' }))

    expect(field('What I Said').value).toBe("I don't customize other factors.")
    expect(field(/Native Upgrade/).value).toBe("I'm pretty flexible about the rest.")
    expect(field('In context').value).toBe("I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.")
    expect(field('Why').value).toBe('"customize" sounds technical.')
    expect(screen.queryByText(/This looks like a correction/)).toBeNull()

    // Undo is a line in the form, not a toast, so it never outlives the dialog.
    expect((await screen.findByText('Fields filled')).parentElement).toHaveTextContent(/^Fields filled·Undo$/)
    expect(screen.queryByText('Fields filled.')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(field('What I Said').value).toBe(T13)
    expect(field(/Native Upgrade/).value).toBe('')
    expect(field('In context').value).toBe('')
    expect(field('Why').value).toBe('')
    expect(screen.queryByText('Fields filled')).toBeNull()
  })

  it('Q4 the "Fields filled · Undo" line goes away with the next edit and leaves no Undo after save', async () => {
    const { user } = setup({ mode: 'speaking' })
    await user.click(await screen.findByLabelText('What I Said'))
    await user.paste(T13)
    await user.click(await screen.findByRole('button', { name: 'Fill fields' }))
    expect(await screen.findByText('Fields filled')).toBeInTheDocument()
    await user.click(field(/Native Upgrade/))
    await user.keyboard(' Really.')
    expect(screen.queryByText('Fields filled')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()

    await user.keyboard('{Control>}{Enter}{/Control}')
    await waitFor(async () => expect(await allNotes()).toHaveLength(1))
    expect(await screen.findByText('Note saved.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('Q4 saving right after Fill fields leaves no Undo on screen', async () => {
    const { user } = setup({ mode: 'speaking' })
    await user.click(await screen.findByLabelText('What I Said'))
    await user.paste(T13)
    await user.click(await screen.findByRole('button', { name: 'Fill fields' }))
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument()
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(await screen.findByText('Note saved.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    expect(screen.queryByText('Fields filled')).toBeNull()
  })

  it('Q4 Keep as pasted hides the offer and leaves the text alone', async () => {
    const { user } = setup({ mode: 'speaking' })
    await user.click(await screen.findByLabelText('What I Said'))
    await user.paste(T13)
    await user.click(await screen.findByRole('button', { name: 'Keep as pasted' }))
    expect(screen.queryByText(/This looks like a correction/)).toBeNull()
    expect(field('What I Said').value).toBe(T13)
    expect(field(/Native Upgrade/).value).toBe('')
  })

  it('Q5 Save and add another keeps the topic and clears the sentence fields', async () => {
    const { user } = setup({ mode: 'speaking' })
    const topic = await screen.findByRole('combobox', { name: 'Topic' })
    await user.click(topic)
    await user.keyboard('Food{Enter}')
    await user.click(field('What I Said'))
    await user.keyboard("I don't customize other factors.")
    await user.click(field(/Native Upgrade/))
    await user.keyboard("I'm pretty flexible about the rest.")
    await user.click(field('In context'))
    await user.keyboard('I normally ask them to cut the sugar down.')
    await user.keyboard('{Control>}{Shift>}{Enter}{/Shift}{/Control}')

    await waitFor(async () => expect(await allNotes()).toHaveLength(1))
    expect((await allNotes())[0].topic).toBe('Food')
    expect(await screen.findByText('Note saved.')).toBeInTheDocument()
    await waitFor(() => expect(field('What I Said').value).toBe(''))
    expect(screen.getByRole('dialog', { name: 'New Speaking note' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('Food')
    expect(field(/Native Upgrade/).value).toBe('')
    expect(field('In context').value).toBe('')
    await waitFor(() => expect(field('What I Said')).toHaveFocus())
  })

  it('Q6 a draft is restored after closing and reopening', async () => {
    const { user } = setup({})
    await user.keyboard('s')
    await user.click(await screen.findByLabelText('What I Said'))
    await user.keyboard('We enjoyed the scenario.')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await user.click(screen.getByRole('button', { name: 'Open quick add' }))
    expect(await screen.findByText('Draft restored')).toBeInTheDocument()
    expect(field('What I Said').value).toBe('We enjoyed the scenario.')

    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(field('What I Said').value).toBe('')
    expect(screen.queryByText('Draft restored')).toBeNull()
    expect(localStorage.getItem('ielts-quickadd-draft')).toBeNull()
  })

  it('Q7 a paragraph prefill saves source_paragraph_id and note_type', async () => {
    const { user } = setup({
      title: 'New note from paragraph',
      sourceParagraphId: 'para-1',
      prefill: {
        mode: 'writing',
        task_type: 'task1',
        topic: 'Decrease',
        note_type: 'collocation',
        upgraded_text: 'experienced a steady decline',
        example_sentence: 'The National Gallery experienced a steady decline in attendance.',
      },
    })
    expect(await screen.findByRole('dialog', { name: 'New note from paragraph' })).toBeInTheDocument()
    expect(field(/Band 7\+ Upgrade/).value).toBe('experienced a steady decline')
    expect(screen.getByLabelText('Note type')).toHaveValue('collocation')
    expect(field('My Sentence')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => expect(await allNotes()).toHaveLength(1))
    const [note] = await allNotes()
    expect(note.source_paragraph_id).toBe('para-1')
    expect(note.note_type).toBe('collocation')
    expect(note.mode).toBe('writing')
    expect(note.task_type).toBe('task1')
    expect(note.topic).toBe('Decrease')
  })

  it('Q8 Tab goes from the essential fields to Save, then to More details', async () => {
    const { user } = setup({ mode: 'speaking' })
    await user.click(await screen.findByLabelText('In context'))
    await user.tab()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Save and add another' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /More details/ })).toHaveFocus()
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(field('In context')).toHaveFocus()
  })

  it('Q12 a topic typed but not chosen yet is kept when Ctrl+Enter saves', async () => {
    const { user } = setup({ mode: 'speaking' })
    await user.click(field(/Native Upgrade/))
    await user.keyboard('The scenery was beautiful.')
    await user.click(screen.getByRole('combobox', { name: 'Topic' }))
    await user.keyboard('Nha Trang')
    await user.keyboard('{Control>}{Enter}{/Control}')

    await waitFor(async () => expect(await allNotes()).toHaveLength(1))
    expect((await allNotes())[0].topic).toBe('Nha Trang')
  })

  it('Q13 Fill fields replaces only the pasted block in the field it was pasted into', async () => {
    const { user } = setup({ mode: 'writing' })
    const original = await screen.findByLabelText('My Sentence')
    await user.click(original)
    await user.keyboard('Notes: ')
    await user.paste('❌ The number of visitors of the zoo rose.\n✅ The number of visitors to the zoo rose.')
    await user.click(await screen.findByRole('button', { name: 'Fill fields' }))
    expect(field('My Sentence').value).toBe('Notes: The number of visitors of the zoo rose.')
    expect(field(/Band 7\+ Upgrade/).value).toBe('The number of visitors to the zoo rose.')
  })

  it('Q9 a long sentence pasted into Topic goes to What I Said instead', async () => {
    const { user } = setup({ mode: 'speaking' })
    const topic = await screen.findByRole('combobox', { name: 'Topic' })
    await user.click(topic)
    await user.paste(T13)
    expect(topic).toHaveValue('')
    expect(field('What I Said').value).toBe(T13)
    expect(await screen.findByText(/This looks like a correction/)).toBeInTheDocument()
  })

  it('Q10 More details options are saved: review start, Must Remember, error pattern', async () => {
    const { user } = setup({ mode: 'speaking' })
    await user.click(await screen.findByRole('button', { name: /More details/ }))
    await user.click(field(/Native Upgrade/))
    await user.keyboard('The scenery was beautiful.')
    await user.click(screen.getByRole('radio', { name: 'Do not review' }))
    await user.click(screen.getByRole('button', { name: 'Must Remember' }))
    await user.click(field('Mistake pattern'))
    await user.keyboard('scenario vs scenery')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => expect(await allNotes()).toHaveLength(1))
    const [note] = await allNotes()
    expect(note.next_review_at).toBeNull()
    expect(note.is_favorite).toBe(true)
    expect(note.error_pattern).toBe('scenario vs scenery')
    expect(localStorage.getItem('ielts-quickadd-more')).toBe('1')
  })

  it('Q11 the last used mode is focused on the first step and Enter continues with it', async () => {
    localStorage.setItem('ielts-quickadd-last', JSON.stringify({ mode: 'writing', task_type: 'task2' }))
    const { user } = setup({})
    const dialog = await screen.findByRole('dialog', { name: 'What are you saving?' })
    const writing = within(dialog).getByRole('button', { name: /Writing/ })
    await waitFor(() => expect(writing).toHaveFocus())
    await act(async () => {
      await user.keyboard('{Enter}')
    })
    expect(await screen.findByRole('dialog', { name: 'New Writing note' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Task 2' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Q14 a Writing draft is not restored into a Speaking note, and it is kept for later', async () => {
    const draft = JSON.stringify({
      v: 1,
      mode: 'writing',
      values: { original_text: 'The figure was about less than 30%.' },
      saved_at: new Date().toISOString(),
    })
    localStorage.setItem('ielts-quickadd-draft', draft)
    setup({ mode: 'speaking' })
    expect(await screen.findByRole('dialog', { name: 'New Speaking note' })).toBeInTheDocument()
    expect(screen.queryByText('Draft restored')).toBeNull()
    expect(field('What I Said').value).toBe('')
    expect(localStorage.getItem('ielts-quickadd-draft')).toBe(draft)
  })

  it('Q16 saving a prefilled note leaves the waiting draft alone', async () => {
    const draft = JSON.stringify({
      v: 1,
      mode: 'writing',
      values: { original_text: 'MYDRAFT sentence', upgraded_text: 'MYDRAFT upgrade' },
      saved_at: new Date().toISOString(),
    })
    localStorage.setItem('ielts-quickadd-draft', draft)
    const { user } = setup({ mode: 'writing', prefill: { upgraded_text: 'zzqqx' } })
    expect(await screen.findByRole('dialog', { name: 'New Writing note' })).toBeInTheDocument()
    expect(screen.queryByText('Draft restored')).toBeNull()
    await user.click(field('My Sentence'))
    await user.keyboard('typed in the prefill session')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await waitFor(async () => expect(await allNotes()).toHaveLength(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(localStorage.getItem('ielts-quickadd-draft')).toBe(draft)

    await user.click(screen.getByRole('button', { name: 'Open plain quick add' }))
    expect(await screen.findByText('Draft restored')).toBeInTheDocument()
    expect(field('My Sentence').value).toBe('MYDRAFT sentence')
  })

  it('Q17 a session that did not restore the draft does not write over it when closed', async () => {
    const draft = JSON.stringify({
      v: 1,
      mode: 'writing',
      values: { original_text: 'WDRAFT2 sentence' },
      saved_at: new Date().toISOString(),
    })
    localStorage.setItem('ielts-quickadd-draft', draft)
    const { user } = setup({ mode: 'speaking' })
    await user.click(await screen.findByLabelText('What I Said'))
    await user.keyboard('Speaking text')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(localStorage.getItem('ielts-quickadd-draft')).toBe(draft)
  })

  it('Q15 a search prefill without a mode asks Speaking or Writing first, then keeps the text', async () => {
    const { user } = setup({ prefill: { upgraded_text: 'remained relatively stable' } })
    expect(await screen.findByRole('dialog', { name: 'What are you saving?' })).toBeInTheDocument()
    await user.keyboard('w')
    expect(field(/Band 7\+ Upgrade/).value).toBe('remained relatively stable')
    expect(field('My Sentence')).toHaveFocus()
    expect(screen.queryByText('Draft restored')).toBeNull()
  })
})
