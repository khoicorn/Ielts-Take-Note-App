import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { db, resetDb } from '@/lib/db'
import { makeNote } from '@/lib/fixtures'
import type { Note } from '@/lib/types'
import { MistakesScreen } from './MistakesScreen'

const openQuickAdd = vi.fn()

vi.mock('@/app/overlays', () => ({
  useQuickAdd: () => ({ open: openQuickAdd, close: vi.fn(), isOpen: false }),
}))

function renderScreen(path = '/mistakes') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/mistakes" element={<MistakesScreen />} />
            <Route path="/notes/:id" element={<p>Note page</p>} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

function visitorsNote(i: number, overrides: Partial<Note> = {}): Note {
  return makeNote({
    id: `visitors-${i}`,
    mode: 'writing',
    task_type: 'task1',
    topic: 'Increase',
    original_text: `The number of visitors of museum ${i} increased.`,
    upgraded_text: `The number of visitors to museum ${i} increased.`,
    explanation: 'The visitors travel to the place. They do not belong to it.',
    note_type: 'correction',
    error_type: 'Prepositions',
    error_pattern: 'visitors of + place',
    fix_pattern: 'visitors to + place',
    created_at: new Date(2026, 9, i, 9, 0).toISOString(),
    updated_at: new Date(2026, 9, i, 9, 0).toISOString(),
    ...overrides,
  })
}

describe('MistakesScreen', { timeout: 15000 }, () => {
  beforeEach(async () => {
    await resetDb()
    openQuickAdd.mockReset()
  })

  it('MS1 ledger renders the habit, how often it was seen, and the fix', async () => {
    await db.notes.bulkAdd([1, 2, 3, 4].map((i) => visitorsNote(i)))
    await db.notes.add(
      makeNote({ id: 'articles-1', error_type: 'Articles', error_pattern: 'price of + noun', fix_pattern: 'the price of + noun' }),
    )
    renderScreen()

    const habit = await screen.findByText('visitors of + place')
    const pattern = habit.closest('article') as HTMLElement
    expect(pattern).not.toBeNull()
    expect(within(pattern).getByText('Seen 4 times in 4 notes.')).toBeInTheDocument()
    expect(within(pattern).getByText('visitors to + place')).toBeInTheDocument()
    // Seen 3 or more times: a "Frequent" marker in words, not color alone.
    expect(within(pattern).getByText('Frequent')).toBeInTheDocument()
    expect(screen.getByText('Error Ledger')).toBeInTheDocument()
    // The group has an anchor id for links from Today.
    expect(document.getElementById('prepositions')).not.toBeNull()
    // A habit seen once is not repeated yet.
    expect(screen.getByRole('heading', { name: 'Not yet repeated' })).toBeInTheDocument()
    expect(screen.getByText('price of + noun')).toBeInTheDocument()
  })

  it('MS2 related notes toggle shows and hides the notes for a pattern', async () => {
    await db.notes.bulkAdd([1, 2, 3, 4].map((i) => visitorsNote(i)))
    const user = userEvent.setup({ delay: null })
    renderScreen()

    const toggle = await screen.findByRole('button', { name: /Related notes/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('The number of visitors to museum 1 increased.')).toBeNull()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    for (const i of [1, 2, 3, 4]) {
      expect(screen.getByText(`The number of visitors to museum ${i} increased.`)).toBeInTheDocument()
    }
    const link = screen.getByText('The number of visitors to museum 1 increased.').closest('a')
    expect(link).toHaveAttribute('href', '/notes/visitors-1')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('The number of visitors to museum 1 increased.')).toBeNull()
  })

  it('MS3 empty notebook shows the calm empty state', async () => {
    await db.notes.add(makeNote({ id: 'plain' }))
    renderScreen()
    expect(await screen.findByText('No mistakes logged yet')).toBeInTheDocument()
    expect(
      screen.getByText('When you save a correction, add its error type. Repeated habits appear here.'),
    ).toBeInTheDocument()
  })

  it('MS4 mode tabs limit the ledger to Speaking or Writing', async () => {
    await db.notes.bulkAdd([1, 2].map((i) => visitorsNote(i)))
    await db.notes.bulkAdd(
      [1, 2].map((i) =>
        makeNote({
          id: `scenery-${i}`,
          mode: 'speaking',
          error_type: 'Word Choice',
          error_pattern: 'scenario (for views)',
          fix_pattern: 'scenery',
        }),
      ),
    )
    renderScreen('/mistakes?mode=speaking')
    expect(await screen.findByText('scenario (for views)')).toBeInTheDocument()
    expect(screen.queryByText('visitors of + place')).toBeNull()
  })
})
