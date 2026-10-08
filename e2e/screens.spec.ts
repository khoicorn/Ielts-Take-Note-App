/**
 * Screen flows around the core loop (plan C3–C6): prev/next between notes, the model paragraph editor,
 * the Error Ledger, a Speaking topic preset, and calendar keys.
 */
import { dialog, expect, expectToast, loadExampleNotes, makeNote, MOD, type NoteRecord, openApp, putRecords, readStore, test } from './helpers/app'

test('from All Notes, ] and [ step through the list on the note page', async ({ page }) => {
  const a = makeNote({ upgraded_text: 'Older upgrade.', original_text: 'Older.', created_at: new Date(Date.now() - 5000).toISOString() })
  const b = makeNote({ upgraded_text: 'Newer upgrade.', original_text: 'Newer.', created_at: new Date(Date.now() - 1000).toISOString() })
  await openApp(page, '/')
  await putRecords(page, { notes: [a, b] }, { reload: false })
  await page.goto('/notes')
  await page.getByRole('link', { name: /Newer upgrade\./ }).first().click()
  await expect(page.getByText('1 of 2')).toBeVisible()
  await page.keyboard.press(']')
  await expect(page.getByText('2 of 2')).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/notes/${a.id}$`))
  await page.getByRole('button', { name: 'Previous note' }).click()
  await expect(page).toHaveURL(new RegExp(`/notes/${b.id}$`))
  await page.keyboard.press('[')
  await expect(page).toHaveURL(new RegExp(`/notes/${b.id}$`))
})

test('New model paragraph: the focus editor autosaves; Done shows the reading view', async ({ page }) => {
  await openApp(page, '/writing?tab=paragraphs')
  await page.getByRole('button', { name: 'New model paragraph' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit model paragraph' })
  await expect(editor).toBeVisible()
  await editor.getByLabel('Title').fill('Bar chart overview')
  await editor.getByLabel('Paragraph', { exact: true }).fill('Overall, **spending on food** rose steadily, while transport costs fell.')
  await expect(editor.getByRole('status')).toContainText('Saved')
  const [stored] = await readStore<{ title: string; body: string }>(page, 'paragraphs')
  expect(stored).toMatchObject({ title: 'Bar chart overview', body: 'Overall, **spending on food** rose steadily, while transport costs fell.' })

  await page.keyboard.press('Escape')
  await expect(editor).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'Bar chart overview' })).toBeVisible()
  await expect(page.getByTestId('paragraph-body')).toContainText('spending on food rose steadily')
  await expect(page.getByTestId('paragraph-body').locator('strong')).toHaveText('spending on food')

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Bar chart overview' })).toBeVisible()
})

test('typing then Done at once keeps the last words (no lost autosave)', async ({ page }) => {
  await openApp(page, '/writing?tab=paragraphs')
  await page.getByRole('button', { name: 'New model paragraph' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit model paragraph' })
  await editor.getByLabel('Paragraph', { exact: true }).fill('First sentence.')
  await editor.getByLabel('Paragraph', { exact: true }).press('End')
  await page.keyboard.type(' Second sentence typed just before Done.')
  await page.keyboard.press(`${MOD}+Enter`)
  await expect(editor).toBeHidden()
  await expect(page.getByTestId('paragraph-body')).toContainText('Second sentence typed just before Done.')
  const [stored] = await readStore<{ body: string }>(page, 'paragraphs')
  expect(stored.body).toBe('First sentence. Second sentence typed just before Done.')
})

test('My Mistakes groups a repeated habit and Related notes opens the list', async ({ page }) => {
  await loadExampleNotes(page)
  await page.goto('/mistakes')
  await expect(page.getByRole('heading', { level: 1, name: 'My Mistakes' })).toBeVisible()
  await expect(page.getByText('visitors of + place').first()).toBeVisible()
  await expect(page.getByText('visitors to + place').first()).toBeVisible()
  await expect(page.getByText(/Seen \d+ times/).first()).toBeVisible()
  const toggle = page.getByRole('button', { name: /Related notes/ }).first()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
})

test('New Speaking note on a topic page presets the topic', async ({ page }) => {
  await loadExampleNotes(page)
  await page.goto('/speaking?topic=Travel')
  await page.getByRole('button', { name: 'New Speaking note' }).click()
  const form = dialog(page, 'New Speaking note')
  await expect(form.getByRole('combobox', { name: 'Topic' })).toHaveValue('Travel')
  await form.getByLabel('Native Upgrade').fill('The view took my breath away.')
  await page.keyboard.press(`${MOD}+Enter`)
  await expectToast(page, 'Note saved.')
  const saved = (await readStore<NoteRecord>(page, 'notes')).find((n) => n.upgraded_text === 'The view took my breath away.')
  expect(saved?.topic).toBe('Travel')
  await expect(page.getByText('The view took my breath away.').first()).toBeVisible()
})

test('Calendar: arrow keys move the selected day', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 14, 10, 0, 0) })
  await openApp(page, '/calendar')
  const today = page.getByRole('button', { name: /^14 October/ })
  await today.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: /^15 October/ })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: /^22 October/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Thursday, 22 October')).toBeVisible()
})

test('deleting a model paragraph asks first and keeps the notes made from it', async ({ page }) => {
  await loadExampleNotes(page)
  await page.goto('/writing?tab=paragraphs')
  await page.getByRole('link', { name: /Task 1 — Opposite Trends/ }).first().click()
  const paragraphId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!)
  const linked = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.source_paragraph_id === paragraphId)
  expect(linked.length).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'More actions' }).or(page.getByRole('button', { name: /actions/i })).first().click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const ask = dialog(page, 'Delete this paragraph?')
  await expect(ask.getByText('Notes made from it are kept.')).toBeVisible()
  await ask.getByRole('button', { name: 'Delete paragraph' }).click()
  await expectToast(page, 'Paragraph deleted.')
  await expect(page).toHaveURL(/\/writing\?tab=paragraphs$/)

  const notes = await readStore<NoteRecord>(page, 'notes')
  for (const n of linked) expect(notes.some((x) => x.id === n.id)).toBe(true)
  await page.goto(`/notes/${linked[0].id}`)
  await expect(page.getByText(linked[0].upgraded_text.replace(/\*\*/g, '')).first()).toBeVisible()
  await expect(page.getByText('From paragraph')).toHaveCount(0)
})

test('a note saved in one tab appears in another open tab without a reload', async ({ page, context }) => {
  await openApp(page, '/notes')
  const other = await context.newPage()
  await openApp(other, '/notes')
  await expect(other.getByText('No notes yet')).toBeVisible()

  await page.keyboard.press('n')
  await page.keyboard.press('s')
  await dialog(page, 'New Speaking note').getByLabel('Native Upgrade').fill('Saved in the first tab.')
  await page.keyboard.press(`${MOD}+Enter`)
  await expectToast(page, 'Note saved.')

  await expect(other.getByText('Saved in the first tab.').first()).toBeVisible()
  await other.close()
})

/*
 * The paragraph editor saves 500ms after typing stops. A pending save must still land when the page
 * unloads (pagehide / beforeunload). The page clock is paused so the timed save cannot fire first;
 * that makes the test exact instead of timing-dependent.
 */
test('words typed just before a reload of the paragraph editor are kept', async ({ page }) => {
  await page.clock.install()
  await openApp(page, '/writing?tab=paragraphs')
  await page.getByRole('button', { name: 'New model paragraph' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit model paragraph' })
  const body = editor.getByLabel('Paragraph', { exact: true })
  await body.fill('Saved part.')
  await page.clock.runFor(1000)
  await expect(editor.getByRole('status')).toContainText('Saved')

  await page.clock.pauseAt(Date.now() + 60_000)
  await body.fill('Saved part. Last words.')
  page.once('dialog', (d) => void d.accept())
  await page.reload()
  const [stored] = await readStore<{ body: string }>(page, 'paragraphs')
  expect(stored.body).toBe('Saved part. Last words.')
})
