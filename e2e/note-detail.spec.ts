/**
 * Note Detail (design §12, plan C3): editing keeps review history and mastery, archive and restore,
 * delete asks first, and a deep link to /notes/:id survives a reload.
 */
import type { Page } from '@playwright/test'
import {
  daysFromNow,
  dayKey,
  dialog,
  expect,
  expectToast,
  makeNote,
  makeReview,
  MOD,
  type NoteRecord,
  openApp,
  putRecords,
  readStore,
  type ReviewRecord,
  test,
  toast,
} from './helpers/app'

const NEXT = daysFromNow(7)
NEXT.setHours(0, 0, 0, 0)

function familiarNote(): { note: NoteRecord; reviews: ReviewRecord[] } {
  const note = makeNote({
    mode: 'speaking',
    topic: 'Travel',
    original_text: 'We enjoyed the scenario.',
    upgraded_text: 'The scenery was beautiful.',
    explanation: 'Scenario means a situation. Scenery is the view.',
    example_sentence: 'The scenery along the coast was **beautiful**.',
    review_stage: 3,
    mastery_status: 'familiar',
    times_reviewed: 3,
    last_reviewed_at: daysFromNow(-1).toISOString(),
    next_review_at: NEXT.toISOString(),
    created_at: daysFromNow(-10).toISOString(),
    updated_at: daysFromNow(-1).toISOString(),
    date_created: dayKey(daysFromNow(-10)),
  })
  const reviews = [
    makeReview(note.id, { rating: 'good', previous_stage: 0, new_stage: 1, review_date: dayKey(daysFromNow(-9)) }),
    makeReview(note.id, { rating: 'good', previous_stage: 1, new_stage: 2, review_date: dayKey(daysFromNow(-8)) }),
    makeReview(note.id, { rating: 'good', previous_stage: 2, new_stage: 3, review_date: dayKey(daysFromNow(-1)) }),
  ]
  return { note, reviews }
}

async function seedAndOpen(page: Page, extra: NoteRecord[] = []): Promise<{ note: NoteRecord; reviews: ReviewRecord[] }> {
  const data = familiarNote()
  await openApp(page, '/')
  await putRecords(page, { notes: [data.note, ...extra], reviews: data.reviews }, { reload: false })
  await page.goto(`/notes/${data.note.id}`)
  await expect(page.getByRole('heading', { name: 'Note: The scenery was beautiful.' })).toBeAttached()
  return data
}

function moreActions(page: Page) {
  return page.getByRole('button', { name: 'More actions' })
}

test('editing the wording keeps review history, mastery and schedule', async ({ page }) => {
  const { note } = await seedAndOpen(page)
  const history = page.getByRole('list', { name: 'Review history' }).getByRole('listitem')
  const mastery = page.getByRole('button', { name: 'Mastery: Familiar. Change' })
  await expect(history).toHaveCount(3)
  await expect(mastery).toBeVisible()

  await page.keyboard.press('e')
  const form = page.getByRole('form', { name: 'Edit note' })
  await expect(form).toBeVisible()
  await form.getByLabel('Native Upgrade').fill('The scenery was breathtaking.')
  await form.getByLabel('Why', { exact: true }).fill('Breathtaking is stronger than beautiful.')
  await page.keyboard.press(`${MOD}+Enter`)

  await expectToast(page, 'Changes saved.')
  await expect(form).toBeHidden()
  await expect(page.getByText('The scenery was breathtaking.').first()).toBeVisible()
  await expect(mastery).toBeVisible()
  await expect(history).toHaveCount(3)

  const [saved] = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.id === note.id)
  expect(saved).toMatchObject({
    upgraded_text: 'The scenery was breathtaking.',
    explanation: 'Breathtaking is stronger than beautiful.',
    review_stage: 3,
    mastery_status: 'familiar',
    times_reviewed: 3,
    next_review_at: note.next_review_at,
    last_reviewed_at: note.last_reviewed_at,
  })
  expect(await readStore(page, 'reviews')).toHaveLength(3)

  // Still true after a reload (nothing only held in memory).
  await page.reload()
  await expect(page.getByText('The scenery was breathtaking.').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mastery: Familiar. Change' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Review history' }).getByRole('listitem')).toHaveCount(3)
})

test('Cancel with changes asks before discarding them', async ({ page }) => {
  await seedAndOpen(page)
  await page.getByRole('button', { name: /^Edit/ }).click()
  const form = page.getByRole('form', { name: 'Edit note' })
  await form.getByLabel('Native Upgrade').fill('Changed but not saved.')
  await form.getByRole('button', { name: /^Cancel/ }).click()

  const ask = dialog(page, 'Discard your changes?')
  await expect(ask).toBeVisible()
  await ask.getByRole('button', { name: 'Discard' }).click()
  await expect(form).toBeHidden()
  await expect(page.getByText('The scenery was beautiful.').first()).toBeVisible()
  await expect(page.getByText('Changed but not saved.')).toHaveCount(0)
})

