import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, resetDb } from '@/lib/db'
import { makeNote } from '@/lib/fixtures'
import { currentUrl, renderScreen, setViewportWidth } from '@/features/all-notes/testUtils'
import { SpeakingScreen } from './SpeakingScreen'

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

describe('SpeakingScreen', () => {
  it('SP1 groups Speaking notes by topic, and ?topic= shows one topic', async () => {
    await db.notes.bulkAdd([
      makeNote({ mode: 'speaking', topic: 'Travel', subtopic: 'Nha Trang trip', original_text: 'We enjoyed the scenario.', upgraded_text: 'The scenery was beautiful.' }),
      makeNote({ mode: 'speaking', topic: 'travel', upgraded_text: 'off the beaten track' }),
      makeNote({ mode: 'speaking', topic: 'Work', upgraded_text: 'My job can be quite stressful.' }),
      makeNote({ mode: 'writing', task_type: 'task1', topic: 'Increase', upgraded_text: 'A writing note' }),
    ])
    const user = userEvent.setup({ delay: null })
    renderScreen('/speaking', <SpeakingScreen />)

    const travel = await screen.findByRole('region', { name: 'Travel' })
    expect(within(travel).getByText('The scenery was beautiful.')).toBeInTheDocument()
    expect(within(travel).getByText('off the beaten track')).toBeInTheDocument()
    // The subtopic shows in the row's meta column (and in the folded meta line used under 640px).
    expect(within(travel).getAllByText('Nha Trang trip').length).toBeGreaterThan(0)
    expect(within(travel).getByText('2 notes · 2 due')).toBeInTheDocument()
    const work = screen.getByRole('region', { name: 'Work' })
    expect(within(work).getByText('My job can be quite stressful.')).toBeInTheDocument()
    expect(screen.queryByText('A writing note')).not.toBeInTheDocument()
    // Larger groups come first.
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings.indexOf('Travel')).toBeLessThan(headings.indexOf('Work'))

    const index = screen.getByRole('navigation', { name: 'Speaking topics' })
    await user.click(within(index).getByRole('link', { name: /^Travel/ }))
    await waitFor(() => expect(currentUrl()).toBe('/speaking?topic=Travel'))
    await waitFor(() => expect(screen.queryByText('My job can be quite stressful.')).not.toBeInTheDocument())
    expect(screen.getByText('The scenery was beautiful.')).toBeInTheDocument()
  })

  it('SP2 the empty notebook explains itself and opens Quick Add in Speaking mode', async () => {
    const user = userEvent.setup({ delay: null })
    renderScreen('/speaking', <SpeakingScreen />)
    expect(await screen.findByText('No Speaking notes yet')).toBeInTheDocument()
    expect(screen.getByText('Save the phrases you wish you had used.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add first note' }))
    expect(quickAddOpen).toHaveBeenCalledWith(expect.objectContaining({ mode: 'speaking' }))
  })

  it('SP3 New Speaking note presets the selected topic', async () => {
    await db.notes.bulkAdd([makeNote({ mode: 'speaking', topic: 'Food', upgraded_text: 'The food was absolutely delicious.' })])
    const user = userEvent.setup({ delay: null })
    renderScreen('/speaking', <SpeakingScreen />, '/speaking?topic=Food')
    await screen.findByText('The food was absolutely delicious.')
    await user.click(screen.getByRole('button', { name: 'New Speaking note' }))
    expect(quickAddOpen).toHaveBeenCalledWith({ mode: 'speaking', prefill: { topic: 'Food' } })
  })
})
