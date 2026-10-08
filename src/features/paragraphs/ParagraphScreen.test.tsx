import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { db, resetDb } from '@/lib/db'
import { makeNote, makeParagraph } from '@/lib/fixtures'
import type { Paragraph } from '@/lib/types'
import { ParagraphList } from './ParagraphList'
import { ParagraphScreen } from './ParagraphScreen'

const openQuickAdd = vi.fn()

vi.mock('@/app/overlays', () => ({
  useQuickAdd: () => ({ open: openQuickAdd, close: vi.fn(), isOpen: false }),
}))

const BODY =
  'From 2012 to 2022, the three attractions showed markedly different trends. The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions. In contrast, the number of visitors to the City Zoo increased steadily from 35,000 to 68,000, making it the most visited attraction in 2022. Meanwhile, visitor numbers at the Botanical Garden remained relatively stable, rising slightly by 2,000 to 30,000 in 2017 before falling to 29,000 in 2022.'

/** Brief §23 / text.test.ts T16. */
const T16 =
  'The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions.'

function paragraph(overrides: Partial<Paragraph> = {}): Paragraph {
  return makeParagraph({
    id: 'p1',
    title: 'Task 1 — Opposite Trends',
    body: BODY,
    task_type: 'task1',
    task_genre: 'Line Graph',
    topic: 'Comparison',
    ...overrides,
  })
}

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="location">{location.pathname + location.search}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/writing/paragraphs/:id" element={<ParagraphScreen />} />
            <Route path="/writing" element={<ParagraphList taskType="task1" />} />
            <Route path="/notes/:id" element={<p>Note page</p>} />
          </Routes>
          <LocationProbe />
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

/** Selects `phrase` inside the paragraph body, the way a mouse drag would. */
function selectPhrase(phrase: string) {
  const root = screen.getByTestId('paragraph-body')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node && !(node.textContent ?? '').includes(phrase)) node = walker.nextNode()
  if (!node) throw new Error(`Text not found: ${phrase}`)
  const start = (node.textContent ?? '').indexOf(phrase)
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, start + phrase.length)
  const sel = document.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  act(() => {
    document.dispatchEvent(new Event('selectionchange'))
  })
}

