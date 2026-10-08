import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OverlayProvider } from '@/app/overlays'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { addDays, startOfDay } from '@/lib/dates'
import { db, resetDb } from '@/lib/db'
import { makeNote, TRAVEL_NOTE } from '@/lib/fixtures'
import { ReviewScreen } from './ReviewScreen'

// Quick Add and Search are built by other tasks in parallel. The review tests only need the overlay API.
vi.mock('@/features/quick-add/QuickAddDialog', () => ({ QuickAddDialog: () => null }))
vi.mock('@/features/search/SearchPalette', () => ({ SearchPalette: () => null }))

/** A due time in the past, `hours` before now. Older notes come first in the queue. */
function dueHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function renderReview(path = '/review') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ConfirmProvider>
          <OverlayProvider>
            <Routes>
              <Route path="/review" element={<ReviewScreen />} />
              <Route path="/" element={<p>Today page</p>} />
              <Route path="/notes/:id" element={<p>Note page</p>} />
            </Routes>
          </OverlayProvider>
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

/** Moves focus to the page, so the next key goes to the review shortcuts and not to a focused button. */
function blurAll() {
  act(() => (document.activeElement as HTMLElement | null)?.blur())
}

const WRITING_NOTE = {
  mode: 'writing' as const,
  task_type: 'task1' as const,
  topic: 'Stability',
  original_text: 'The sales of e-books kept stable in 2 million.',
  upgraded_text: 'Sales of e-books maintained a stable level of around 2 million copies.',
  note_type: 'correction' as const,
}