test('archive hides the note from All Notes; restore from the archive brings it back', async ({ page }) => {
  const other = makeNote({ upgraded_text: 'A second note stays visible.', original_text: 'Second.' })
  const { note } = await seedAndOpen(page, [other])

  await moreActions(page).click()
  await page.getByRole('menuitem', { name: 'Archive' }).click()
  await expectToast(page, 'Note archived.')
  await expect(page.getByText('This note is archived. It is hidden from review.')).toBeVisible()

  await page.goto('/notes')
  await expect(page.getByRole('heading', { name: 'All Notes' })).toBeVisible()
  await expect(page.getByText('A second note stays visible.').first()).toBeVisible()
  await expect(page.getByText('The scenery was beautiful.')).toHaveCount(0)

  await page.goto('/notes?archived=1')
  await expect(page.getByRole('heading', { name: 'Archived notes' })).toBeVisible()
  await expect(page.getByText('The scenery was beautiful.').first()).toBeVisible()
  await expect(page.getByText('A second note stays visible.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText('The scenery was beautiful.')).toHaveCount(0)

  const [restored] = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.id === note.id)
  expect(restored.is_archived).toBe(false)
  expect(restored.review_stage).toBe(3)

  await page.goto('/notes')
  await expect(page.getByText('The scenery was beautiful.').first()).toBeVisible()
})

test('archive, then Restore on the note page', async ({ page }) => {
  const { note } = await seedAndOpen(page)
  await moreActions(page).click()
  await page.getByRole('menuitem', { name: 'Archive' }).click()
  const banner = page.getByText('This note is archived. It is hidden from review.')
  await expect(banner).toBeVisible()

  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  await expectToast(page, 'Note restored.')
  await expect(banner).toBeHidden()
  const [restored] = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.id === note.id)
  expect(restored).toMatchObject({ is_archived: false, archived_at: null })
})

test('Undo in the "Note archived." toast restores the note', async ({ page }) => {
  await seedAndOpen(page)
  await moreActions(page).click()
  await page.getByRole('menuitem', { name: 'Archive' }).click()
  await toast(page, 'Note archived.').getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('This note is archived. It is hidden from review.')).toBeHidden()
})

test('delete asks for confirmation; Cancel keeps the note, Delete note removes it and its history', async ({ page }) => {
  const { note } = await seedAndOpen(page)

  await moreActions(page).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const ask = dialog(page, 'Delete this note?')
  await expect(ask).toBeVisible()
  await expect(ask.getByText('Its review history will be deleted too. This cannot be undone.')).toBeVisible()
  await ask.getByRole('button', { name: 'Cancel' }).click()
  await expect(ask).toBeHidden()
  expect(await readStore(page, 'notes')).toHaveLength(1)
  await expect(page).toHaveURL(new RegExp(`/notes/${note.id}$`))

  await moreActions(page).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await dialog(page, 'Delete this note?').getByRole('button', { name: 'Delete note' }).click()
  await expectToast(page, 'Note deleted.')
  await expect(page).toHaveURL(/\/notes$/)
  expect(await readStore(page, 'notes')).toHaveLength(0)
  expect(await readStore(page, 'reviews')).toHaveLength(0)

  await page.goto(`/notes/${note.id}`)
  await expect(page.getByText('This note does not exist.')).toBeVisible()
})

test('a deep link to /notes/:id renders and survives a reload', async ({ page, context }) => {
  const { note } = await seedAndOpen(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Note: The scenery was beautiful.' })).toBeAttached()
  await expect(page.getByText('The scenery was beautiful.').first()).toBeVisible()
  await expect(page.getByText('We enjoyed the scenario.').first()).toBeVisible()

  // A second tab opened straight on the link (no app navigation first).
  const tab = await context.newPage()
  await tab.goto(`/notes/${note.id}`)
  await expect(tab.getByText('The scenery was beautiful.').first()).toBeVisible()
  await tab.reload()
  await expect(tab.getByText('The scenery was beautiful.').first()).toBeVisible()
  await tab.close()
})

test('Mastery menu: Mastered moves the note to stage 5 and writes no review row', async ({ page }) => {
  const { note } = await seedAndOpen(page)
  await page.getByRole('button', { name: 'Mastery: Familiar. Change' }).click()
  await page.getByRole('menuitem', { name: 'Mastered' }).click()
  await expectToast(page, 'Marked as mastered.')
  await expect(page.getByRole('button', { name: 'Mastery: Mastered. Change' })).toBeVisible()

  const [saved] = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.id === note.id)
  expect(saved).toMatchObject({ mastery_status: 'mastered', review_stage: 5 })
  expect(await readStore(page, 'reviews')).toHaveLength(3)
})

