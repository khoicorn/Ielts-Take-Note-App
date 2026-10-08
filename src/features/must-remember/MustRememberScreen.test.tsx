import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, resetDb } from '@/lib/db'
import { makeNote, makeParagraph } from '@/lib/fixtures'
import { renderScreen, setViewportWidth } from '@/features/all-notes/testUtils'
import { MustRememberScreen } from './MustRememberScreen'

vi.mock('@/app/overlays', () => ({
  useQuickAdd: () => ({ open: () => {}, close: () => {}, isOpen: false }),
  useSearch: () => ({ open: () => {}, close: () => {}, isOpen: false }),
}))

beforeEach(async () => {
  await resetDb()
  setViewportWidth(1440)
})

describe('MustRememberScreen', () => {
  it('MR1 shows only Must Remember notes and paragraphs; removing the mark takes a note off the page', async () => {
    await db.notes.bulkAdd([
      makeNote({ mode: 'speaking', topic: 'Travel', original_text: 'We enjoyed the scenario.', upgraded_text: 'Fav speaking', is_favorite: true }),
      makeNote({ mode: 'writing', task_type: 'task1', topic: 'Increase', upgraded_text: 'Fav writing', is_favorite: true, reusable_pattern: 'The number of visitors to ___ increased.' }),
      makeNote({ upgraded_text: 'Plain note' }),
      makeNote({ upgraded_text: 'Archived fav', is_favorite: true, is_archived: true }),
    ])
    await db.paragraphs.bulkAdd([
      makeParagraph({ title: 'Opposite Trends', body: 'From 2012 to 2022, the three attractions showed markedly different trends.', is_favorite: true }),
      makeParagraph({ title: 'Plain paragraph', body: 'Not marked.' }),
    ])
    const user = userEvent.setup({ delay: null })
    renderScreen('/must-remember', <MustRememberScreen />)

    expect(await screen.findByText('Fav speaking')).toBeInTheDocument()
    expect(screen.getByText('Fav writing')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Opposite Trends' })).toBeInTheDocument()
    expect(screen.queryByText('Plain note')).not.toBeInTheDocument()
    expect(screen.queryByText('Archived fav')).not.toBeInTheDocument()
    expect(screen.queryByText('Plain paragraph')).not.toBeInTheDocument()
    expect(screen.getByText('Reusable pattern')).toBeInTheDocument()

    const item = screen.getByText('Fav speaking').closest('article') as HTMLElement
    const toggle = within(item).getByRole('button', { name: 'Must remember' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await user.click(toggle)

    await waitFor(() => expect(screen.queryByText('Fav speaking')).not.toBeInTheDocument())
    expect(await screen.findByText('Removed from Must Remember.')).toBeInTheDocument()
    const stored = (await db.notes.toArray()).find((n) => n.upgraded_text === 'Fav speaking')
    expect(stored?.is_favorite).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Fav speaking')).toBeInTheDocument()
  })

  it('MR2 the mode tabs filter notes', async () => {
    await db.notes.bulkAdd([
      makeNote({ mode: 'speaking', upgraded_text: 'Fav speaking', is_favorite: true }),
      makeNote({ mode: 'writing', task_type: 'task2', upgraded_text: 'Fav writing', is_favorite: true }),
    ])
    const user = userEvent.setup({ delay: null })
    renderScreen('/must-remember', <MustRememberScreen />)
    await screen.findByText('Fav speaking')
    await user.click(screen.getByRole('link', { name: /^Writing/ }))
    await waitFor(() => expect(screen.queryByText('Fav speaking')).not.toBeInTheDocument())
    expect(screen.getByText('Fav writing')).toBeInTheDocument()
  })

  it('MR3 the empty page explains how to add notes', async () => {
    renderScreen('/must-remember', <MustRememberScreen />)
    expect(await screen.findByText('Nothing marked yet')).toBeInTheDocument()
  })
})
