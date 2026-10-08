import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetDb } from './db'
import { parseImport } from './exporters'
import { makeNote, makeParagraph, makeReview } from './fixtures'
import {
  archiveNote,
  archiveParagraph,
  createNote,
  createParagraph,
  deleteAllData,
  deleteNote,
  deleteParagraph,
  duplicateNote,
  exportBundle,
  getSettings,
  importBundle,
  loadExampleData,
  markExported,
  markSeenAgain,
  rateNote,
  removeExampleData,
  repairStoredNotes,
  restoreNote,
  restoreParagraph,
  setLastStudied,
  setMastery,
  toggleFavorite,
  updateNote,
  updateParagraph,
  updateSettings,
} from './repo'
import { isDue } from './srs'
import { EXAMPLE_TAG } from './taxonomy'
import type { ExportBundle, NoteContentPatch } from './types'
import { mostRepeatedIssue } from './mistakes'
import { computeDueCounts, studyStreak } from './stats'

const NOW = new Date(2026, 9, 7, 10, 0)
const LATER = new Date(2026, 9, 7, 11, 0)

beforeEach(async () => {
  await resetDb()
  localStorage.clear()
})

describe('repo: notes', () => {
  it('P1 cleans text, normalizes tags and sets defaults', async () => {
    const note = await createNote(
      {
        mode: 'speaking',
        topic: '  Travel ',
        original_text: '  “We enjoyed the scenario.” ',
        upgraded_text: '"The scenery   was beautiful."',
        example_sentence: '‘The scenery along the coast was beautiful.’',
        reusable_pattern: ' The ___ was beautiful. ',
        task_type: 'task1',
        task_genre: 'Line Graph',
        tags: ['#Travel', 'travel', ' Nha Trang ', ''],
      },
      { now: NOW },
    )
    expect(note).toMatchObject({
      topic: 'Travel',
      original_text: 'We enjoyed the scenario.',
      upgraded_text: 'The scenery was beautiful.',
      example_sentence: 'The scenery along the coast was beautiful.',
      reusable_pattern: 'The ___ was beautiful.',
      tags: ['travel', 'nha-trang'],
      task_type: '',
      task_genre: '',
      note_type: 'correction',
      date_created: '2026-10-07',
      times_seen: 1,
      times_reviewed: 0,
      review_stage: 0,
      mastery_status: 'new',
      next_review_at: NOW.toISOString(),
      last_reviewed_at: null,
      is_favorite: false,
      is_archived: false,
      archived_at: null,
      source_paragraph_id: null,
      difficulty: 0,
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    })
    expect(await db.notes.get(note.id)).toEqual(note)
    const phrase = await createNote({ mode: 'writing', upgraded_text: 'remained relatively stable', task_type: 'task1' }, { now: NOW })
    expect(phrase.note_type).toBe('useful_expression')
    expect(phrase.task_type).toBe('task1')
    expect(await db.meta.get('persist_requested')).toBeDefined()
  })

  it('P2 refuses a note without the upgrade', async () => {
    await expect(createNote({ mode: 'speaking', upgraded_text: '   ' })).rejects.toThrow('Add the better version first.')
    await expect(createNote({ mode: 'speaking', upgraded_text: '“”' })).rejects.toThrow('Add the better version first.')
    expect(await db.notes.count()).toBe(0)
  })

  it('P3 can skip review scheduling', async () => {
    const note = await createNote({ mode: 'speaking', upgraded_text: 'x' }, { start: 'none', now: NOW })
    expect(note.next_review_at).toBeNull()
    expect(isDue(note, NOW)).toBe(false)
    const tomorrow = await createNote({ mode: 'speaking', upgraded_text: 'y' }, { start: 'tomorrow', now: NOW })
    expect(tomorrow.next_review_at).toBe(new Date(2026, 9, 8).toISOString())
  })

  it('P4 editing text keeps the review state and history', async () => {
    const note = await createNote({ mode: 'speaking', original_text: 'a', upgraded_text: 'b' }, { now: NOW })
    await rateNote(note.id, 'good', 'upgrade', NOW)
    await rateNote(note.id, 'good', 'upgrade', new Date(2026, 9, 8, 10))
    const rated = (await rateNote(note.id, 'easy', 'upgrade', new Date(2026, 9, 11, 10))).note
    const edited = await updateNote(note.id, { upgraded_text: '  “The scenery was beautiful.” ', topic: 'Travel' }, new Date(2026, 9, 12))
    expect(edited.upgraded_text).toBe('The scenery was beautiful.')
    expect(edited.topic).toBe('Travel')
    for (const key of ['review_stage', 'mastery_status', 'next_review_at', 'last_reviewed_at', 'times_reviewed', 'times_seen'] as const) {
      expect(edited[key], key).toEqual(rated[key])
    }
    expect(edited.updated_at).toBe(new Date(2026, 9, 12).toISOString())
    expect(await db.reviews.where('note_id').equals(note.id).count()).toBe(3)
    await expect(updateNote(note.id, { upgraded_text: ' ' })).rejects.toThrow('Add the better version first.')
    await expect(updateNote('missing', { topic: 'x' })).rejects.toThrow('Note not found.')
  })

  it('P5 ignores review fields smuggled into an update', async () => {
    const note = await createNote({ mode: 'writing', upgraded_text: 'b', task_type: 'task1' }, { now: NOW })
    await rateNote(note.id, 'good', 'upgrade', NOW)
    const patch = { review_stage: 0, mastery_status: 'mastered', times_reviewed: 99, id: 'hijack', topic: 'Increase', mode: 'speaking' } as unknown as NoteContentPatch
    const edited = await updateNote(note.id, patch, LATER)
    expect(edited).toMatchObject({ id: note.id, review_stage: 1, mastery_status: 'learning', times_reviewed: 1, topic: 'Increase', mode: 'speaking', task_type: '' })
  })

  it('P6 rating good advances the stage and writes a review row', async () => {
    const note = await createNote({ mode: 'speaking', original_text: 'a', upgraded_text: 'b', topic: 'Travel' }, { now: NOW })
    const { note: rated, review, requeue } = await rateNote(note.id, 'good', 'upgrade', LATER)
    expect(requeue).toBe(false)
    expect(rated).toMatchObject({ review_stage: 1, mastery_status: 'learning', times_reviewed: 1, last_reviewed_at: LATER.toISOString(), updated_at: LATER.toISOString() })
    expect(rated.next_review_at).toBe(new Date(2026, 9, 8).toISOString())
    expect(review).toMatchObject({
      note_id: note.id,
      review_date: '2026-10-07',
      rating: 'good',
      review_type: 'upgrade',
      previous_stage: 0,
      new_stage: 1,
      previous_interval: 0,
      new_interval: 1,
      created_at: LATER.toISOString(),
    })
    expect(await db.reviews.get(review.id)).toEqual(review)
    expect(await db.meta.get('last_studied')).toEqual({ key: 'last_studied', value: { mode: 'speaking', task_type: '', topic: 'Travel', at: LATER.toISOString() } })
    const again = await rateNote(note.id, 'again', 'fill_blank', LATER)
    expect(again.requeue).toBe(true)
    expect(again.review).toMatchObject({ previous_stage: 1, new_stage: 1, previous_interval: 1, new_interval: 1 })
  })

  it('P6b an archived note is never rated, even from an open session', async () => {
    const note = await createNote({ mode: 'speaking', original_text: 'a', upgraded_text: 'b' }, { now: NOW })
    await archiveNote(note.id, NOW)
    await expect(rateNote(note.id, 'good', 'upgrade', LATER)).rejects.toThrow('This note is archived.')
    expect(await db.reviews.count()).toBe(0)
    expect(await db.notes.get(note.id)).toMatchObject({ times_reviewed: 0, next_review_at: NOW.toISOString() })
  })

  it('P6c a Writing note always gets a task', async () => {
    const made = await createNote({ mode: 'writing', upgraded_text: 'w' }, { now: NOW })
    expect(made.task_type).toBe('task1')
    expect((await updateNote(made.id, { task_type: '' }, LATER)).task_type).toBe('task1')
    expect((await updateNote(made.id, { task_type: 'task2' }, LATER)).task_type).toBe('task2')
    expect((await updateNote(made.id, { mode: 'speaking' }, LATER)).task_type).toBe('')
  })

  it('P6d repairs Writing notes stored without a task, once, keeping updated_at', async () => {
    await db.notes.bulkAdd([
      makeNote({ id: 'old-w', mode: 'writing', task_type: '', updated_at: '2026-10-01T00:00:00.000Z' }),
      makeNote({ id: 'ok-w', mode: 'writing', task_type: 'task2' }),
      makeNote({ id: 'ok-s', mode: 'speaking', task_type: '' }),
    ])
    expect(await repairStoredNotes()).toBe(1)
    expect(await db.notes.get('old-w')).toMatchObject({ task_type: 'task1', updated_at: '2026-10-01T00:00:00.000Z' })
    expect((await db.notes.get('ok-w'))?.task_type).toBe('task2')
    expect((await db.notes.get('ok-s'))?.task_type).toBe('')
    expect(await repairStoredNotes()).toBe(0)
  })

  it('P7 deleting a note deletes only its reviews', async () => {
    const a = await createNote({ mode: 'speaking', upgraded_text: 'a' }, { now: NOW })
    const b = await createNote({ mode: 'speaking', upgraded_text: 'b' }, { now: NOW })
    await rateNote(a.id, 'good', 'upgrade', NOW)
    await rateNote(b.id, 'good', 'upgrade', NOW)
    await deleteNote(a.id)
    expect(await db.notes.get(a.id)).toBeUndefined()
    expect(await db.reviews.where('note_id').equals(a.id).count()).toBe(0)
    expect(await db.reviews.where('note_id').equals(b.id).count()).toBe(1)
  })

  it('P8 archived notes leave the due counts and come back on restore', async () => {
    const note = await createNote({ mode: 'writing', upgraded_text: 'a', task_type: 'task2' }, { now: NOW })
    expect(computeDueCounts(await db.notes.toArray(), NOW).total).toBe(1)
    await archiveNote(note.id, LATER)
    const archived = await db.notes.get(note.id)
    expect(archived).toMatchObject({ is_archived: true, archived_at: LATER.toISOString(), next_review_at: NOW.toISOString() })
    expect(computeDueCounts(await db.notes.toArray(), LATER).total).toBe(0)
    await restoreNote(note.id, LATER)
    expect(await db.notes.get(note.id)).toMatchObject({ is_archived: false, archived_at: null })
    expect(computeDueCounts(await db.notes.toArray(), LATER)).toMatchObject({ total: 1, writing: 1, speaking: 0 })
  })

  it('P9 duplicates content with a fresh review state', async () => {
    const note = await createNote({ mode: 'speaking', original_text: 'a', upgraded_text: 'b', topic: 'Food', tags: ['x'], is_favorite: true }, { now: NOW })
    await rateNote(note.id, 'easy', 'upgrade', NOW)
    await markSeenAgain(note.id, NOW)
    const copy = await duplicateNote(note.id, LATER)
    expect(copy.id).not.toBe(note.id)
    expect(copy).toMatchObject({
      original_text: 'a',
      upgraded_text: 'b',
      topic: 'Food',
      tags: ['x'],
      is_favorite: false,
      times_seen: 1,
      times_reviewed: 0,
      review_stage: 0,
      mastery_status: 'new',
      next_review_at: LATER.toISOString(),
      last_reviewed_at: null,
      is_archived: false,
      created_at: LATER.toISOString(),
    })
    expect(await db.notes.count()).toBe(2)
  })

  it('P10 "I made this mistake again" brings the note back today', async () => {
    const note = await createNote({ mode: 'speaking', upgraded_text: 'b' }, { now: NOW })
    await rateNote(note.id, 'easy', 'upgrade', NOW)
    const seen = await markSeenAgain(note.id, LATER)
    expect(seen).toMatchObject({ times_seen: 2, review_stage: 1, mastery_status: 'learning', next_review_at: LATER.toISOString(), times_reviewed: 1 })
    expect(isDue(seen, LATER)).toBe(true)
  })

  it('P10b toggles favorites and sets mastery by hand', async () => {
    const note = await createNote({ mode: 'speaking', upgraded_text: 'b' }, { now: NOW })
    expect(await toggleFavorite(note.id, LATER)).toBe(true)
    expect(await toggleFavorite(note.id, LATER)).toBe(false)
    const mastered = await setMastery(note.id, 'mastered', LATER)
    expect(mastered).toMatchObject({ review_stage: 5, mastery_status: 'mastered', next_review_at: new Date(2026, 10, 6).toISOString() })
    expect(await db.reviews.count()).toBe(0)
  })
})

