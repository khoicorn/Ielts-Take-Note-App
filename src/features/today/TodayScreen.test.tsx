import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { db, resetDb } from '@/lib/db'
import { formatLongDate } from '@/lib/dates'
import { createNote, markExported, setLastStudied } from '@/lib/repo'
import type { NoteDraft } from '@/lib/types'
import { TodayScreen } from './TodayScreen'

// Quick Add belongs to another task. Today only needs to know that it asked for it.
const quickAdd = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn(), isOpen: false }))
vi.mock('@/app/overlays', () => ({ useQuickAdd: () => quickAdd }))

function renderToday() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <TodayScreen />
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function addNotes(count: number, draft: Partial<NoteDraft> = {}, start: 'today' | 'tomorrow' | 'none' = 'today') {
  for (let i = 0; i < count; i++) {
    await createNote({ mode: 'speaking', upgraded_text: `Better sentence ${i + 1}.`, ...draft }, { start })
  }
}

beforeEach(async () => {
  await resetDb()
  quickAdd.open.mockClear()
})

describe('TodayScreen', () => {
  it('T-1 shows the due line for 12, 1 and 0 due items', async () => {
    await addNotes(12)
    const first = renderToday()
    expect(await screen.findByText('Your notebook has 12 items waiting for review.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(formatLongDate(new Date()))
    first.unmount()

    await resetDb()
    await addNotes(1)
    const second = renderToday()
    expect(await screen.findByText('Your notebook has 1 item waiting for review.')).toBeInTheDocument()
    second.unmount()

    await resetDb()
    await addNotes(3, {}, 'tomorrow')
    renderToday()
    expect(await screen.findByText('Nothing is waiting for review today.')).toBeInTheDocument()
    expect(screen.getByText('Next review tomorrow · 3 notes')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Begin Review/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Add a note/ }))
    expect(quickAdd.open).toHaveBeenCalledTimes(1)
  })

  it('T-2 first run shows the three steps and both actions', async () => {
    renderToday()
    const steps = await screen.findByRole('list', { name: 'How it works' })
    const items = within(steps).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Save what you said.')
    expect(items[1]).toHaveTextContent('Save the better version.')
    expect(items[2]).toHaveTextContent('Review it until it sticks.')

    await userEvent.click(screen.getByRole('button', { name: /Add first note/ }))
    expect(quickAdd.open).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Load example notes' }))
    expect(await screen.findByText('Example notes added. Remove them in Settings.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('list', { name: 'How it works' })).not.toBeInTheDocument())
    expect(await screen.findByRole('link', { name: /Begin Review/ })).toBeInTheDocument()
    expect(await db.notes.count()).toBeGreaterThan(10)
  })

  it('T-3 Begin Review links to /review and each mode links to its own session', async () => {
    await addNotes(2)
    await addNotes(1, { mode: 'writing', task_type: 'task1' })
    renderToday()
    const begin = await screen.findByRole('link', { name: /Begin Review/ })
    expect(begin).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: 'Review Speaking only, 2 due' })).toHaveAttribute('href', '/review?mode=speaking')
    expect(screen.getByRole('link', { name: 'Review Writing only, 1 due' })).toHaveAttribute('href', '/review?mode=writing')
  })

  it('T-4 continue studying links to the last notebook page', async () => {
    await addNotes(1)
    await setLastStudied({ mode: 'writing', task_type: 'task1', topic: 'Stability' })
    renderToday()
    const link = await screen.findByRole('link', { name: /Stability/ })
    expect(link).toHaveAttribute('href', '/writing?tab=task1&topic=Stability')
    expect(link).toHaveTextContent('Academic Task 1')
    expect(link).toHaveTextContent('Last studied today')
  })

  it('T-5 recent notes show the 5 newest and most repeated issue links to the ledger', async () => {
    for (let i = 1; i <= 7; i++) {
      await createNote({ mode: 'speaking', upgraded_text: `Upgrade number ${i}.`, error_type: i <= 3 ? 'Prepositions' : '' })
      await new Promise((r) => setTimeout(r, 2))
    }
    renderToday()
    expect(await screen.findByText('Upgrade number 7.')).toBeInTheDocument()
    expect(screen.getByText('Upgrade number 3.')).toBeInTheDocument()
    expect(screen.queryByText('Upgrade number 2.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /All Notes/ })).toHaveAttribute('href', '/notes')
    expect(screen.getByText('Most repeated issue this week')).toBeInTheDocument()
    expect(screen.getByText('Prepositions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /3 notes/ })).toHaveAttribute('href', '/mistakes#prepositions')
  })

  it('T-6 backup line shows with 10 notes and no export, and hides after an export', async () => {
    await addNotes(10)
    renderToday()
    expect(await screen.findByText('No backup yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Export a copy.' })).toHaveAttribute('href', '/settings#data')
    await act(async () => {
      await markExported()
    })
    await waitFor(() => expect(screen.queryByText('No backup yet.')).not.toBeInTheDocument())
  })
})
