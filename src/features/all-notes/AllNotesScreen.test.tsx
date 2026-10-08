import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, resetDb } from '@/lib/db'
import { makeNote } from '@/lib/fixtures'
import { AllNotesScreen } from './AllNotesScreen'
import { currentUrl, renderScreen, setViewportWidth } from './testUtils'

const quickAddOpen = vi.fn()
vi.mock('@/app/overlays', () => ({
  useQuickAdd: () => ({ open: quickAddOpen, close: () => {}, isOpen: false }),
  useSearch: () => ({ open: () => {}, close: () => {}, isOpen: false }),
}))

beforeEach(async () => {
  await resetDb()
  localStorage.clear()
  quickAddOpen.mockReset()
  setViewportWidth(1440)
})

async function seed() {
  await db.notes.bulkAdd([
    makeNote({ mode: 'speaking', topic: 'Travel', original_text: 'We enjoyed the scenario.', upgraded_text: 'Speaking upgrade' }),
    makeNote({ mode: 'writing', task_type: 'task1', topic: 'Increase', upgraded_text: 'Writing upgrade' }),
  ])
}

describe('AllNotesScreen', () => {
  it('AN1 a filter change updates the URL and the rows', async () => {
    await seed()
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />)
    expect(await screen.findByText('Speaking upgrade')).toBeInTheDocument()
    expect(screen.getByText('Writing upgrade')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Filter/ }))
    const panel = await screen.findByRole('dialog', { name: 'Filter notes' })
    await user.click(within(panel).getByRole('radio', { name: 'Writing' }))

    await waitFor(() => expect(currentUrl()).toContain('mode=writing'))
    await waitFor(() => expect(screen.queryByText('Speaking upgrade')).not.toBeInTheDocument())
    expect(screen.getByText('Writing upgrade')).toBeInTheDocument()
    // The active filter shows as a removable tag; removing it brings the other note back.
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Remove Mode: Writing' }))
    await waitFor(() => expect(currentUrl()).not.toContain('mode='))
    expect(await screen.findByText('Speaking upgrade')).toBeInTheDocument()
  }, 15_000)

  it('AN2 the view toggle switches the table to the reading list and is remembered', async () => {
    await seed()
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />)
    await screen.findByText('Speaking upgrade')
    expect(screen.getByRole('list', { name: 'Notes' })).toHaveAttribute('data-view', 'table')
    // The table has column labels.
    expect(screen.getByText('Mistake')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Reading' }))
    expect(screen.getByRole('list', { name: 'Notes' })).toHaveAttribute('data-view', 'reading')
    // Reading view shows the field label before the mistake.
    expect(screen.getByText('What I Said')).toBeInTheDocument()
    expect(localStorage.getItem('ielts-all-notes-view')).toBe('reading')
  })

  it('AN3 the archived view shows Restore; restoring removes the row and focus moves on', async () => {
    const archived = (text: string, day: number) =>
      makeNote({
        upgraded_text: text,
        is_archived: true,
        archived_at: new Date(2026, 9, day).toISOString(),
        created_at: new Date(2026, 9, day).toISOString(),
      })
    await db.notes.bulkAdd([archived('First archived', 3), archived('Second archived', 2), makeNote({ upgraded_text: 'Active upgrade' })])
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />, '/notes?archived=1')
    expect(await screen.findByRole('heading', { name: 'Archived notes' })).toBeInTheDocument()
    expect(await screen.findByText('First archived')).toBeInTheDocument()
    expect(screen.queryByText('Active upgrade')).not.toBeInTheDocument()

    // Each Restore names its note, so the buttons are not all called "Restore".
    screen.getByRole('button', { name: 'Restore: First archived' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByText('First archived')).not.toBeInTheDocument())
    const restored = (await db.notes.toArray()).find((n) => n.upgraded_text === 'First archived')
    expect(restored?.is_archived).toBe(false)
    expect(await screen.findByText('Note restored.')).toBeInTheDocument()
    // Focus goes to the next row, not to the page body.
    expect(screen.getByRole('link', { name: /Second archived/ })).toHaveFocus()

    // The last row: focus goes to the page title.
    screen.getByRole('button', { name: 'Restore: Second archived' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Archived notes' })).toHaveFocus())
  })

  it('AN3b a list filter text with no match talks about the text, not filters', async () => {
    await seed()
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />, '/notes?q=zzzz')
    expect(await screen.findByText('No notes match “zzzz”.')).toBeInTheDocument()
    expect(screen.getByText('Check the spelling or try one word.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(currentUrl()).not.toContain('q='))
    expect(await screen.findByText('Speaking upgrade')).toBeInTheDocument()
  })

  it('AN3c with a filter set, the no-match text still names the filters', async () => {
    await seed()
    renderScreen('/notes', <AllNotesScreen />, '/notes?mode=writing&q=zzzz')
    expect(await screen.findByText('No notes match these filters.')).toBeInTheDocument()
    expect(screen.getByText('Nothing matches “zzzz” with the current filters.')).toBeInTheDocument()
    // One in the filter tag row, one in the empty state.
    expect(screen.getAllByRole('button', { name: 'Clear filters' })).toHaveLength(2)
  })

  it('AN4 an empty notebook offers the first note', async () => {
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />)
    expect(await screen.findByText('No notes yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add first note' }))
    expect(quickAddOpen).toHaveBeenCalled()
  })

  it('AN5 typing in the list filter keeps only matching notes', async () => {
    await seed()
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />)
    await screen.findByText('Speaking upgrade')
    await user.type(screen.getByRole('searchbox', { name: 'Filter this list' }), 'scenario')
    await waitFor(() => expect(screen.queryByText('Writing upgrade')).not.toBeInTheDocument())
    expect(currentUrl()).toContain('q=scenario')
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('AN6 J and K move through the table rows and Enter opens the note', async () => {
    await db.notes.bulkAdd([
      makeNote({ upgraded_text: 'Newer note', date_created: '2026-10-05' }),
      makeNote({ upgraded_text: 'Older note', date_created: '2026-10-01' }),
    ])
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />)
    await screen.findByText('Newer note')
    const rows = within(screen.getByRole('list', { name: 'Notes' })).getAllByRole('link')
    await user.keyboard('j')
    expect(rows[0]).toHaveFocus()
    await user.keyboard('j')
    expect(rows[1]).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(rows[0]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(currentUrl()).toMatch(/^\/notes\/note-/)
  })

  it('AN7 shows 100 rows, then 100 more on request', async () => {
    await db.notes.bulkAdd(Array.from({ length: 105 }, (_, i) => makeNote({ upgraded_text: `Bulk note ${i + 1}` })))
    const user = userEvent.setup({ delay: null })
    renderScreen('/notes', <AllNotesScreen />)
    const list = await screen.findByRole('list', { name: 'Notes' })
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(100))
    await user.click(screen.getByRole('button', { name: 'Show 5 more' }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(105)
  }, 20_000)
})
