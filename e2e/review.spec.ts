/**
 * Review (design §12, plan C2): a full session by keyboard. Space reveals, 1–4 rate,
 * Again shows the note once more at the end, and the session ends on "Session complete".
 */
import { daysFromNow, expect, makeNote, type NoteRecord, openApp, putRecords, readStore, type ReviewRecord, test } from './helpers/app'

const A = makeNote({
  mode: 'speaking',
  topic: 'Travel',
  original_text: 'We enjoyed the scenario.',
  upgraded_text: 'The scenery was beautiful.',
  example_sentence: 'The scenery along the coast was beautiful.',
  // Due longer ago, so it comes first.
  next_review_at: daysFromNow(-2).toISOString(),
  created_at: daysFromNow(-3).toISOString(),
})
const B = makeNote({
  mode: 'writing',
  task_type: 'task1',
  topic: 'Increase',
  original_text: 'The number of visitors of the City Zoo increased steadily.',
  upgraded_text: 'The number of visitors to the City Zoo increased steadily.',
  next_review_at: daysFromNow(-1).toISOString(),
  created_at: daysFromNow(-2).toISOString(),
})
/** Not due: must not appear in the session. */
const LATER = makeNote({ upgraded_text: 'Not due yet.', original_text: 'Not due.', next_review_at: daysFromNow(5).toISOString() })

test('a full session: Space reveals, 1 re-queues, 3 rates, then Session complete', async ({ page }) => {
  await openApp(page, '/')
  await putRecords(page, { notes: [A, B, LATER] })
  await page.getByRole('link', { name: 'Begin Review' }).click()
  await expect(page).toHaveURL(/\/review$/)

  const prompt = page.getByTestId('review-prompt')
  // "Note 1 of 2": the word "Note" is for screen readers only.
  const counter = page.locator('header').getByText(/^(Note|Reviewed) \d+ of \d+$/)

  // Card 1: note A.
  await expect(counter).toHaveText('Note 1 of 2')
  await expect(page.getByText('Recall the better version')).toBeVisible()
  await expect(prompt).toContainText('We enjoyed the scenario.')
  await expect(page.getByText('The scenery was beautiful.')).toHaveCount(0)
  await page.keyboard.press('Space')
  await expect(page.getByText('Better English')).toBeVisible()
  await expect(page.getByText('The scenery was beautiful.').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Good/ })).toBeFocused()

  // Again: feedback line, and the note is appended to the queue.
  await page.keyboard.press('1')
  await expect(page.getByText('Review again soon.')).toBeVisible()
  await expect(counter).toHaveText('Note 2 of 3')

  // Card 2: note B.
  await expect(prompt).toContainText('visitors of the City Zoo')
  await page.keyboard.press('Space')
  await expect(page.getByText('The number of visitors to the City Zoo increased steadily.').first()).toBeVisible()
  await page.keyboard.press('3')

  // Card 3: note A again (shown once more, never a third time).
  await expect(counter).toHaveText('Note 3 of 3')
  await expect(prompt).toContainText('We enjoyed the scenario.')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Better English')).toBeVisible()
  await page.keyboard.press('3')

  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  await expect(page.getByText('2 notes reviewed.')).toBeVisible()
  // A was rated Again, then Good. Its latest rating is Good, so nothing is listed to see again soon.
  await expect(page.getByText(/to see again soon/i)).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to Today' })).toBeVisible()

  // Every rating is saved at once: 3 review rows, the not-due note untouched.
  const reviews = await readStore<ReviewRecord>(page, 'reviews')
  expect(reviews.map((r) => `${r.note_id === A.id ? 'A' : 'B'}:${r.rating}`).sort()).toEqual(['A:again', 'A:good', 'B:good'])
  const notes = await readStore<NoteRecord>(page, 'notes')
  const byId = Object.fromEntries(notes.map((n) => [n.id, n]))
  expect(byId[A.id].times_reviewed).toBe(2)
  expect(byId[B.id].times_reviewed).toBe(1)
  expect(byId[B.id].review_stage).toBe(1)
  expect(byId[LATER.id].times_reviewed).toBe(0)
  // Nothing is due today any more.
  for (const id of [A.id, B.id]) {
    expect(new Date(byId[id].next_review_at!).getTime()).toBeGreaterThan(Date.now())
  }

  await page.getByRole('link', { name: 'Back to Today' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Nothing is waiting for review today.')).toBeVisible()
})