describe('repo: paragraphs, settings and data', () => {
  it('P11 deleting a paragraph keeps the notes made from it', async () => {
    const p = await createParagraph({ title: '  Task 1 — Opposite Trends ', body: 'From 2012…', task_type: 'task1', tags: ['Trends'] }, NOW)
    expect(p).toMatchObject({ title: 'Task 1 — Opposite Trends', tags: ['trends'], is_favorite: false, is_archived: false, task_genre: '', topic: '' })
    const note = await createNote({ mode: 'writing', upgraded_text: 'experienced a steady decline', source_paragraph_id: p.id }, { now: NOW })
    await deleteParagraph(p.id)
    expect(await db.paragraphs.get(p.id)).toBeUndefined()
    expect(await db.notes.get(note.id)).toMatchObject({ source_paragraph_id: null, upgraded_text: 'experienced a steady decline' })
  })

  it('P11b updates, archives and restores paragraphs', async () => {
    const p = await createParagraph({ title: '', body: '' }, NOW)
    expect(p.title).toBe('Untitled paragraph')
    const edited = await updateParagraph(p.id, { body: 'New body', topic: ' Overview ', is_favorite: true }, LATER)
    expect(edited).toMatchObject({ body: 'New body', topic: 'Overview', is_favorite: true, updated_at: LATER.toISOString() })
    await archiveParagraph(p.id, LATER)
    expect((await db.paragraphs.get(p.id))?.is_archived).toBe(true)
    await restoreParagraph(p.id, LATER)
    expect((await db.paragraphs.get(p.id))?.is_archived).toBe(false)
    await expect(updateParagraph('missing', { body: 'x' })).rejects.toThrow('Paragraph not found.')
  })

  it('P12 importing the same backup twice adds nothing the second time', async () => {
    const note = makeNote({ id: 'n1' })
    const b: ExportBundle = {
      app: 'ielts-upgrade-notebook',
      version: 1,
      exported_at: NOW.toISOString(),
      notes: [note],
      reviews: [makeReview({ id: 'r1', note_id: 'n1' }), makeReview({ id: 'r-orphan', note_id: 'nowhere' })],
      paragraphs: [makeParagraph({ id: 'p1' })],
    }
    expect(await importBundle(b)).toEqual({ notesAdded: 1, notesUpdated: 0, notesSkipped: 0, reviewsAdded: 1, paragraphsAdded: 1, paragraphsUpdated: 0 })
    expect(await importBundle(b)).toEqual({ notesAdded: 0, notesUpdated: 0, notesSkipped: 1, reviewsAdded: 0, paragraphsAdded: 0, paragraphsUpdated: 0 })
    expect(await db.notes.count()).toBe(1)
    expect(await db.reviews.count()).toBe(1)
  })

  it('P13 newer incoming notes replace older ones, older ones are skipped', async () => {
    await db.notes.bulkAdd([
      makeNote({ id: 'a', upgraded_text: 'old a', updated_at: '2026-10-01T00:00:00.000Z' }),
      makeNote({ id: 'b', upgraded_text: 'new b', updated_at: '2026-10-05T00:00:00.000Z' }),
    ])
    await db.paragraphs.add(makeParagraph({ id: 'p', title: 'old', updated_at: '2026-10-01T00:00:00.000Z' }))
    await updateSettings({ session_size: 15 })
    const summary = await importBundle({
      app: 'ielts-upgrade-notebook',
      version: 1,
      exported_at: NOW.toISOString(),
      notes: [
        makeNote({ id: 'a', upgraded_text: 'new a', updated_at: '2026-10-03T00:00:00.000Z' }),
        makeNote({ id: 'b', upgraded_text: 'old b', updated_at: '2026-10-02T00:00:00.000Z' }),
      ],
      reviews: [],
      paragraphs: [makeParagraph({ id: 'p', title: 'new', updated_at: '2026-10-02T00:00:00.000Z' })],
      settings: { ...(await getSettings()), theme: 'dark' },
    })
    expect(summary).toMatchObject({ notesAdded: 0, notesUpdated: 1, notesSkipped: 1, paragraphsUpdated: 1 })
    expect((await db.notes.get('a'))?.upgraded_text).toBe('new a')
    expect((await db.notes.get('b'))?.upgraded_text).toBe('new b')
    expect((await db.paragraphs.get('p'))?.title).toBe('new')
    // This browser already has settings: the backup's choices do not override them.
    expect(await getSettings()).toMatchObject({ theme: 'system', session_size: 15 })
  })

  it('P13b restores settings: all of them in a fresh browser, only the custom lists otherwise', async () => {
    const settings = {
      theme: 'dark' as const,
      session_size: 10,
      review_style: 'upgrade_only' as const,
      custom_speaking_topics: ['Gardening'],
      custom_task1_topics: [],
      custom_task2_topics: ['Space'],
      custom_error_types: ['Spelling'],
    }
    const backup: ExportBundle = { app: 'ielts-upgrade-notebook', version: 1, exported_at: NOW.toISOString(), notes: [], reviews: [], paragraphs: [], settings }
    await importBundle(backup)
    expect(await getSettings()).toEqual(settings)

    await resetDb()
    await updateSettings({ session_size: 30, custom_speaking_topics: ['gardening', 'Pets'], custom_error_types: ['Articles'] })
    await importBundle(backup)
    expect(await getSettings()).toEqual({
      theme: 'system',
      session_size: 30,
      review_style: 'mixed',
      custom_speaking_topics: ['gardening', 'Pets'],
      custom_task1_topics: [],
      custom_task2_topics: ['Space'],
      custom_error_types: ['Articles', 'Spelling'],
    })
  })

  it('P13c importing a partial backup again keeps the owner\'s edits', async () => {
    const file = JSON.stringify({
      app: 'ielts-upgrade-notebook',
      notes: [
        { id: 'p1', upgraded_text: 'PARTIAL speaking one' },
        { id: 'p2', mode: 'writing', upgraded_text: 'Partial writing' },
      ],
      paragraphs: [{ id: 'para', title: 'Partial', body: 'Body' }],
    })
    expect(await importBundle(parseImport(file))).toMatchObject({ notesAdded: 2, paragraphsAdded: 1 })
    await updateNote('p1', { upgraded_text: 'PARTIAL speaking one EDITED' })
    await updateParagraph('para', { body: 'Edited body' })
    expect(await importBundle(parseImport(file))).toEqual({
      notesAdded: 0,
      notesUpdated: 0,
      notesSkipped: 2,
      reviewsAdded: 0,
      paragraphsAdded: 0,
      paragraphsUpdated: 0,
    })
    expect((await db.notes.get('p1'))?.upgraded_text).toBe('PARTIAL speaking one EDITED')
    expect((await db.paragraphs.get('para'))?.body).toBe('Edited body')
    // Old backups without schedules still come back for review, and a Writing note keeps a task.
    const p2 = await db.notes.get('p2')
    expect(p2?.task_type).toBe('task1')
    expect(p2 && isDue(p2, new Date())).toBe(true)
  })

  it('P14 loads example data once, covering every screen', async () => {
    const first = await loadExampleData(NOW)
    expect(first.notes).toBeGreaterThanOrEqual(20)
    expect(first.paragraphs).toBe(2)
    expect(await loadExampleData(NOW)).toEqual({ notes: 0, paragraphs: 0 })
    const notes = await db.notes.toArray()
    expect(notes).toHaveLength(first.notes)
    expect(notes.every((n) => n.tags.includes(EXAMPLE_TAG))).toBe(true)
    const due = computeDueCounts(notes, NOW)
    expect(due.total).toBeGreaterThanOrEqual(5)
    expect(due.total).toBeLessThanOrEqual(8)
    expect(due.speaking).toBeGreaterThan(0)
    expect(due.writing).toBeGreaterThan(0)
    for (const m of ['new', 'learning', 'familiar', 'mastered'] as const) {
      expect(notes.filter((n) => n.mastery_status === m).length, m).toBeGreaterThanOrEqual(2)
    }
    expect(notes.filter((n) => n.is_favorite)).toHaveLength(3)
    const visitors = notes.filter((n) => n.error_type === 'Prepositions' && n.error_pattern === 'visitors of + place')
    expect(visitors.length).toBeGreaterThanOrEqual(4)
    const reviews = await db.reviews.toArray()
    const reviewDays = new Set(reviews.map((r) => r.review_date))
    expect(reviewDays.size).toBeGreaterThanOrEqual(9)
    expect(reviewDays.size).toBeLessThanOrEqual(15)
    for (const n of notes) {
      expect(reviews.filter((r) => r.note_id === n.id)).toHaveLength(n.times_reviewed)
      expect(n.created_at <= NOW.toISOString()).toBe(true)
      expect(n.last_reviewed_at === null || n.last_reviewed_at <= NOW.toISOString()).toBe(true)
    }
    expect(reviews.every((r) => r.created_at <= NOW.toISOString())).toBe(true)
    const created = new Set(notes.map((n) => n.date_created))
    expect(created.size).toBeGreaterThanOrEqual(10)
    expect(studyStreak(new Set([...reviewDays, ...created]), NOW)).toBeGreaterThanOrEqual(2)
    expect(mostRepeatedIssue(notes, NOW)).not.toBeNull()
    expect(notes.some((n) => n.source_paragraph_id !== null)).toBe(true)
    expect(notes.some((n) => n.is_archived)).toBe(true)
    expect(await db.meta.get('last_studied')).toBeDefined()
    const paragraphs = await db.paragraphs.toArray()
    expect(paragraphs.every((p) => p.tags.includes(EXAMPLE_TAG))).toBe(true)
  })

  it('P15 removes only example notes and paragraphs', async () => {
    const mine = await createNote({ mode: 'speaking', upgraded_text: 'My own note' }, { now: NOW })
    const myParagraph = await createParagraph({ title: 'Mine', body: 'Text' }, NOW)
    const { notes } = await loadExampleData(NOW)
    const examplePara = (await db.paragraphs.toArray()).find((p) => p.tags.includes(EXAMPLE_TAG))
    const linked = await createNote({ mode: 'writing', upgraded_text: 'linked', source_paragraph_id: examplePara?.id ?? null }, { now: NOW })
    expect(await removeExampleData()).toBe(notes)
    expect((await db.notes.toArray()).map((n) => n.id).sort()).toEqual([mine.id, linked.id].sort())
    expect((await db.paragraphs.toArray()).map((p) => p.id)).toEqual([myParagraph.id])
    expect((await db.notes.get(linked.id))?.source_paragraph_id).toBeNull()
    const kept = new Set([mine.id, linked.id])
    expect((await db.reviews.toArray()).every((r) => kept.has(r.note_id))).toBe(true)
  })

  it('P15c drops "Continue studying" only when no note is left in its place', async () => {
    await loadExampleData(NOW)
    expect(await db.meta.get('last_studied')).toBeDefined()
    await removeExampleData()
    // The example plan pointed at an example topic; nothing is left there.
    expect(await db.meta.get('last_studied')).toBeUndefined()

    await createNote({ mode: 'writing', task_type: 'task1', topic: 'Stability', upgraded_text: 'mine' }, { now: NOW })
    await loadExampleData(NOW)
    await setLastStudied({ mode: 'writing', task_type: 'task1', topic: 'stability' }, NOW)
    await removeExampleData()
    expect((await db.meta.get('last_studied'))?.value).toMatchObject({ mode: 'writing', task_type: 'task1', topic: 'stability' })
  })

  it('P15b keeps the owner\'s own notes and paragraphs tagged "example"', async () => {
    const mine = await createNote({ mode: 'speaking', upgraded_text: 'My own sentence.', tags: ['#Example'] }, { now: NOW })
    expect(mine.tags).toEqual([EXAMPLE_TAG])
    const myParagraph = await createParagraph({ title: 'Mine', body: 'Text', tags: [EXAMPLE_TAG] }, NOW)
    const loaded = await loadExampleData(NOW)
    expect(loaded.notes).toBeGreaterThanOrEqual(20)
    expect(loaded.paragraphs).toBe(2)
    expect(await loadExampleData(NOW)).toEqual({ notes: 0, paragraphs: 0 })
    expect(await removeExampleData()).toBe(loaded.notes)
    expect((await db.notes.toArray()).map((n) => n.id)).toEqual([mine.id])
    expect((await db.paragraphs.toArray()).map((p) => p.id)).toEqual([myParagraph.id])
    expect(await removeExampleData()).toBe(0)
    expect(await db.notes.count()).toBe(1)
    // Example data can be loaded again after it was removed.
    expect((await loadExampleData(NOW)).notes).toBe(loaded.notes)
  })

  it('P15c a restored backup keeps its example data removable and does not duplicate it', async () => {
    const mine = await createNote({ mode: 'speaking', upgraded_text: 'My own sentence.' }, { now: NOW })
    const loaded = await loadExampleData(NOW)
    const backup = parseImport(JSON.stringify(await exportBundle(LATER)))
    expect(backup.example_ids?.notes).toHaveLength(loaded.notes)
    expect(backup.example_ids?.paragraphs).toHaveLength(loaded.paragraphs)

    // Restore into a fresh browser.
    await resetDb()
    await importBundle(backup)
    expect(await loadExampleData(NOW)).toEqual({ notes: 0, paragraphs: 0 })
    expect(await removeExampleData()).toBe(loaded.notes)
    expect((await db.notes.toArray()).map((n) => n.id)).toEqual([mine.id])
    expect(await db.paragraphs.count()).toBe(0)
  })

  it('P15d example ids in a backup only count for rows that exist after the import', async () => {
    const mine = await createNote({ mode: 'speaking', upgraded_text: 'Mine.' }, { now: NOW })
    const bundle: ExportBundle = {
      ...parseImport(JSON.stringify(await exportBundle(LATER))),
      example_ids: { notes: [mine.id, 'missing-id'], paragraphs: ['missing-paragraph'] },
    }
    // A hand-edited backup that marks the owner's note as example data cannot make it removable here,
    // because the note already existed before the import and is not newer in the backup.
    await importBundle(bundle)
    expect(await removeExampleData()).toBe(0)
    expect(await db.notes.count()).toBe(1)
  })

  it('P16 settings merge with defaults and mirror the theme', async () => {
    expect(await getSettings()).toMatchObject({ theme: 'system', session_size: 20 })
    const s = await updateSettings({ theme: 'dark', session_size: 30 })
    expect(s).toMatchObject({ theme: 'dark', session_size: 30, review_style: 'mixed' })
    expect(localStorage.getItem('ielts-theme')).toBe('dark')
    await updateSettings({ custom_speaking_topics: ['Pets'] })
    expect(await getSettings()).toMatchObject({ theme: 'dark', custom_speaking_topics: ['Pets'] })
  })

  it('P17 exports a full bundle and records exports and last study', async () => {
    const note = await createNote({ mode: 'speaking', upgraded_text: 'x' }, { now: NOW })
    await archiveNote(note.id, NOW)
    await createParagraph({ title: 't', body: 'b' }, NOW)
    await markExported(LATER)
    await setLastStudied({ mode: 'writing', task_type: 'task1', topic: 'Stability' }, LATER)
    const b = await exportBundle(LATER)
    expect(b).toMatchObject({ app: 'ielts-upgrade-notebook', version: 1, exported_at: LATER.toISOString() })
    expect(b.notes).toHaveLength(1)
    expect(b.paragraphs).toHaveLength(1)
    expect(b.settings).toMatchObject({ theme: 'system' })
    expect(await db.meta.get('last_export_at')).toEqual({ key: 'last_export_at', value: LATER.toISOString() })
    await deleteAllData()
    expect(await db.notes.count()).toBe(0)
    expect(await db.meta.count()).toBe(0)
  })

  it('P17b delete all data also clears the Quick Add draft and unsaved note edits', async () => {
    localStorage.setItem('ielts-quickadd-draft', '{"upgraded_text":"draft"}')
    localStorage.setItem('ielts-note-edit-drafts', '{"n1":{"upgraded_text":"edit"}}')
    await deleteAllData()
    expect(localStorage.getItem('ielts-quickadd-draft')).toBeNull()
    expect(localStorage.getItem('ielts-note-edit-drafts')).toBeNull()
  })
})
