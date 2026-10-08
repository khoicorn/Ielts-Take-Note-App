/**
 * Your data (design §11, §12, plan C7): JSON, CSV and Markdown exports download with dated names;
 * a JSON backup imports by merge, a second import adds nothing, and a newer copy wins.
 */
import { readFile } from 'node:fs/promises'
import type { Download, Page } from '@playwright/test'
import {
  APP_ID,
  dayKey,
  daysFromNow,
  dialog,
  expect,
  expectToast,
  loadExampleNotes,
  makeNote,
  makeReview,
  type NoteRecord,
  openApp,
  putRecords,
  readStore,
  test,
} from './helpers/app'

/**
 * Clicks an export button and returns the download. The toast is checked first: it lasts 4s,
 * and saving the file to disk can take longer than that on a busy machine.
 */
async function download(page: Page, button: string, toastText?: string): Promise<{ file: Download; text: string }> {
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()])
  if (toastText) await expectToast(page, toastText)
  const path = await file.path()
  return { file, text: await readFile(path, 'utf8') }
}

async function importFile(page: Page, name: string, content: string): Promise<void> {
  await page.getByLabel('Backup file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) })
}

function backup(notes: NoteRecord[], extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ app: APP_ID, version: 1, exported_at: new Date().toISOString(), notes, reviews: [], paragraphs: [], ...extra })
}

test.describe('export', () => {
  test.beforeEach(async ({ page }) => {
    await loadExampleNotes(page)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Your data' })).toBeVisible()
  })

  test('Export JSON backup downloads ielts-notebook-<today>.json with every note and records the backup', async ({ page }) => {
    const stored = await readStore<NoteRecord>(page, 'notes')
    await expect(page.getByText('No backup yet.')).toBeVisible()

    const { file, text } = await download(page, 'Export JSON backup', 'Backup exported.')
    expect(file.suggestedFilename()).toBe(`ielts-notebook-${dayKey(new Date())}.json`)
    const data = JSON.parse(text)
    expect(data.app).toBe(APP_ID)
    expect(data.version).toBe(1)
    expect(data.notes).toHaveLength(stored.length)
    expect(data.reviews.length).toBeGreaterThan(0)
    expect(data.paragraphs).toHaveLength(2)

    await expect(page.getByText('Last backup today.')).toBeVisible()
  })

  test('Export CSV downloads ielts-notebook-<today>.csv with a header and the notes', async ({ page }) => {
    const { file, text } = await download(page, 'Export CSV', 'CSV exported.')
    expect(file.suggestedFilename()).toBe(`ielts-notebook-${dayKey(new Date())}.csv`)
    const header = text.replace(/^﻿/, '').split(/\r?\n/)[0]
    expect(header.toLowerCase()).toContain('upgrade')
    expect(text).toContain('remained relatively stable')
    // CSV is not a backup: the last backup line does not change.
    await expect(page.getByText('No backup yet.')).toBeVisible()
  })

  test('Export Markdown downloads ielts-notebook-<today>.md with notes and paragraphs', async ({ page }) => {
    const { file, text } = await download(page, 'Export Markdown', 'Markdown exported.')
    expect(file.suggestedFilename()).toBe(`ielts-notebook-${dayKey(new Date())}.md`)
    expect(text).toMatch(/^#\s/m)
    expect(text).toContain('remained relatively stable')
    expect(text).toContain('Task 1 — Opposite Trends')
  })
})

test.describe('import', () => {
  const mine = makeNote({ upgraded_text: 'My own note stays.', original_text: 'Mine.' })
  const one = makeNote({
    upgraded_text: 'Imported note one.',
    original_text: 'One.',
    review_stage: 2,
    mastery_status: 'learning',
    times_reviewed: 1,
    updated_at: daysFromNow(-2).toISOString(),
    created_at: daysFromNow(-5).toISOString(),
  })
  const two = makeNote({ mode: 'writing', task_type: 'task1', upgraded_text: 'Imported note two.', original_text: 'Two.' })
  const review = makeReview(one.id)
  const paragraph = {
    id: 'e2e-paragraph-1',
    title: 'Imported paragraph',
    task_type: 'task1',
    task_genre: 'Line Graph',
    topic: 'Increase',
    body: 'Sales rose sharply in 2020.',
    tags: [],
    is_favorite: false,
    is_archived: false,
    created_at: daysFromNow(-5).toISOString(),
    updated_at: daysFromNow(-5).toISOString(),
  }
  const file = backup([one, two], { reviews: [review], paragraphs: [paragraph] })

  test.beforeEach(async ({ page }) => {
    await openApp(page, '/')
    await putRecords(page, { notes: [mine] }, { reload: false })
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: 'Import JSON backup' })).toBeVisible()
  })

  test('a backup merges into the notebook; importing it again adds nothing', async ({ page }) => {
    await importFile(page, 'backup.json', file)
    const ask = dialog(page, 'Import backup')
    await expect(ask).toBeVisible()
    // Only the counts are pinned here; the sentence after them is Settings copy.
    await expect(ask.getByText('Import 2 notes, 1 review and 1 paragraph?', { exact: false })).toBeVisible()
    await ask.getByRole('button', { name: 'Import' }).click()
    await expectToast(page, 'Import done: 2 new notes, 1 review and 1 new paragraph.')

    expect((await readStore<NoteRecord>(page, 'notes')).map((n) => n.upgraded_text).sort()).toEqual([
      'Imported note one.',
      'Imported note two.',
      'My own note stays.',
    ])
    expect(await readStore(page, 'reviews')).toHaveLength(1)
    expect(await readStore(page, 'paragraphs')).toHaveLength(1)

    // The same file again: no duplicates.
    await importFile(page, 'backup.json', file)
    await dialog(page, 'Import backup').getByRole('button', { name: 'Import' }).click()
    await expectToast(page, 'Nothing new to import. Your notebook already has these notes.')
    expect(await readStore(page, 'notes')).toHaveLength(3)
    expect(await readStore(page, 'reviews')).toHaveLength(1)
    expect(await readStore(page, 'paragraphs')).toHaveLength(1)

    // The imported notes show in All Notes, with their review state.
    await page.goto('/notes')
    await expect(page.getByText('Imported note one.').first()).toBeVisible()
    await expect(page.getByText('Imported note two.').first()).toBeVisible()
    await expect(page.getByText('My own note stays.').first()).toBeVisible()
  })

  test('a newer copy of a note wins; an older copy is skipped', async ({ page }) => {
    await importFile(page, 'backup.json', file)
    await dialog(page, 'Import backup').getByRole('button', { name: 'Import' }).click()
    await expectToast(page, /Import done/)

    const newer = { ...one, upgraded_text: 'Imported note one, edited later.', updated_at: new Date().toISOString() }
    await importFile(page, 'newer.json', backup([newer]))
    await dialog(page, 'Import backup').getByRole('button', { name: 'Import' }).click()
    await expectToast(page, 'Import done: 1 updated note.')

    const older = { ...one, upgraded_text: 'An old copy.', updated_at: daysFromNow(-30).toISOString() }
    await importFile(page, 'older.json', backup([older]))
    await dialog(page, 'Import backup').getByRole('button', { name: 'Import' }).click()
    await expectToast(page, 'Nothing new to import. Your notebook already has these notes.')

    const stored = (await readStore<NoteRecord>(page, 'notes')).find((n) => n.id === one.id)
    expect(stored?.upgraded_text).toBe('Imported note one, edited later.')
    expect(await readStore(page, 'notes')).toHaveLength(3)
  })

  test('a file from another app shows a plain error and changes nothing', async ({ page }) => {
    await importFile(page, 'other.json', JSON.stringify({ app: 'something-else', notes: [one] }))
    await expect(page.getByText('This file was not exported from IELTS Upgrade Notebook.')).toBeVisible()
    await expect(dialog(page, 'Import backup')).toHaveCount(0)
    expect(await readStore(page, 'notes')).toHaveLength(1)
  })
})