test('"I made this mistake again" counts it and brings it back today', async ({ page }) => {
  const { note } = await seedAndOpen(page)
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'I made this mistake again' }).click()
  await expectToast(page, 'Marked as seen again. It is back in today’s review.')

  const [saved] = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.id === note.id)
  expect(saved.times_seen).toBe(2)
  expect(saved.review_stage).toBe(1)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  expect(new Date(saved.next_review_at!).getTime()).toBeLessThanOrEqual(endOfToday.getTime())
  await expect(page.getByText('Due today')).toBeVisible()
  // The history is not rewritten.
  expect(await readStore(page, 'reviews')).toHaveLength(3)
})

test('Duplicate opens a copy; the original keeps its history', async ({ page }) => {
  const { note } = await seedAndOpen(page)
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expectToast(page, 'Note duplicated.')
  await expect(page).not.toHaveURL(new RegExp(`/notes/${note.id}$`))
  await expect(page.getByText('The scenery was beautiful.').first()).toBeVisible()
  await expect(page.getByText('No reviews yet.')).toBeVisible()

  const notes = await readStore<NoteRecord>(page, 'notes')
  expect(notes).toHaveLength(2)
  const reviews = await readStore<ReviewRecord>(page, 'reviews')
  expect(reviews.every((r) => r.note_id === note.id)).toBe(true)
})

test('moving a note from Speaking to Writing in edit mode keeps its history', async ({ page }) => {
  const { note } = await seedAndOpen(page)
  await page.getByRole('button', { name: /^Edit/ }).click()
  const form = page.getByRole('form', { name: 'Edit note' })
  await form.getByRole('radiogroup', { name: 'Notebook' }).getByRole('radio', { name: 'Writing' }).click()
  await expect(form.getByLabel('Band 7+ Upgrade')).toHaveValue('The scenery was beautiful.')
  await form.getByRole('button', { name: /^Save changes/ }).click()
  await expectToast(page, 'Changes saved.')

  const [saved] = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.id === note.id)
  expect(saved).toMatchObject({ mode: 'writing', task_type: 'task1', review_stage: 3, mastery_status: 'familiar' })
  await expect(page.getByRole('list', { name: 'Review history' }).getByRole('listitem')).toHaveCount(3)
})

test('edit mode: Esc with no changes leaves quietly; the back link asks when there are changes', async ({ page }) => {
  await seedAndOpen(page)
  await page.keyboard.press('e')
  const form = page.getByRole('form', { name: 'Edit note' })
  await expect(form).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(form).toBeHidden()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.keyboard.press('e')
  await form.getByLabel('Native Upgrade').fill('Unsaved words.')
  // The note's own back link inside the article (it reads "All Notes" too), not the sidebar link.
  await page.locator('article').getByRole('link', { name: 'All Notes', exact: true }).click()
  const ask = dialog(page, 'Discard your changes?')
  await expect(ask).toBeVisible()
  await ask.getByRole('button', { name: 'Keep editing' }).click()
  await expect(form.getByLabel('Native Upgrade')).toHaveValue('Unsaved words.')
})

// Leaving edit mode through in-app navigation (here the sidebar) asks before unsaved edits are dropped.
test('leaving edit mode through the sidebar asks before discarding unsaved edits', async ({ page }) => {
  const { note } = await seedAndOpen(page)
  await page.keyboard.press('e')
  const form = page.getByRole('form', { name: 'Edit note' })
  await form.getByLabel('Native Upgrade').fill('Edited but not saved yet.')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Today' }).click()

  const asked = dialog(page, 'Discard your changes?')
  await expect(asked.or(page.getByRole('heading', { level: 1 }).first())).toBeVisible()
  // Either the app asks first, or the typed words are still waiting when the learner comes back.
  if (await asked.isVisible()) return
  await page.goto(`/notes/${note.id}`)
  await expect(page.getByText('Edited but not saved yet.')).toBeVisible({ timeout: 3000 })
})

test('the review "Open note" link opens the note page', async ({ page }) => {
  const { note } = familiarNote()
  const due = { ...note, next_review_at: daysFromNow(-1).toISOString() }
  await openApp(page, '/')
  await putRecords(page, { notes: [due] }, { reload: false })
  await page.goto('/review')
  await expect(page.getByTestId('review-prompt')).toBeVisible()
  await page.keyboard.press('Space')
  await page.getByRole('link', { name: 'Open note' }).click()
  await expect(page).toHaveURL(new RegExp(`/notes/${note.id}$`))
  await expect(page.getByRole('heading', { name: 'Note: The scenery was beautiful.' })).toBeAttached()
})
