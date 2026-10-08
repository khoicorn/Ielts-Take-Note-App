import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { db, resetDb } from '@/lib/db'
import { makeNote, makeParagraph, makeReview, TRAVEL_NOTE } from '@/lib/fixtures'
import { createNote, rateNote } from '@/lib/repo'
import type { Note } from '@/lib/types'
import { NoteDetailScreen } from './NoteDetailScreen'

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname}</p>
}

function renderAt(id: string, state?: unknown) {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <MemoryRouter initialEntries={[{ pathname: `/notes/${id}`, state }]}>
          <Routes>
            <Route path="/notes/:id" element={<NoteDetailScreen />} />
            <Route path="/notes" element={<p>All notes list</p>} />
          </Routes>
          <Where />
        </MemoryRouter>
      </ConfirmProvider>
    </ToastProvider>,
  )
}

async function addNote(patch: Partial<Note>): Promise<Note> {
  const note = makeNote(patch)
  await db.notes.add(note)
  return note
}

/** True when `a` comes before `b` in the document. */
function before(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

async function openActions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'More actions' }))
  return screen.findByRole('menu')
}

beforeEach(async () => {
  await resetDb()
})

describe('NoteDetailScreen', () => {
  it('ND1 shows the mistake before the upgrade, then Why and context, and hides empty sections', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    renderAt(note.id)

    const original = await screen.findByTestId('note-original')
    const upgraded = screen.getByTestId('note-upgraded')
    expect(original).toHaveTextContent('We enjoyed the scenario.')
    expect(upgraded).toHaveTextContent('The scenery was beautiful.')
    expect(before(original, upgraded)).toBe(true)

    const why = screen.getByText('Why')
    const context = screen.getByText('In context')
    expect(before(upgraded, why)).toBe(true)
    expect(before(why, context)).toBe(true)
    expect(screen.getByText(/refers to the landscape or views/)).toBeInTheDocument()
    expect(screen.getByText('The scenery along the coast was beautiful.')).toBeInTheDocument()

    // Empty sections are hidden, not shown blank.
    expect(screen.queryByText('Reusable pattern')).not.toBeInTheDocument()
    expect(screen.queryByText('Model paragraph')).not.toBeInTheDocument()
    expect(screen.queryByText(/From paragraph/)).not.toBeInTheDocument()
    const meta = screen.getByRole('complementary', { name: 'Note details' })
    expect(within(meta).getByText('Topic')).toBeInTheDocument()
    expect(within(meta).getByText('Travel')).toBeInTheDocument()
    for (const label of ['Subtopic', 'Error type', 'Pattern', 'Tags', 'Task']) {
      expect(within(meta).queryByText(label)).not.toBeInTheDocument()
    }
    // Eyebrow: mode and topic.
    expect(screen.getByTestId('note-eyebrow')).toHaveTextContent('Speaking · Travel')
  })

  it('ND1 shows the pattern, the meta pattern and the source paragraph link when they exist', async () => {
    const paragraph = makeParagraph({ title: 'Task 1 — Opposite Trends' })
    await db.paragraphs.add(paragraph)
    const note = await addNote({
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Increase',
      original_text: 'The number of visitors of the City Zoo increased steadily.',
      upgraded_text: 'The number of visitors to the City Zoo increased steadily.',
      reusable_pattern: 'The number of visitors to ___ increased steadily from ___ to ___.',
      error_type: 'Prepositions',
      error_pattern: 'visitors of + place',
      fix_pattern: 'visitors to + place',
      tags: ['trends'],
      source_paragraph_id: paragraph.id,
    })
    renderAt(note.id)

    expect(await screen.findByText('My Sentence')).toBeInTheDocument()
    expect(screen.getByText('Band 7+ Upgrade')).toBeInTheDocument()
    expect(screen.getByText('Reusable pattern')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'blank' })).toHaveLength(3)
    expect(screen.getByTestId('note-eyebrow')).toHaveTextContent('Writing · Academic Task 1 · Increase')
    const link = await screen.findByRole('link', { name: /From paragraph/ })
    expect(link).toHaveAttribute('href', `/writing/paragraphs/${paragraph.id}`)
    expect(link).toHaveTextContent('Task 1 — Opposite Trends')

    const meta = screen.getByRole('complementary', { name: 'Note details' })
    expect(within(meta).getByText('visitors of + place')).toBeInTheDocument()
    expect(within(meta).getByText('visitors to + place')).toBeInTheDocument()
    expect(within(meta).getByText('Academic Task 1')).toBeInTheDocument()
    expect(within(meta).getByText('Line Graph')).toBeInTheDocument()
    expect(within(meta).getByText('trends')).toBeInTheDocument()
  })

  it('ND2 edit and save changes the text and keeps review_stage, next_review_at and review rows', async () => {
    const created = await createNote({ ...TRAVEL_NOTE, mode: 'speaking', upgraded_text: 'The scenery was beautiful.' })
    await rateNote(created.id, 'good', 'upgrade', new Date(2026, 9, 1, 20))
    await rateNote(created.id, 'good', 'upgrade', new Date(2026, 9, 3, 20))
    await rateNote(created.id, 'easy', 'upgrade', new Date(2026, 9, 6, 20))
    const rated = (await db.notes.get(created.id)) as Note
    expect(rated.review_stage).toBeGreaterThan(0)

    const user = userEvent.setup({ delay: null })
    renderAt(created.id)
    await user.click(await screen.findByRole('button', { name: /^Edit/ }))

    const upgrade = screen.getByLabelText('Native Upgrade')
    expect(upgrade).toHaveValue('The scenery was beautiful.')
    await user.clear(upgrade)
    await user.type(upgrade, 'The scenery was stunning.')
    await user.click(screen.getByRole('button', { name: /Save changes/ }))

    expect(await screen.findByText('Changes saved.')).toBeInTheDocument()
    const saved = (await db.notes.get(created.id)) as Note
    expect(saved.upgraded_text).toBe('The scenery was stunning.')
    expect(saved.review_stage).toBe(rated.review_stage)
    expect(saved.mastery_status).toBe(rated.mastery_status)
    expect(saved.next_review_at).toBe(rated.next_review_at)
    expect(saved.times_reviewed).toBe(3)
    expect(await db.reviews.where('note_id').equals(created.id).count()).toBe(3)
    // Back in reading view with the new text.
    expect(await screen.findByTestId('note-upgraded')).toHaveTextContent('The scenery was stunning.')
  })

  it('ND2 edit refuses an empty upgrade and keeps the note unchanged', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await screen.findByTestId('note-upgraded')
    await user.keyboard('e')
    const upgrade = await screen.findByLabelText('Native Upgrade')
    await user.clear(upgrade)
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(await screen.findByText('Add the better version first.')).toBeInTheDocument()
    expect(upgrade).toHaveFocus()
    expect(((await db.notes.get(note.id)) as Note).upgraded_text).toBe('The scenery was beautiful.')
  })

  it('ND2 Esc with unsaved changes asks before discarding them', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await user.click(await screen.findByRole('button', { name: /^Edit/ }))
    const why = screen.getByLabelText('Why')
    await user.type(why, ' More.')
    await user.keyboard('{Escape}')
    const dialog = await screen.findByRole('dialog', { name: 'Discard your changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Why')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    const again = await screen.findByRole('dialog', { name: 'Discard your changes?' })
    await user.click(within(again).getByRole('button', { name: 'Discard' }))
    await waitFor(() => expect(screen.queryByLabelText('Why')).not.toBeInTheDocument())
    expect(((await db.notes.get(note.id)) as Note).explanation).toBe(TRAVEL_NOTE.explanation)
  })

  it('ND3 delete asks for confirmation; cancel keeps the note; confirm deletes it and its reviews', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    await db.reviews.add(makeReview({ note_id: note.id }))
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await screen.findByTestId('note-upgraded')

    let menu = await openActions(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    let dialog = await screen.findByRole('dialog', { name: 'Delete this note?' })
    expect(dialog).toHaveTextContent('Its review history will be deleted too. This cannot be undone.')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete this note?' })).not.toBeInTheDocument())
    expect(await db.notes.get(note.id)).toBeDefined()
    expect(screen.getByTestId('note-upgraded')).toBeInTheDocument()

    menu = await openActions(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    dialog = await screen.findByRole('dialog', { name: 'Delete this note?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete note' }))
    expect(await screen.findByText('Note deleted.')).toBeInTheDocument()
    expect(await screen.findByText('All notes list')).toBeInTheDocument()
    expect(await db.notes.get(note.id)).toBeUndefined()
    expect(await db.reviews.where('note_id').equals(note.id).count()).toBe(0)
  })

  it('ND4 archive shows the archived line and a toast; Restore brings the note back', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await screen.findByTestId('note-upgraded')

    const menu = await openActions(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Archive' }))
    expect(await screen.findByText('Note archived.')).toBeInTheDocument()
    expect(await screen.findByText('This note is archived. It is hidden from review.')).toBeInTheDocument()
    expect(((await db.notes.get(note.id)) as Note).is_archived).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(screen.queryByText('This note is archived. It is hidden from review.')).not.toBeInTheDocument())
    expect(((await db.notes.get(note.id)) as Note).is_archived).toBe(false)
    expect(await screen.findByText('Note restored.')).toBeInTheDocument()
  })

  it('ND4 the archive toast offers Undo', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await screen.findByTestId('note-upgraded')
    const menu = await openActions(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Archive' }))
    await screen.findByText('Note archived.')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect(((await db.notes.get(note.id)) as Note).is_archived).toBe(false))
  })

  it('ND5 changing mastery calls setMastery (stage and schedule move) and shows the toast', async () => {
    const note = await addNote({ ...TRAVEL_NOTE, mastery_status: 'familiar', review_stage: 3 })
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await user.click(await screen.findByRole('button', { name: /Mastery: Familiar/ }))
    const menu = await screen.findByRole('menu', { name: 'Change mastery' })
    await user.click(within(menu).getByRole('menuitem', { name: /Mastered/ }))
    expect(await screen.findByText('Marked as mastered.')).toBeInTheDocument()
    const saved = (await db.notes.get(note.id)) as Note
    expect(saved.mastery_status).toBe('mastered')
    expect(saved.review_stage).toBe(5)
    expect(await screen.findByRole('button', { name: /Mastery: Mastered/ })).toBeInTheDocument()
    // A manual change writes no review row.
    expect(await db.reviews.count()).toBe(0)
  })

  it('ND6 a note with only upgraded_text renders cleanly', async () => {
    const note = await addNote({ upgraded_text: 'remained relatively stable', note_type: 'useful_expression' })
    const { container } = renderAt(note.id)
    expect(await screen.findByTestId('note-upgraded')).toHaveTextContent('remained relatively stable')
    expect(screen.queryByTestId('note-original')).not.toBeInTheDocument()
    expect(screen.queryByText('What I Said')).not.toBeInTheDocument()
    for (const label of ['Why', 'In context', 'Reusable pattern', 'Model paragraph', 'Topic', 'Tags', 'Pattern']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
    expect(await screen.findByText('No reviews yet.')).toBeInTheDocument()
    expect(screen.getByText('Useful Expression')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/undefined|null|NaN|Invalid Date/)
    expect(screen.getByTestId('note-eyebrow')).toHaveTextContent('Speaking')
  })

  it('ND7 an unknown id shows the not-found state with a link to All Notes', async () => {
    renderAt('missing-id')
    expect(await screen.findByText('This note does not exist.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All notes' })).toHaveAttribute('href', '/notes')
  })

  it('ND8 with a list in location state, ] and [ move to the next and previous note', async () => {
    const a = await addNote({ upgraded_text: 'First note.' })
    const b = await addNote({ upgraded_text: 'Second note.' })
    const user = userEvent.setup({ delay: null })
    renderAt(a.id, { from: '/notes', ids: [a.id, b.id] })
    expect(await screen.findByTestId('note-upgraded')).toHaveTextContent('First note.')
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    await user.keyboard(']')
    expect(await screen.findByText('Second note.')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent(`/notes/${b.id}`)
    await user.keyboard('[[') // '[[' types a literal [ in user-event
    expect(await screen.findByText('First note.')).toBeInTheDocument()
  })

  it('ND9 "I made this mistake again" adds one to times seen and makes the note due', async () => {
    const note = await addNote({ ...TRAVEL_NOTE, review_stage: 4, mastery_status: 'familiar', next_review_at: null })
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await screen.findByTestId('note-upgraded')
    const menu = await openActions(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'I made this mistake again' }))
    expect(await screen.findByText("Logged. It will come back in today's review.")).toBeInTheDocument()
    const saved = (await db.notes.get(note.id)) as Note
    expect(saved.times_seen).toBe(2)
    expect(saved.review_stage).toBe(1)
    expect(saved.next_review_at).not.toBeNull()
  })

  it('ND10 Duplicate opens the copy and shows a toast', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    const user = userEvent.setup({ delay: null })
    renderAt(note.id)
    await screen.findByTestId('note-upgraded')
    const menu = await openActions(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }))
    expect(await screen.findByText('Note duplicated.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('where')).not.toHaveTextContent(`/notes/${note.id}`))
    expect(await db.notes.count()).toBe(2)
  })

  it('ND11 the review history lists date, rating and review type, newest first', async () => {
    const note = await addNote({ ...TRAVEL_NOTE })
    await db.reviews.bulkAdd([
      makeReview({ note_id: note.id, review_date: '2026-09-30', rating: 'good', review_type: 'upgrade', created_at: new Date(2026, 8, 30, 20).toISOString() }),
      makeReview({ note_id: note.id, review_date: '2026-10-06', rating: 'hard', review_type: 'fill_blank', created_at: new Date(2026, 9, 6, 20).toISOString() }),
    ])
    renderAt(note.id)
    const list = await screen.findByRole('list', { name: 'Review history' })
    const rows = await within(list).findAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Tue 6 Oct')
    expect(rows[0]).toHaveTextContent('Hard')
    expect(rows[0]).toHaveTextContent('Fill in the blank')
    expect(rows[1]).toHaveTextContent('Wed 30 Sep')
    expect(rows[1]).toHaveTextContent('Mistake → Upgrade')
  })
})
