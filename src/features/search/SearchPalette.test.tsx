import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OverlayProvider, useSearch } from '@/app/overlays'
import type { QuickAddDialogProps } from '@/features/quick-add/QuickAddDialog'
import { db, resetDb } from '@/lib/db'
import { makeNote, makeParagraph } from '@/lib/fixtures'

// Quick Add is another screen's work. A probe shows what the palette asked it to open.
vi.mock('@/features/quick-add/QuickAddDialog', () => ({
  QuickAddDialog: (props: QuickAddDialogProps) =>
    props.open ? <output aria-label="Quick add probe">{JSON.stringify(props.options.prefill ?? null)}</output> : null,
}))

function Probe() {
  const search = useSearch()
  const location = useLocation()
  return (
    <>
      <button type="button" onClick={() => search.open()}>
        Open search
      </button>
      <output aria-label="Location">{location.pathname}</output>
    </>
  )
}

function renderApp() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <OverlayProvider>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </OverlayProvider>
    </MemoryRouter>,
  )
}

const at = (day: number) => new Date(2026, 9, day, 9, 0).toISOString()

describe('SearchPalette', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('SE1 shows highlighted results for "stable" and opens a note on Enter', async () => {
    const newest = makeNote({
      mode: 'writing',
      task_type: 'task1',
      topic: 'Stability',
      upgraded_text: 'remained relatively stable',
      mastery_status: 'mastered',
      created_at: at(5),
      updated_at: at(5),
    })
    await db.notes.bulkAdd([
      newest,
      makeNote({ mode: 'writing', topic: 'Stability', upgraded_text: 'remained broadly unchanged', created_at: at(4), updated_at: at(4) }),
      makeNote({
        mode: 'writing',
        topic: 'Stability',
        original_text: 'The sales of e-books kept stable in 2 million.',
        upgraded_text: 'Sales of e-books maintained a stable level of around 2 million copies.',
        created_at: at(3),
        updated_at: at(3),
      }),
      makeNote({ mode: 'writing', topic: 'Increase', upgraded_text: 'increased sharply', created_at: at(2), updated_at: at(2) }),
    ])
    await db.paragraphs.add(
      makeParagraph({ title: 'Task 1 — Opposite Trends', body: 'Visitor numbers at the Botanical Garden remained relatively stable.' }),
    )
    const user = userEvent.setup({ delay: null })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Open search' }))

    const input = await screen.findByRole('combobox', { name: 'Search notes' })
    expect(input).toHaveFocus()
    await user.type(input, 'stable')

    const listbox = screen.getByRole('listbox')
    const notesGroup = await within(listbox).findByRole('group', { name: /^Notes/ })
    expect(within(notesGroup).getAllByRole('option')).toHaveLength(3)
    const paragraphGroup = within(listbox).getByRole('group', { name: /^Model paragraphs/ })
    expect(within(paragraphGroup).getAllByRole('option')).toHaveLength(1)
    expect(within(listbox).queryByRole('group', { name: /Recent notes/ })).toBeNull()
    expect(within(listbox).queryByText('increased sharply')).toBeNull()

    const marks = listbox.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThanOrEqual(3)
    expect([...marks].map((m) => m.textContent?.toLowerCase())).toContain('stable')
    // The note found only by its topic shows the highlighted topic.
    expect([...marks].map((m) => m.textContent)).toContain('Stability')

    const first = within(listbox).getAllByRole('option')[0]
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', first.id)
    expect(first).toHaveTextContent('remained relatively stable')

    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Location')).toHaveTextContent(`/notes/${newest.id}`)
    await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Search notes' })).toBeNull())
  })

  it('SE1b arrow keys move the active row and Enter opens a model paragraph', async () => {
    const paragraph = makeParagraph({ title: 'Task 1 — Opposite Trends', body: 'The three attractions showed markedly different trends.' })
    await db.notes.add(makeNote({ upgraded_text: 'markedly different', created_at: at(2), updated_at: at(2) }))
    await db.paragraphs.add(paragraph)
    const user = userEvent.setup({ delay: null })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    const input = await screen.findByRole('combobox', { name: 'Search notes' })
    await user.type(input, 'markedly')
    await screen.findByRole('group', { name: /^Model paragraphs/ })
    expect(screen.getAllByRole('option')).toHaveLength(2)

    await user.keyboard('{ArrowDown}')
    const options = screen.getAllByRole('option')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id)
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Location')).toHaveTextContent(`/writing/paragraphs/${paragraph.id}`)
  })

  it('SE1c an empty query shows recent notes and a hint', async () => {
    await db.notes.bulkAdd(
      Array.from({ length: 7 }, (_, i) => makeNote({ upgraded_text: `Recent sentence ${i + 1}.`, created_at: at(i + 1), updated_at: at(i + 1) })),
    )
    const user = userEvent.setup({ delay: null })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    const recent = await screen.findByRole('group', { name: /Recent notes/ })
    await waitFor(() => expect(within(recent).getAllByRole('option')).toHaveLength(5))
    expect(within(recent).getAllByRole('option')[0]).toHaveTextContent('Recent sentence 7.')
    expect(screen.getByText(/Try:/)).toHaveTextContent('Try: stable · visitors to · Travel')
  })

  it('SE1e an arrow key pressed right after typing, before the results update, is kept', async () => {
    await db.notes.bulkAdd([
      makeNote({ upgraded_text: 'remained relatively stable', created_at: at(3), updated_at: at(3) }),
      makeNote({ upgraded_text: 'a stable level', created_at: at(2), updated_at: at(2) }),
      makeNote({ upgraded_text: 'Unrelated recent note', created_at: at(4), updated_at: at(4) }),
    ])
    const user = userEvent.setup({ delay: null })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    const input = await screen.findByRole('combobox', { name: 'Search notes' })
    await screen.findByRole('group', { name: /Recent notes/ })
    // Typing and ArrowDown both land inside the 80ms debounce, while Recent notes still shows.
    await user.type(input, 'stable{ArrowDown}')
    const results = await screen.findByRole('group', { name: /^Notes/ })
    const options = within(results).getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('SE1d an empty notebook shows no search tips', async () => {
    const user = userEvent.setup({ delay: null })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    expect(await screen.findByText('No notes yet. Saved notes appear here.')).toBeInTheDocument()
    expect(screen.queryByText(/Try:/)).toBeNull()
  })

  it('SE2 the no-result action opens Quick Add with the query as the upgrade', async () => {
    await db.notes.add(makeNote({ upgraded_text: 'The scenery was beautiful.' }))
    const user = userEvent.setup({ delay: null })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    const input = await screen.findByRole('combobox', { name: 'Search notes' })
    await user.type(input, 'zzqx')

    expect(await screen.findByText('No notes match “zzqx”.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save “zzqx” as a new note' }))

    const probe = await screen.findByLabelText('Quick add probe')
    expect(JSON.parse(probe.textContent ?? 'null')).toEqual({ upgraded_text: 'zzqx' })
    await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Search notes' })).toBeNull())
  })
})