describe('ParagraphScreen', { timeout: 15000 }, () => {
  beforeEach(async () => {
    await resetDb()
    openQuickAdd.mockReset()
    document.getSelection()?.removeAllRanges()
  })

  it('PG1 selecting a phrase and choosing Save as Collocation opens Quick Add prefilled', async () => {
    await db.paragraphs.add(paragraph())
    const user = userEvent.setup({ delay: null })
    renderAt('/writing/paragraphs/p1')
    expect(await screen.findByRole('heading', { name: 'Task 1 — Opposite Trends' })).toBeInTheDocument()

    const toolbar = screen.getByRole('button', { name: 'Create note from selection' })
    expect(toolbar).toBeDisabled()

    selectPhrase('experienced a steady decline')
    const item = await screen.findByRole('menuitem', { name: /Save as Collocation/ })
    expect(toolbar).toBeEnabled()
    expect(screen.getAllByRole('menuitem')).toHaveLength(5)

    await user.click(item)
    expect(openQuickAdd).toHaveBeenCalledTimes(1)
    const opts = openQuickAdd.mock.calls[0][0]
    expect(opts).toMatchObject({
      mode: 'writing',
      title: 'New note from paragraph',
      sourceParagraphId: 'p1',
      prefill: {
        upgraded_text: 'experienced a steady decline',
        example_sentence: T16,
        note_type: 'collocation',
        task_type: 'task1',
        task_genre: 'Line Graph',
        topic: 'Comparison',
        source_paragraph_id: 'p1',
      },
    })
    // The menu closes after a choice.
    expect(screen.queryByRole('menuitem', { name: /Save as Collocation/ })).toBeNull()
  })

  it('PG1b keyboard: arrows pick words, Shift extends, a number key saves', async () => {
    await db.paragraphs.add(paragraph())
    renderAt('/writing/paragraphs/p1')
    const body = await screen.findByTestId('paragraph-body')
    act(() => body.focus())
    fireEvent.keyDown(body, { key: 'ArrowRight' })
    fireEvent.keyDown(body, { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(body, { key: 'ArrowRight', shiftKey: true })
    expect(document.getSelection()?.toString()).toBe('From 2012 to')
    expect(await screen.findByRole('menu', { name: 'Create note from selection' })).toBeInTheDocument()
    fireEvent.keyDown(body, { key: '3' })
    expect(openQuickAdd).toHaveBeenCalledTimes(1)
    expect(openQuickAdd.mock.calls[0][0].prefill).toMatchObject({
      upgraded_text: 'From 2012 to',
      note_type: 'linking_phrase',
      example_sentence: 'From 2012 to 2022, the three attractions showed markedly different trends.',
    })
  })

  it('PG1c Esc dismisses the selection menu', async () => {
    await db.paragraphs.add(paragraph())
    const user = userEvent.setup({ delay: null })
    renderAt('/writing/paragraphs/p1')
    await screen.findByTestId('paragraph-body')
    selectPhrase('remained relatively stable')
    const item = await screen.findByRole('menuitem', { name: /Save as Collocation/ })
    act(() => item.focus())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: 'Create note from selection' })).toBeNull()
  })

  it('PG2 the focus editor autosaves after typing stops', async () => {
    await db.paragraphs.add(paragraph({ body: 'First line.' }))
    const user = userEvent.setup({ delay: null })
    renderAt('/writing/paragraphs/p1?edit=1')
    const field = await screen.findByRole('textbox', { name: 'Paragraph' })
    await user.click(field)
    await user.type(field, ' Second line.')
    await waitFor(
      async () => {
        expect((await db.paragraphs.get('p1'))?.body).toBe('First line. Second line.')
      },
      { timeout: 6000 },
    )
    expect(await screen.findByText('Saved')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    // Exact match: toHaveTextContent would also match "/writing/paragraphs/p1?edit=1".
    await waitFor(() => expect(screen.getByLabelText('location').textContent).toBe('/writing/paragraphs/p1'))
    expect(await screen.findByText(/Second line\./)).toBeInTheDocument()
  })

  it('PG3 delete asks for confirmation; cancel keeps the paragraph; notes made from it are kept', async () => {
    await db.paragraphs.add(paragraph())
    await db.notes.add(
      makeNote({ id: 'n1', mode: 'writing', upgraded_text: 'experienced a steady decline', source_paragraph_id: 'p1' }),
    )
    const user = userEvent.setup({ delay: null })
    renderAt('/writing/paragraphs/p1')
    await screen.findByRole('heading', { name: 'Task 1 — Opposite Trends' })

    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    expect(await screen.findByText('Delete this paragraph?')).toBeInTheDocument()
    expect(screen.getByText('Notes made from it are kept.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText('Delete this paragraph?')).toBeNull())
    expect(await db.paragraphs.get('p1')).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete paragraph' }))
    await waitFor(async () => expect(await db.paragraphs.get('p1')).toBeUndefined())
    const note = await db.notes.get('n1')
    expect(note?.source_paragraph_id).toBeNull()
    await waitFor(() => expect(screen.getByLabelText('location')).toHaveTextContent('/writing?tab=paragraphs'))
  })

  it('PG4 phrases saved from this paragraph are marked and link to their note', async () => {
    await db.paragraphs.add(paragraph())
    await db.notes.add(
      makeNote({
        id: 'n-stable',
        mode: 'writing',
        upgraded_text: 'remained relatively stable',
        note_type: 'collocation',
        source_paragraph_id: 'p1',
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderAt('/writing/paragraphs/p1')
    const body = await screen.findByTestId('paragraph-body')
    // A plain span, not <a> and not focusable: Chrome never starts a drag-selection inside either.
    await waitFor(() => expect(body.querySelector('[data-note-id="n-stable"]')).not.toBeNull())
    const link = body.querySelector('[data-note-id="n-stable"]') as HTMLElement
    expect(link).toHaveTextContent('remained relatively stable')
    expect(link).toHaveAttribute('title', 'Saved as a Collocation')
    expect(link).not.toHaveAttribute('tabindex')
    // Keyboard users reach the same note through the list below the paragraph.
    expect(screen.getByRole('link', { name: /remained relatively stable/ })).toHaveAttribute('href', '/notes/n-stable')
    // The body text stays whole around the mark.
    expect(body.textContent).toBe(BODY)
    await user.click(link)
    await waitFor(() => expect(screen.getByLabelText('location').textContent).toBe('/notes/n-stable'))
  })

  it('PG4b a click that ends a text selection does not open the note', async () => {
    await db.paragraphs.add(paragraph())
    await db.notes.add(
      makeNote({ id: 'n-stable', mode: 'writing', upgraded_text: 'remained relatively stable', source_paragraph_id: 'p1' }),
    )
    renderAt('/writing/paragraphs/p1')
    const body = await screen.findByTestId('paragraph-body')
    await waitFor(() => expect(body.querySelector('[data-note-id="n-stable"]')).not.toBeNull())
    const link = body.querySelector('[data-note-id="n-stable"]') as HTMLElement
    selectPhrase('relatively')
    fireEvent.click(link)
    expect(screen.getByLabelText('location').textContent).toBe('/writing/paragraphs/p1')
  })

  it('PG5 unknown id shows a calm not-found state', async () => {
    renderAt('/writing/paragraphs/missing')
    expect(await screen.findByText('This paragraph does not exist.')).toBeInTheDocument()
  })

  it('PG6 archive shows the archived line; Restore brings it back', async () => {
    await db.paragraphs.add(paragraph())
    const user = userEvent.setup({ delay: null })
    renderAt('/writing/paragraphs/p1')
    await screen.findByRole('heading', { name: 'Task 1 — Opposite Trends' })
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Archive' }))
    expect(await screen.findByText('This paragraph is archived. It is hidden from Model Paragraphs.')).toBeInTheDocument()
    expect((await db.paragraphs.get('p1'))?.is_archived).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(async () => expect((await db.paragraphs.get('p1'))?.is_archived).toBe(false))
    await waitFor(() => expect(screen.queryByText(/This paragraph is archived/)).toBeNull())
  })

  it('PG7 E opens the editor; Done returns to reading mode', async () => {
    await db.paragraphs.add(paragraph())
    const user = userEvent.setup({ delay: null })
    renderAt('/writing/paragraphs/p1')
    await screen.findByRole('heading', { name: 'Task 1 — Opposite Trends' })
    await user.keyboard('e')
    expect(await screen.findByRole('textbox', { name: 'Paragraph' })).toBeInTheDocument()
    expect(screen.getByLabelText('location').textContent).toBe('/writing/paragraphs/p1?edit=1')
    await user.click(screen.getByRole('button', { name: /Done/ }))
    await waitFor(() => expect(screen.getByLabelText('location').textContent).toBe('/writing/paragraphs/p1'))
    expect(screen.queryByRole('textbox', { name: 'Paragraph' })).toBeNull()
  })
})

describe('ParagraphList', { timeout: 15000 }, () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('PL1 lists paragraphs with meta and note counts', async () => {
    await db.paragraphs.add(paragraph())
    await db.notes.add(makeNote({ id: 'n1', mode: 'writing', source_paragraph_id: 'p1' }))
    renderAt('/writing')
    const title = await screen.findByText('Task 1 — Opposite Trends')
    expect(title.closest('a')).toHaveAttribute('href', '/writing/paragraphs/p1')
    expect(screen.getByText('Academic Task 1 · Line Graph · Comparison')).toBeInTheDocument()
    expect(await screen.findByText('1 note')).toBeInTheDocument()
  })

  it('PL2 empty list shows the empty state; New model paragraph opens the editor', async () => {
    const user = userEvent.setup({ delay: null })
    renderAt('/writing')
    expect(await screen.findByText('No model paragraphs yet')).toBeInTheDocument()
    expect(screen.getByText('Save full paragraphs you want to learn from.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /New model paragraph/ })[0])
    await waitFor(() => expect(screen.getByLabelText('location').textContent).toMatch(/^\/writing\/paragraphs\/.+\?edit=1$/))
    expect(await screen.findByRole('textbox', { name: 'Paragraph' })).toBeInTheDocument()
    const all = await db.paragraphs.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].task_type).toBe('task1')
  })

  it('PL3 archived paragraphs are listed apart and can be restored', async () => {
    await db.paragraphs.bulkAdd([
      paragraph(),
      paragraph({ id: 'p2', title: 'Old paragraph', is_archived: true }),
    ])
    const user = userEvent.setup({ delay: null })
    renderAt('/writing')
    await screen.findByText('Task 1 — Opposite Trends')
    expect(screen.queryByText('Old paragraph')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Archived paragraphs/ }))
    expect(await screen.findByText('Old paragraph')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(async () => expect((await db.paragraphs.get('p2'))?.is_archived).toBe(false))
    expect(await screen.findByText('2 paragraphs')).toBeInTheDocument()
  })
})
