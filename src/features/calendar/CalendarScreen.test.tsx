import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetDb } from '@/lib/db'
import { makeNote, makeReview } from '@/lib/fixtures'
import { CalendarScreen } from './CalendarScreen'

const NOW = new Date(2026, 9, 7, 12, 0)

function renderCalendar() {
  return render(
    <MemoryRouter initialEntries={['/calendar']}>
      <CalendarScreen now={NOW} />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDb()
  const notes = [
    makeNote({ date_created: '2026-10-07', upgraded_text: 'The scenery was beautiful.' }),
    makeNote({ date_created: '2026-10-07', upgraded_text: 'I usually go to bed late.' }),
    makeNote({ date_created: '2026-10-07', upgraded_text: 'The figure was just under 30%.' }),
    makeNote({ date_created: '2026-10-07', upgraded_text: 'An archived upgrade.', is_archived: true }),
    makeNote({ date_created: '2026-09-20', upgraded_text: 'A September upgrade.' }),
  ]
  await db.notes.bulkAdd(notes)
  const reviews = Array.from({ length: 12 }, () => makeReview({ note_id: notes[0].id, review_date: '2026-10-07' }))
  reviews.push(makeReview({ note_id: notes[4].id, review_date: '2026-09-20' }))
  await db.reviews.bulkAdd(reviews)
})

describe('CalendarScreen', () => {
  it('K-2 each day button carries its counts in the aria-label', async () => {
    renderCalendar()
    const day = await screen.findByRole('button', { name: '7 October: 12 reviews, 3 notes added' })
    expect(day).toHaveAttribute('aria-current', 'date')
    expect(screen.getByRole('button', { name: '8 October: nothing recorded' })).toBeInTheDocument()
    expect(screen.getByText('Studied 1 day · 3 notes added · 12 reviews')).toBeInTheDocument()
  })

  it('K-3 the selected day panel lists the notes added that day', async () => {
    renderCalendar()
    const panel = await screen.findByRole('region', { name: 'Wednesday, 7 October' })
    expect(await within(panel).findByText('12 reviews completed · 3 notes added')).toBeInTheDocument()
    expect(within(panel).getByText('The scenery was beautiful.')).toBeInTheDocument()
    expect(within(panel).getByText('I usually go to bed late.')).toBeInTheDocument()
    expect(within(panel).queryByText('An archived upgrade.')).not.toBeInTheDocument()
  })

  it('K-4 arrow keys move the selected day; Enter keeps it', async () => {
    renderCalendar()
    const day = await screen.findByRole('button', { name: '7 October: 12 reviews, 3 notes added' })
    act(() => day.focus())
    await userEvent.keyboard('{ArrowRight}')
    expect(await screen.findByRole('region', { name: 'Thursday, 8 October' })).toBeInTheDocument()
    expect(screen.getByText('Nothing recorded on this day.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '8 October: nothing recorded' })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(await screen.findByRole('region', { name: 'Thursday, 1 October' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    // Leaving the month moves the grid to September.
    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Wednesday, 30 September' })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('region', { name: 'Wednesday, 30 September' })).toBeInTheDocument()
  })

  it('K-5 previous, next and Today buttons change the month', async () => {
    renderCalendar()
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    expect(await screen.findByText('Studied 1 day · 1 note added · 1 review')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '20 September: 1 review, 1 note added' }))
    expect(await screen.findByRole('region', { name: 'Sunday, 20 September' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Wednesday, 7 October' })).toBeInTheDocument()
  })
})