test('Esc leaves the review and progress is kept', async ({ page }) => {
  await openApp(page, '/')
  await putRecords(page, { notes: [A, B] })
  await page.goto('/review')
  await expect(page.getByTestId('review-prompt')).toBeVisible()
  await page.keyboard.press('Space')
  await page.keyboard.press('4')
  await expect(page.locator('header').getByText('Note 2 of 2')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
  expect(await readStore(page, 'reviews')).toHaveLength(1)
})

test('an empty queue shows the calm empty state', async ({ page }) => {
  await openApp(page, '/')
  await putRecords(page, { notes: [LATER] })
  await page.goto('/review')
  await expect(page.getByText('Nothing is waiting for review.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Today' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add a note' })).toBeVisible()
})

test('rating buttons show the next gap; Easy on a familiar note shows "Marked as mastered."', async ({ page }) => {
  const familiar = makeNote({
    original_text: 'It was very crowd.',
    upgraded_text: 'It was packed with tourists.',
    review_stage: 4,
    mastery_status: 'familiar',
    times_reviewed: 1,
    next_review_at: daysFromNow(-1).toISOString(),
  })
  await openApp(page, '/')
  await putRecords(page, { notes: [familiar] })
  await page.goto('/review')
  await expect(page.getByTestId('review-prompt')).toContainText('It was very crowd.')
  await page.keyboard.press('Space')
  // Stage 4: Again 1 day, Hard 1 week, Good 1 month, Easy 2 months.
  await expect(page.getByRole('button', { name: /^Again/ })).toContainText('Tomorrow')
  await expect(page.getByRole('button', { name: /^Hard/ })).toContainText('1 week')
  await expect(page.getByRole('button', { name: /^Good/ })).toContainText('1 month')
  await expect(page.getByRole('button', { name: /^Easy/ })).toContainText('2 months')

  await page.keyboard.press('4')
  await expect(page.getByText('Marked as mastered.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  const [note] = await readStore<NoteRecord>(page, 'notes')
  expect(note).toMatchObject({ review_stage: 6, mastery_status: 'mastered' })
})

test('/review?mode=speaking reviews Speaking notes only', async ({ page }) => {
  await openApp(page, '/')
  await putRecords(page, { notes: [A, B] })
  await page.getByRole('link', { name: /Review Speaking only, 1 due/ }).click()
  await expect(page).toHaveURL(/\/review\?mode=speaking$/)
  await expect(page.locator('header').getByText('Note 1 of 1')).toBeVisible()
  await expect(page.getByTestId('review-prompt')).toContainText('We enjoyed the scenario.')
  await page.keyboard.press('Space')
  await page.keyboard.press('3')
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  const reviews = await readStore<ReviewRecord>(page, 'reviews')
  expect(reviews.map((r) => r.note_id)).toEqual([A.id])
  // The writing note is still waiting, untouched. ("Review more" counts this mode only, so it is hidden.)
  const writing = (await readStore<NoteRecord>(page, 'notes')).find((n) => n.id === B.id)
  expect(writing?.times_reviewed).toBe(0)
  await expect(page.getByRole('button', { name: 'Review more' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to Today' }).click()
  await expect(page.getByText('Your notebook has 1 item waiting for review.')).toBeVisible()
})

test('archived notes never enter a review session', async ({ page }) => {
  const archived = makeNote({
    original_text: 'Archived mistake.',
    upgraded_text: 'Archived upgrade.',
    is_archived: true,
    archived_at: new Date().toISOString(),
    next_review_at: daysFromNow(-3).toISOString(),
  })
  await openApp(page, '/')
  await putRecords(page, { notes: [archived, B] })
  await expect(page.getByText('Your notebook has 1 item waiting for review.')).toBeVisible()
  await page.goto('/review')
  await expect(page.locator('header').getByText('Note 1 of 1')).toBeVisible()
  await expect(page.getByText('Archived mistake.')).toHaveCount(0)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('Reveal and the four rating buttons are tappable and at least 44px tall', async ({ page }) => {
    await openApp(page, '/')
    await putRecords(page, { notes: [A] })
    await page.goto('/review')
    const reveal = page.getByRole('button', { name: /^Reveal/ })
    await expect(reveal).toBeInViewport()
    await reveal.tap()
    for (const name of ['Again', 'Hard', 'Good', 'Easy']) {
      const b = page.getByRole('button', { name: new RegExp(`^${name}`) })
      await expect(b).toBeInViewport()
      expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    await page.getByRole('button', { name: /^Good/ }).tap()
    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  })
})

test('Type your answer: Enter reveals and the typed answer is shown next to the correct one', async ({ page }) => {
  await openApp(page, '/')
  await putRecords(page, { notes: [A] })
  await page.goto('/review')
  await expect(page.getByTestId('review-prompt')).toBeVisible()
  await page.getByRole('button', { name: 'Type your answer (optional)' }).click()
  const field = page.getByLabel('Your answer')
  await expect(field).toBeFocused()
  // Space and digits type into the field; they do not reveal or rate.
  await field.pressSequentially('The scenery was 1 nice.')
  await expect(page.getByText('Better English')).toHaveCount(0)
  await field.press('Enter')
  await expect(page.getByText('Better English')).toBeVisible()
  // A word diff with text labels for screen readers: extra words typed, words left out.
  const typed = page.getByTestId('typed-answer')
  await expect(typed).toContainText('The scenery was')
  await expect(typed).toContainText('extra: nice')
  await expect(typed).toContainText('missing: beautiful')
  expect(await readStore(page, 'reviews')).toHaveLength(0)
})
