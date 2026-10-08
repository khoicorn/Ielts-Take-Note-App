/**
 * Global search (design §8, §12, plan C7): Ctrl+K or /, highlighted results for "stable",
 * Enter opens the active note, and a query with no match offers to save it as a note.
 */
import { dialog, expect, loadExampleNotes, MOD, type NoteRecord, readStore, test } from './helpers/app'

test.beforeEach(async ({ page }) => {
  await loadExampleNotes(page)
})

test('"stable" finds highlighted notes; Enter opens the active one', async ({ page }) => {
  await page.keyboard.press(`${MOD}+k`)
  const palette = dialog(page, 'Search notes')
  await expect(palette).toBeVisible()
  const input = palette.getByRole('combobox', { name: 'Search notes' })
  await expect(input).toBeFocused()
  await input.fill('stable')

  const results = palette.getByRole('listbox', { name: 'Results' })
  const options = results.getByRole('option')
  await expect(palette.getByText('Notes', { exact: true })).toBeVisible()
  await expect(options.first()).toBeVisible()
  expect(await options.count()).toBeGreaterThanOrEqual(2)
  // Matches are highlighted.
  await expect(results.locator('mark').first()).toBeVisible()
  await expect(results.locator('mark').first()).toHaveText(/stabl/i)
  // Stemming: "stable" also finds the notes filed under the topic Stability.
  await expect(results.getByText('remained relatively stable').first()).toBeVisible()

  const active = results.locator('[role="option"][aria-selected="true"]')
  await expect(active).toHaveCount(1)
  const activeText = (await active.innerText()).replace(/\s+/g, ' ')

  await input.press('Enter')
  await expect(palette).toBeHidden()
  await expect(page).toHaveURL(/\/notes\/[^/?#]+$/)
  const id = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!)
  const note = (await readStore<NoteRecord>(page, 'notes')).find((n) => n.id === id)
  expect(note, 'Enter should open an existing note').toBeTruthy()
  const upgradePlain = note!.upgraded_text.replace(/\*\*/g, '')
  expect(activeText).toContain(upgradePlain)
  await expect(page.getByRole('heading', { name: `Note: ${upgradePlain}` })).toBeAttached()
})

test('ArrowDown moves the active row; "/" also opens search', async ({ page }) => {
  await page.keyboard.press('/')
  const palette = dialog(page, 'Search notes')
  const input = palette.getByRole('combobox', { name: 'Search notes' })
  await expect(input).toBeFocused()
  await input.fill('stable')
  const options = palette.getByRole('option')
  await expect(options.nth(1)).toBeVisible()
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true')
  await input.press('ArrowDown')
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false')
  await input.press('Escape')
  await expect(palette).toBeHidden()
})

test('no result offers "Save as a new note", which opens Quick Add prefilled', async ({ page }) => {
  await page.keyboard.press(`${MOD}+k`)
  const palette = dialog(page, 'Search notes')
  await palette.getByRole('combobox', { name: 'Search notes' }).fill('zebra crossing')
  await expect(palette.getByText('No notes match “zebra crossing”.')).toBeVisible()
  await palette.getByRole('button', { name: 'Save “zebra crossing” as a new note' }).click()

  // The prefill has text but no mode, so Quick Add asks for the mode first.
  const choose = dialog(page, 'What are you saving?')
  await expect(choose).toBeVisible()
  await page.keyboard.press('s')
  await expect(dialog(page, 'New Speaking note').getByLabel('Native Upgrade')).toHaveValue('zebra crossing')
})

test('a model paragraph result opens the paragraph', async ({ page }) => {
  await page.keyboard.press(`${MOD}+k`)
  const palette = dialog(page, 'Search notes')
  const input = palette.getByRole('combobox', { name: 'Search notes' })
  await input.fill('Botanical Garden')
  const group = palette.getByRole('group', { name: /Model paragraphs/ })
  await expect(group).toBeVisible()
  await group.getByRole('option').first().click()
  await expect(page).toHaveURL(/\/writing\/paragraphs\/[^/?]+$/)
  await expect(page.getByRole('heading', { level: 1, name: /Task 1 — Opposite Trends/ })).toBeVisible()
})