describe('ReviewScreen', () => {
  beforeEach(async () => {
    await resetDb()
    localStorage.clear()
  })

  it('V1 empty queue shows the empty state', async () => {
    renderReview()
    expect(await screen.findByRole('heading', { name: 'Nothing is waiting for review.' })).toBeInTheDocument()
    expect(screen.getByText('Add notes and they will appear here.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Add a note' })).toBeInTheDocument()
  })

  it('V1b empty queue names the next review day', async () => {
    const tomorrow = startOfDay(addDays(new Date(), 1)).toISOString()
    await db.notes.bulkAdd([
      makeNote({ ...TRAVEL_NOTE, id: 'later-1', next_review_at: tomorrow }),
      makeNote({ ...WRITING_NOTE, id: 'later-2', next_review_at: tomorrow }),
    ])
    renderReview()
    expect(await screen.findByText('Next review tomorrow · 2 notes')).toBeInTheDocument()
  })

  it('V2 Reveal by Space shows "Better English" and the answer', async () => {
    await db.notes.add(makeNote({ ...TRAVEL_NOTE, id: 'travel', is_favorite: true }))
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByRole('heading', { name: 'Recall the better version' })).toBeInTheDocument()
    expect(screen.getByText('What I Said')).toBeInTheDocument()
    expect(screen.getByText('We enjoyed the scenario.')).toBeInTheDocument()
    expect(screen.getByText('Must Remember')).toBeInTheDocument()
    expect(screen.queryByText('Better English')).not.toBeInTheDocument()
    expect(screen.queryByText('The scenery was beautiful.')).not.toBeInTheDocument()

    blurAll()
    await user.keyboard(' ')
    expect(await screen.findByText('Better English')).toBeInTheDocument()
    expect(screen.getByText('The scenery was beautiful.')).toBeInTheDocument()
    expect(screen.getByText('In context')).toBeInTheDocument()
    // Ratings carry the next gap. Stage 0: Again tomorrow, Good tomorrow, Easy 3 days.
    expect(screen.getByRole('button', { name: /^Again/ })).toHaveTextContent('Tomorrow')
    expect(screen.getByRole('button', { name: /^Easy/ })).toHaveTextContent('3 days')
    expect(screen.getByRole('button', { name: /^Good/ })).toHaveFocus()
  })

  it('V3 pressing 3 (Good) writes a review row and advances', async () => {
    await db.notes.bulkAdd([
      makeNote({ ...TRAVEL_NOTE, id: 'first', next_review_at: dueHoursAgo(48) }),
      makeNote({ ...WRITING_NOTE, id: 'second', next_review_at: dueHoursAgo(24) }),
    ])
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByText('1 of 2')).toBeInTheDocument()
    blurAll()
    await user.keyboard(' ')
    await screen.findByText('Better English')
    await user.keyboard('3')

    expect(await screen.findByText('2 of 2')).toBeInTheDocument()
    expect(screen.getByText('The sales of e-books kept stable in 2 million.')).toBeInTheDocument()
    expect(screen.queryByText('Better English')).not.toBeInTheDocument()
    const reviews = await db.reviews.toArray()
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({ note_id: 'first', rating: 'good', review_type: 'upgrade', new_stage: 1 })
    expect((await db.notes.get('first'))?.times_reviewed).toBe(1)
  })

  it('V4 Again re-queues the note once (again at the end, then not a third time)', async () => {
    await db.notes.add(makeNote({ ...TRAVEL_NOTE, id: 'travel' }))
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByText('1 of 1')).toBeInTheDocument()
    blurAll()
    await user.keyboard(' ')
    await screen.findByText('Better English')
    await user.keyboard('1')

    expect(await screen.findByText('2 of 2')).toBeInTheDocument()
    expect(screen.getByText('We enjoyed the scenario.')).toBeInTheDocument()
    expect(screen.getByText('Review again soon.')).toBeInTheDocument()

    blurAll()
    await user.keyboard(' ')
    await screen.findByText('Better English')
    await user.keyboard('1')

    expect(await screen.findByRole('heading', { name: 'Session complete' })).toBeInTheDocument()
    expect(await db.reviews.count()).toBe(2)
    expect(screen.getByText('1 note reviewed.')).toBeInTheDocument()
    expect(screen.getByText('1 to see again soon.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'To see again soon' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review more' })).not.toBeInTheDocument()
  })

  it('V5 mode filter limits the session to one mode', async () => {
    await db.notes.bulkAdd([
      makeNote({ ...TRAVEL_NOTE, id: 'speaking', next_review_at: dueHoursAgo(48) }),
      makeNote({ ...WRITING_NOTE, id: 'writing', next_review_at: dueHoursAgo(24) }),
    ])
    renderReview('/review?mode=writing')
    expect(await screen.findByText('1 of 1')).toBeInTheDocument()
    expect(screen.getByText('My Sentence')).toBeInTheDocument()
    expect(screen.getByText('The sales of e-books kept stable in 2 million.')).toBeInTheDocument()
    expect(screen.queryByText('We enjoyed the scenario.')).not.toBeInTheDocument()
  })

  it('V6 fill_blank card shows "_____" and the answer on reveal', async () => {
    await db.notes.add(
      makeNote({
        id: 'gallery',
        mode: 'writing',
        task_type: 'task1',
        topic: 'Decrease',
        original_text: 'The National Gallery had a steady decline.',
        upgraded_text: 'The National Gallery experienced a steady decline.',
        example_sentence: 'The National Gallery **experienced** a steady decline in attendance.',
        // Mixed style: from the third review the note rotates. [upgrade, fill_blank] → index (3 - 2) % 2 = 1.
        times_reviewed: 3,
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByRole('heading', { name: 'Fill in the blank' })).toBeInTheDocument()
    const prompt = screen.getByTestId('review-prompt')
    expect(prompt).toHaveTextContent('The National Gallery _____ a steady decline in attendance.')
    expect(prompt).not.toHaveTextContent('experienced')
    expect(screen.getByRole('img', { name: 'blank' })).toBeInTheDocument()

    blurAll()
    await user.keyboard(' ')
    await waitFor(() => expect(screen.getByTestId('review-prompt')).toHaveTextContent('experienced'))
    expect(screen.getByText('experienced')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'blank' })).not.toBeInTheDocument()
  })

  it('V7 a typed answer is compared with the answer after reveal', async () => {
    await db.notes.add(makeNote({ ...TRAVEL_NOTE, id: 'travel' }))
    const user = userEvent.setup({ delay: null })
    renderReview()
    await user.click(await screen.findByRole('button', { name: 'Type your answer (optional)' }))
    const field = screen.getByLabelText('Your answer')
    expect(field).toHaveFocus()
    await user.type(field, 'The scenery is beautiful')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Better English')).toBeInTheDocument()
    const typed = screen.getByTestId('typed-answer')
    expect(typed).toHaveTextContent('extra: is')
    expect(typed).toHaveTextContent('missing: was')
    expect(typed).not.toHaveTextContent('Matches')
  })

  it('V8 Esc ends the review and goes to Today', async () => {
    await db.notes.add(makeNote({ ...TRAVEL_NOTE, id: 'travel' }))
    const user = userEvent.setup({ delay: null })
    renderReview()
    await screen.findByRole('heading', { name: 'Recall the better version' })
    await user.keyboard('{Escape}')
    expect(await screen.findByText('Today page')).toBeInTheDocument()
  })

  it('V9 a note with only upgraded_text reviews without empty labels or "undefined"', async () => {
    await db.notes.add(makeNote({ id: 'bare', upgraded_text: 'remained relatively stable' }))
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByRole('heading', { name: 'Use it in a full sentence' })).toBeInTheDocument()
    blurAll()
    await user.keyboard(' ')
    expect(await screen.findByText('In context')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Why/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Reusable pattern')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/undefined|null/)
    await user.keyboard('3')
    expect(await screen.findByRole('heading', { name: 'Session complete' })).toBeInTheDocument()
    expect(screen.getByText('1 note reviewed.')).toBeInTheDocument()
  })
})