test('round trip: a JSON export imports into an empty browser with the same notes and reviews', async ({ page, browser }) => {
  await loadExampleNotes(page)
  await page.goto('/settings')
  const { text } = await download(page, 'Export JSON backup', 'Backup exported.')
  const exported = JSON.parse(text)

  const fresh = await browser.newContext()
  try {
    const other = await fresh.newPage()
    await openApp(other, '/settings')
    await expect(other.getByRole('button', { name: 'Import JSON backup' })).toBeVisible()
    await importFile(other, 'backup.json', text)
    await dialog(other, 'Import backup').getByRole('button', { name: 'Import' }).click()
    await expectToast(other, /Import done/)
    expect(await readStore(other, 'notes')).toHaveLength(exported.notes.length)
    expect(await readStore(other, 'reviews')).toHaveLength(exported.reviews.length)
    expect(await readStore(other, 'paragraphs')).toHaveLength(exported.paragraphs.length)
  } finally {
    await fresh.close()
  }
})

test.describe('old or partial backups', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, '/settings')
    await expect(page.getByRole('button', { name: 'Import JSON backup' })).toBeVisible()
  })

  test('notes with only id, mode and upgrade import with defaults and render', async ({ page }) => {
    const partial = JSON.stringify({
      app: APP_ID,
      notes: [
        { id: 'old-1', mode: 'speaking', upgraded_text: 'An old speaking note.', original_text: 'Old one.' },
        { id: 'old-2', upgraded_text: 'An old note with no mode.' },
      ],
    })
    await importFile(page, 'old.json', partial)
    await expect(dialog(page, 'Import backup').getByText('Import 2 notes?', { exact: false })).toBeVisible()
    await dialog(page, 'Import backup').getByRole('button', { name: 'Import' }).click()
    await expectToast(page, 'Import done: 2 new notes.')

    const notes = await readStore<NoteRecord>(page, 'notes')
    expect(notes.find((n) => n.id === 'old-1')).toMatchObject({ mode: 'speaking', review_stage: 0, mastery_status: 'new', is_archived: false, times_seen: 1 })
    await page.goto('/notes/old-2')
    await expect(page.getByText('An old note with no mode.').first()).toBeVisible()
    await page.goto('/speaking')
    await expect(page.getByText('An old speaking note.').first()).toBeVisible()
  })

  // Import gives a Writing note without task_type Academic Task 1 (records.ts normalizeNote),
  // as Quick Add and the edit form do, so it shows in a Writing tab.
  test('a Writing note without a task type still shows in the Writing notebook', async ({ page }) => {
    const partial = JSON.stringify({
      app: APP_ID,
      notes: [{ id: 'old-w', mode: 'writing', upgraded_text: 'An old writing note.', original_text: 'Old writing.' }],
    })
    await importFile(page, 'old.json', partial)
    await dialog(page, 'Import backup').getByRole('button', { name: 'Import' }).click()
    await expectToast(page, 'Import done: 1 new note.')
    await page.goto('/notes')
    await expect(page.getByText('An old writing note.').first()).toBeVisible()

    let found = false
    for (const tab of ['task1', 'task2']) {
      await page.goto(`/writing?tab=${tab}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Writing' })).toBeVisible()
      await page.waitForTimeout(300)
      if ((await page.getByText('An old writing note.').count()) > 0) found = true
    }
    expect(found, 'the note should appear under Academic Task 1 or Task 2').toBe(true)
  })
})
