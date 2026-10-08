/**
 * Keyboard (design §9) and review settings (plan C7): G chords, the shortcut list, single keys that never
 * fire while typing, the last used mode, and session size / review style reaching the review screen.
 */
import { daysFromNow, dialog, expect, makeNote, MOD, openApp, putRecords, test, waitForDb } from './helpers/app'

test('G then T, R, S, W, M, F, A, C move between pages', async ({ page }) => {
  await openApp(page, '/settings')
  const go: [string, RegExp][] = [
    ['s', /\/speaking$/],
    ['w', /\/writing$/],
    ['m', /\/mistakes$/],
    ['f', /\/must-remember$/],
    ['a', /\/notes$/],
    ['c', /\/calendar$/],
    ['t', /\/$/],
    ['r', /\/review$/],
  ]
  for (const [key, url] of go) {
    await page.locator('main').first().waitFor()
    await page.keyboard.press('g')
    await page.keyboard.press(key)
    await expect(page).toHaveURL(url)
  }
})

test('? opens the shortcut list; Esc closes it', async ({ page }) => {
  await openApp(page, '/')
  await page.keyboard.press('Shift+?')
  const list = dialog(page, 'Keyboard shortcuts')
  await expect(list).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(list).toBeHidden()
})

test('N and / do nothing while typing in a field; Ctrl+K still opens search', async ({ page }) => {
  await openApp(page, '/settings')
  const field = page.getByLabel('Add a Speaking topic')
  await field.click()
  await page.keyboard.type('n/ng')
  await expect(field).toHaveValue('n/ng')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press(`${MOD}+k`)
  await expect(dialog(page, 'Search notes')).toBeVisible()
})

test('Quick Add focuses the last used mode, so Enter continues with it', async ({ page }) => {
  await openApp(page, '/')
  await waitForDb(page)
  await page.keyboard.press('n')
  await page.keyboard.press('w')
  const form = dialog(page, 'New Writing note')
  await form.getByLabel('Band 7+ Upgrade').fill('just under 30%')
  await page.keyboard.press(`${MOD}+Enter`)
  await expect(form).toBeHidden()

  await page.keyboard.press('n')
  const choose = dialog(page, 'What are you saving?')
  await expect(choose).toBeVisible()
  await expect(choose.getByRole('button', { name: 'Writing' })).toBeFocused()
  await expect(choose.getByText('Last used')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(dialog(page, 'New Writing note')).toBeVisible()
})

test('Session size 10 caps a review of 12 due notes at 10', async ({ page }) => {
  const notes = Array.from({ length: 12 }, (_, i) =>
    makeNote({ original_text: `Mistake ${i + 1}.`, upgraded_text: `Upgrade ${i + 1}.`, next_review_at: daysFromNow(-1 - i).toISOString() }),
  )
  await openApp(page, '/')
  await putRecords(page, { notes }, { reload: false })
  await page.goto('/settings')
  await page.getByLabel('Session size').selectOption({ label: '10 notes' })
  await page.goto('/review')
  await expect(page.locator('header').getByText('Note 1 of 10')).toBeVisible()
})

test('"Always Mistake → Upgrade" shows the upgrade card even after many reviews', async ({ page }) => {
  // After 3 reviews, mixed style would rotate this note to another type.
  const note = makeNote({
    original_text: 'The figure was about less than 30%.',
    upgraded_text: 'The figure was just under 30%.',
    example_sentence: 'The figure was **just under** 30% in 2010.',
    reusable_pattern: 'The figure was just under ___.',
    times_reviewed: 3,
    review_stage: 2,
    mastery_status: 'learning',
    next_review_at: daysFromNow(-1).toISOString(),
  })
  await openApp(page, '/')
  await putRecords(page, { notes: [note] }, { reload: false })

  await page.goto('/review')
  await expect(page.getByTestId('review-prompt')).toBeVisible()
  await expect(page.getByText('Recall the better version')).toHaveCount(0)

  await page.goto('/settings')
  // The radio follows the saved setting, so it turns on a moment after the click.
  const always = page.getByRole('radio', { name: /Always Mistake → Upgrade/ })
  await always.click()
  await expect(always).toBeChecked()
  await page.goto('/review')
  await expect(page.getByText('Recall the better version')).toBeVisible()
  await expect(page.getByTestId('review-prompt')).toContainText('The figure was about less than 30%.')
})
