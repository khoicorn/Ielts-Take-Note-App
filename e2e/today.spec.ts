/**
 * Today (brief §5, §44, plan C4): the first run explains the loop in three steps and offers
 * "Add first note" and "Load example notes"; loading the examples fills Today.
 */
import { dialog, expect, expectToast, MOD, openApp, readStore, test } from './helpers/app'

test('first run shows the three steps, and Load example notes fills the notebook', async ({ page }) => {
  await openApp(page, '/')
  const steps = page.getByRole('list', { name: 'How it works' }).getByRole('listitem')
  await expect(steps).toHaveCount(3)
  // The gap after "1." is a CSS margin, so the text has no space there.
  await expect(steps.nth(0)).toContainText(/1\.\s*Save what you said\./)
  await expect(steps.nth(1)).toContainText(/2\.\s*Save the better version\./)
  await expect(steps.nth(2)).toContainText(/3\.\s*Review it until it sticks\./)
  await expect(page.getByRole('button', { name: /Add first note/ })).toBeVisible()
  const load = page.getByRole('button', { name: 'Load example notes' })
  await expect(load).toBeVisible()

  await load.click()
  await expectToast(page, 'Example notes added. Remove them in Settings.')
  await expect(steps).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Begin Review' })).toBeVisible()
  await expect(page.getByText(/^Your notebook has \d+ items? waiting for review\.$/)).toBeVisible()

  const notes = await readStore<{ tags: string[] }>(page, 'notes')
  expect(notes.length).toBeGreaterThanOrEqual(30)
  expect(notes.every((n) => n.tags.includes('example'))).toBe(true)
  expect(await readStore(page, 'paragraphs')).toHaveLength(2)

  // Still there after a reload.
  await page.reload()
  await expect(page.getByRole('link', { name: 'Begin Review' })).toBeVisible()
})

test('Add first note opens Quick Add at the mode choice', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: /Add first note/ }).click()
  const choose = dialog(page, 'What are you saving?')
  await expect(choose).toBeVisible()
  await expect(choose.getByRole('button', { name: 'Speaking' })).toBeVisible()
  await expect(choose.getByRole('button', { name: 'Writing' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(choose).toBeHidden()
})

test('Remove example notes in Settings returns Today to the first run', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Load example notes' }).click()
  await expectToast(page, 'Example notes added. Remove them in Settings.')

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Remove example notes' }).click()
  const ask = page.getByRole('dialog', { name: 'Remove example notes?' })
  await expect(ask).toBeVisible()
  await ask.getByRole('button', { name: 'Remove example notes' }).click()
  await expectToast(page, /^\d+ example notes removed\.$/)
  expect(await readStore(page, 'notes')).toHaveLength(0)

  await page.goto('/')
  await expect(page.getByRole('list', { name: 'How it works' }).getByRole('listitem')).toHaveCount(3)
})

test('Continue studying points at the topic of the last saved note', async ({ page }) => {
  await openApp(page, '/')
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  const topic = form.getByRole('combobox', { name: 'Topic' })
  await topic.fill('Hometown')
  await topic.press('Enter')
  await form.getByLabel('Native Upgrade').fill('It is a laid-back coastal town.')
  await page.keyboard.press(`${MOD}+Enter`)
  await expect(form).toBeHidden()

  const section = page.getByRole('region', { name: 'Continue studying' }).or(page.locator('#continue'))
  await expect(section).toBeVisible()
  await expect(section).toContainText('Speaking')
  await expect(section).toContainText('Hometown')
  await expect(section).toContainText(/Last studied today/i)
  await section.getByRole('link').click()
  await expect(page).toHaveURL(/\/speaking\?topic=Hometown$/)
  await expect(page.getByText('It is a laid-back coastal town.').first()).toBeVisible()
})

test('with 10+ notes and no backup, Today offers "Export a copy."; a JSON export clears it', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Load example notes' }).click()
  await expectToast(page, 'Example notes added. Remove them in Settings.')
  await expect(page.getByText('No backup yet.')).toBeVisible()
  await page.getByRole('link', { name: 'Export a copy.' }).click()
  await expect(page).toHaveURL(/\/settings#data$/)

  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON backup' }).click()])
  await expectToast(page, 'Backup exported.')
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Begin Review' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Export a copy.' })).toHaveCount(0)
})

test('Must Remember lists favorite model paragraphs after the notes', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Load example notes' }).click()
  await expectToast(page, 'Example notes added. Remove them in Settings.')
  await page.goto('/must-remember')
  await expect(page.getByRole('heading', { name: 'Model paragraphs' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Task 1 — Opposite Trends/ })).toBeVisible()
  await expect(page.getByText('Task 2 — Concession and Rebuttal')).toHaveCount(0)
})

// In-app links to a Settings section (/settings#data from Today's backup line) scroll to that section.
test('"Export a copy." on Today lands on the Your data section', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Load example notes' }).click()
  await expectToast(page, 'Example notes added. Remove them in Settings.')
  await page.getByRole('link', { name: 'Export a copy.' }).click()
  await expect(page).toHaveURL(/\/settings#data$/)
  await expect(page.getByRole('button', { name: 'Export JSON backup' })).toBeInViewport({ timeout: 5000 })
})

test('"Most repeated issue this week" opens My Mistakes at that error type', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Load example notes' }).click()
  await expectToast(page, 'Example notes added. Remove them in Settings.')
  const issue = page.locator('a[href^="/mistakes#"]').first()
  await expect(issue).toBeVisible()
  const slug = (await issue.getAttribute('href'))!.split('#')[1]
  await issue.click()
  await expect(page).toHaveURL(new RegExp(`/mistakes#${slug}$`))
  await expect(page.locator(`[id="${slug}"]`)).toBeInViewport()
})
