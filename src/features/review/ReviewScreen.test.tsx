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
    // The session loads notes and settings first; give it longer than the 1s default under a full parallel run.
    expect(await screen.findByRole('heading', { name: 'Nothing is waiting for review.' }, { timeout: 3000 })).toBeInTheDocument()
    // The body waits for the due counts (a second live query), so it can land a moment after the heading.
    expect(await screen.findByText('Add notes and they will appear here.', undefined, { timeout: 3000 })).toBeInTheDocument()
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

  it('V10 an empty one-mode session names that mode’s next review only', async () => {
    const tomorrow = startOfDay(addDays(new Date(), 1)).toISOString()
    const inTenDays = startOfDay(addDays(new Date(), 10)).toISOString()
    await db.notes.bulkAdd([
      makeNote({ ...TRAVEL_NOTE, id: 's1', next_review_at: inTenDays }),
      makeNote({ ...TRAVEL_NOTE, id: 's2', next_review_at: inTenDays }),
      makeNote({ ...WRITING_NOTE, id: 'w1', next_review_at: tomorrow }),
    ])
    renderReview('/review?mode=speaking')
    expect(await screen.findByRole('heading', { name: 'Nothing is waiting for review.' })).toBeInTheDocument()
    expect(await screen.findByText('Next Speaking review in 10 days · 2 notes')).toBeInTheDocument()
    expect(screen.queryByText(/tomorrow/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Speaking review' })).toBeInTheDocument()
  })

  it('V11 Again then Good: the end screen shows one count and does not list the note to see again soon', async () => {
    await db.notes.add(makeNote({ ...TRAVEL_NOTE, id: 'travel' }))
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByRole('heading', { level: 1, name: 'Review' })).toBeInTheDocument()
    expect(await screen.findByText('1 of 1')).toBeInTheDocument()
    blurAll()
    await user.keyboard(' ')
    await screen.findByText('Better English')
    await user.keyboard('1')
    expect(await screen.findByText('2 of 2')).toBeInTheDocument()
    blurAll()
    await user.keyboard(' ')
    await screen.findByText('Better English')
    await user.keyboard('3')

    expect(await screen.findByRole('heading', { level: 1, name: 'Session complete' })).toBeInTheDocument()
    expect(screen.getByText('1 note reviewed.')).toBeInTheDocument()
    expect(screen.queryByText(/\d+ of \d+/)).not.toBeInTheDocument()
    expect(screen.queryByText(/to see again soon/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'To see again soon' })).not.toBeInTheDocument()
  })

  it('V12 Writing cards ask to write or say the answer; Speaking cards to say it', async () => {
    await db.notes.bulkAdd([
      makeNote({ ...TRAVEL_NOTE, id: 'speaking', next_review_at: dueHoursAgo(48) }),
      makeNote({ ...WRITING_NOTE, id: 'writing', next_review_at: dueHoursAgo(24) }),
    ])
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByText('Say it aloud first, then reveal.')).toBeInTheDocument()
    blurAll()
    await user.keyboard(' ')
    await screen.findByText('Better English')
    await user.keyboard('3')
    expect(await screen.findByText('Write or say it first, then reveal.')).toBeInTheDocument()
  })

  it('V10 design v1.2: a Must Remember card has the bookmark; a short answer is serif, a long one stays Inter', async () => {
    const long = 'In conclusion, governments should introduce stricter policies to tackle this issue in the long term.'
    await db.notes.bulkAdd([
      makeNote({ ...TRAVEL_NOTE, id: 'marked', is_favorite: true, next_review_at: dueHoursAgo(48) }),
      makeNote({ ...WRITING_NOTE, id: 'long', upgraded_text: long, next_review_at: dueHoursAgo(24) }),
    ])
    const user = userEvent.setup({ delay: null })
    renderReview()
    expect(await screen.findByText('1 of 2')).toBeInTheDocument()
    // Decorative only: the meta line says "Must Remember" in words.
    expect(document.querySelector('[data-bookmark]')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Must Remember')).toBeInTheDocument()
    blurAll()
    await user.keyboard(' ')
    expect(await screen.findByTestId('review-answer')).toHaveClass('font-serif', 'text-answer', 'text-upgrade')

    await user.keyboard('3')
    expect(await screen.findByText('2 of 2')).toBeInTheDocument()
    expect(document.querySelector('[data-bookmark]')).toBeNull()
    blurAll()
    await user.keyboard(' ')
    const answer = await screen.findByTestId('review-answer')
    expect(answer).toHaveTextContent(long)
    expect(answer).toHaveClass('text-recall', 'text-upgrade')
    expect(answer).not.toHaveClass('font-serif')
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
