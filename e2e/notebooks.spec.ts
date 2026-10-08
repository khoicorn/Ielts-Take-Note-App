/**
 * Notebooks and Settings (plan C5, C7, design §9, §11): All Notes keyboard and filters in the URL,
 * Must Remember, and "Delete all data" behind a typed DELETE.
 */
import { dialog, expect, expectToast, loadExampleNotes, makeNote, type NoteRecord, openApp, putRecords, readStore, test, toast } from './helpers/app'

test('All Notes: J focuses the first row, ↓ / ↑ move, Enter opens the focused note', async ({ page }) => {
  const a = makeNote({ upgraded_text: 'First upgrade.', original_text: 'First.', created_at: new Date(Date.now() - 2000).toISOString() })
  const b = makeNote({ upgraded_text: 'Second upgrade.', original_text: 'Second.', created_at: new Date(Date.now() - 1000).toISOString() })
  await openApp(page, '/')
  await putRecords(page, { notes: [a, b] }, { reload: false })
  await page.goto('/notes')
  await expect(page.getByRole('heading', { name: 'All Notes' })).toBeVisible()
  await expect(page.getByText('2 notes')).toBeVisible()

  // J / K work anywhere on the page; ↑ / ↓ once a row has focus (so arrows still scroll the page).
  await page.getByRole('heading', { name: 'All Notes' }).click()
  await page.keyboard.press('j')
  const focused = page.locator(':focus')
  await expect(focused).toHaveAttribute('href', /\/notes\/.+/)
  const firstHref = await focused.getAttribute('href')
  await page.keyboard.press('ArrowDown')
  await expect(focused).not.toHaveAttribute('href', firstHref!)
  const secondHref = await focused.getAttribute('href')
  expect(secondHref).toMatch(/\/notes\/.+/)
  await page.keyboard.press('ArrowUp')
  await expect(focused).toHaveAttribute('href', firstHref!)
  await page.keyboard.press('ArrowDown')
  await expect(focused).toHaveAttribute('href', secondHref!)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`${secondHref}$`))
})

test('All Notes: the Mode filter lives in the URL and survives a reload', async ({ page }) => {
  await loadExampleNotes(page)
  await page.goto('/notes')
  const all = (await readStore<NoteRecord>(page, 'notes')).filter((n) => !n.is_archived)
  const speaking = all.filter((n) => n.mode === 'speaking')
  await expect(page.getByText(`${all.length} notes`)).toBeVisible()

  await page.goto('/notes?mode=speaking')
  await expect(page.getByText(`${speaking.length} notes`).or(page.getByText(`${speaking.length} of ${all.length}`))).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/mode=speaking/)
  await expect(page.getByText(/^Speaking$/).first()).toBeVisible()
  const writingOnly = all.find((n) => n.mode === 'writing')!
  await expect(page.getByText(writingOnly.upgraded_text.replace(/\*\*/g, ''), { exact: true })).toHaveCount(0)
})

test('Must Remember lists only marked notes; the ribbon toggle removes one', async ({ page }) => {
  const marked = makeNote({ upgraded_text: 'Marked upgrade.', original_text: 'Marked.', is_favorite: true })
  const plain = makeNote({ upgraded_text: 'Plain upgrade.', original_text: 'Plain.' })
  await openApp(page, '/')
  await putRecords(page, { notes: [marked, plain] }, { reload: false })
  await page.goto('/must-remember')
  await expect(page.getByText('Marked upgrade.').first()).toBeVisible()
  await expect(page.getByText('Plain upgrade.')).toHaveCount(0)

  await page.getByRole('button', { name: 'Must Remember', pressed: true }).first().click()
  await expectToast(page, 'Removed from Must Remember.')
  await expect(page.getByText('Marked upgrade.')).toHaveCount(0)
  const stored = (await readStore<NoteRecord>(page, 'notes')).find((n) => n.id === marked.id)
  expect(stored?.is_favorite).toBe(false)

  await toast(page, 'Removed from Must Remember.').getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Marked upgrade.').first()).toBeVisible()
})

test('Delete all data needs DELETE typed, then empties the notebook', async ({ page }) => {
  await loadExampleNotes(page)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Delete all data' }).click()
  const ask = dialog(page, 'Delete all data?')
  await expect(ask).toBeVisible()
  const confirm = ask.getByRole('button', { name: 'Delete all data' })
  await expect(confirm).toBeDisabled()
  await ask.getByLabel('Type DELETE to confirm.').fill('delete')
  await expect(confirm).toBeDisabled()
  await ask.getByLabel('Type DELETE to confirm.').fill('DELETE')
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expectToast(page, 'All data deleted.')
  expect(await readStore(page, 'notes')).toHaveLength(0)
  expect(await readStore(page, 'reviews')).toHaveLength(0)
  expect(await readStore(page, 'paragraphs')).toHaveLength(0)

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Load example notes' })).toBeVisible()
})
