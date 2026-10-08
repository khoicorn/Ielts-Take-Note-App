import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, resetDb } from '@/lib/db'
import { makeNote } from '@/lib/fixtures'
import { currentUrl, renderScreen, setViewportWidth } from '@/features/all-notes/testUtils'
import { WritingScreen } from './WritingScreen'

const quickAddOpen = vi.fn()
vi.mock('@/app/overlays', () => ({
  useQuickAdd: () => ({ open: quickAddOpen, close: () => {}, isOpen: false }),
  useSearch: () => ({ open: () => {}, close: () => {}, isOpen: false }),
}))

// ParagraphList belongs to the Model Paragraphs task; this test only checks that the tab renders it.
vi.mock('@/features/paragraphs/ParagraphList', () => ({
  ParagraphList: (props: { taskType?: string }) => <div data-testid="paragraph-list" data-task-type={props.taskType ?? ''} />,
}))

beforeEach(async () => {
  await resetDb()
  localStorage.clear()
  quickAddOpen.mockReset()
  setViewportWidth(1440)
})

describe('WritingScreen', () => {
  it('WR1 tabs switch between Task 1, Task 2 and Model Paragraphs', async () => {
    await db.notes.bulkAdd([
      makeNote({ mode: 'writing', task_type: 'task1', task_genre: 'Line Graph', topic: 'Increase', upgraded_text: 'Task one upgrade' }),
      makeNote({ mode: 'writing', task_type: 'task2', task_genre: 'Opinion', topic: 'Concession', upgraded_text: 'Task two upgrade' }),
      makeNote({ mode: 'speaking', topic: 'Travel', upgraded_text: 'Speaking note' }),
    ])
    const user = userEvent.setup({ delay: null })
    renderScreen('/writing', <WritingScreen />)

    expect(await screen.findByText('Task one upgrade')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Increase' })).toBeInTheDocument()
    expect(screen.queryByText('Task two upgrade')).not.toBeInTheDocument()
    expect(screen.queryByText('Speaking note')).not.toBeInTheDocument()

    // Sub-tabs carry note counts ("Task 2 1").
    const tabs = screen.getByRole('navigation', { name: 'Writing sections' })
    expect(within(tabs).getByRole('link', { name: /^Academic Task 1/ })).toHaveAttribute('aria-current', 'page')
    await user.click(within(tabs).getByRole('link', { name: /^Task 2/ }))
    await waitFor(() => expect(currentUrl()).toBe('/writing?tab=task2'))
    expect(await screen.findByText('Task two upgrade')).toBeInTheDocument()
    expect(screen.queryByText('Task one upgrade')).not.toBeInTheDocument()

    await user.click(within(tabs).getByRole('link', { name: /^Model Paragraphs/ }))
    await waitFor(() => expect(currentUrl()).toBe('/writing?tab=paragraphs'))
    expect(await screen.findByTestId('paragraph-list')).toBeInTheDocument()
    expect(screen.queryByText('Task two upgrade')).not.toBeInTheDocument()
  })

  it('WR2 the genre filter narrows notes and New Writing note presets task and topic', async () => {
    await db.notes.bulkAdd([
      makeNote({ mode: 'writing', task_type: 'task1', task_genre: 'Line Graph', topic: 'Increase', upgraded_text: 'Line graph note' }),
      makeNote({ mode: 'writing', task_type: 'task1', task_genre: 'Bar Chart', topic: 'Comparison', upgraded_text: 'Bar chart note' }),
    ])
    const user = userEvent.setup({ delay: null })
    renderScreen('/writing', <WritingScreen />, '/writing?tab=task1&topic=Increase')
    expect(await screen.findByText('Line graph note')).toBeInTheDocument()
    expect(screen.queryByText('Bar chart note')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Writing note' }))
    expect(quickAddOpen).toHaveBeenCalledWith({ mode: 'writing', prefill: { task_type: 'task1', topic: 'Increase' } })

    await user.click(screen.getByRole('link', { name: /^All topics/ }))
    expect(await screen.findByText('Bar chart note')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bar Chart' }))
    await waitFor(() => expect(screen.queryByText('Line graph note')).not.toBeInTheDocument())
    expect(currentUrl()).toContain('genre=Bar+Chart')
  })

  it('WR3 an empty Writing notebook explains itself', async () => {
    renderScreen('/writing', <WritingScreen />)
    expect(await screen.findByText('No Writing notes yet')).toBeInTheDocument()
    expect(screen.getByText('Save the sentences you want to write better next time.')).toBeInTheDocument()
  })
})
