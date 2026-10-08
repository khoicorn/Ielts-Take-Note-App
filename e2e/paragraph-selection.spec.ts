/**
 * Selection to note (brief §23, design §7, plan C6): select a phrase in a model paragraph with the mouse,
 * choose "Save as Collocation", and Quick Add opens prefilled with the phrase, its sentence and a link back.
 */
import type { Page } from '@playwright/test'
import { dialog, expect, expectToast, loadExampleNotes, MOD, type NoteRecord, readStore, test } from './helpers/app'

const PHRASE = 'markedly different trends'
const SENTENCE = 'From 2012 to 2022, the three attractions showed markedly different trends.'

/** Drags the mouse across `phrase` inside the paragraph body, like a reader selecting it. */
async function dragSelect(page: Page, phrase: string): Promise<void> {
  const box = await page.getByTestId('paragraph-body').evaluate((root, text) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.textContent?.indexOf(text) ?? -1
      if (at < 0) continue
      const first = document.createRange()
      first.setStart(node, at)
      first.setEnd(node, at + 1)
      const last = document.createRange()
      last.setStart(node, at + text.length - 1)
      last.setEnd(node, at + text.length)
      const a = first.getBoundingClientRect()
      const b = last.getBoundingClientRect()
      return { x1: a.left + 1, y1: a.top + a.height / 2, x2: b.right - 1, y2: b.top + b.height / 2 }
    }
    return null
  }, phrase)
  if (!box) throw new Error(`"${phrase}" is not in one text node of the paragraph body`)
  await page.mouse.move(box.x1, box.y1)
  await page.mouse.down()
  await page.mouse.move((box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2, { steps: 4 })
  await page.mouse.move(box.x2, box.y2, { steps: 4 })
  await page.mouse.up()
}

test('select a phrase, Save as Collocation, and the note links back to the paragraph', async ({ page }) => {
  await loadExampleNotes(page)
  await page.goto('/writing?tab=paragraphs')
  await page.getByRole('link', { name: /Task 1 — Opposite Trends/ }).first().click()
  await expect(page).toHaveURL(/\/writing\/paragraphs\/[^/?]+$/)
  const paragraphId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!)
  await expect(page.getByTestId('paragraph-body')).toContainText(PHRASE)

  await dragSelect(page, PHRASE)
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(PHRASE)

  const menu = page.getByRole('menu', { name: 'Create note from selection' })
  await expect(menu).toBeVisible()
  await expect(page.getByText(`“${PHRASE}”`)).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Save as Collocation' }).click()

  const form = dialog(page, 'New note from paragraph')
  await expect(form).toBeVisible()
  await expect(form.getByLabel('Band 7+ Upgrade')).toHaveValue(PHRASE)
  await expect(form.getByLabel('Example', { exact: true })).toHaveValue(SENTENCE)
  await expect(form.getByRole('tab', { name: 'Academic Task 1' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press(`${MOD}+Enter`)
  await expectToast(page, 'Note saved.')
  await expect(form).toBeHidden()

  const saved = (await readStore<NoteRecord>(page, 'notes')).filter((n) => n.upgraded_text === PHRASE)
  expect(saved).toHaveLength(1)
  expect(saved[0]).toMatchObject({
    mode: 'writing',
    note_type: 'collocation',
    source_paragraph_id: paragraphId,
    task_type: 'task1',
    task_genre: 'Line Graph',
    topic: 'Comparison',
    example_sentence: SENTENCE,
  })

  // The paragraph lists the new note, and the note page links back.
  await expect(page.getByRole('heading', { name: 'Notes from this paragraph' })).toBeVisible()
  await expect(page.getByText(PHRASE).first()).toBeVisible()
  await page.goto(`/notes/${saved[0].id}`)
  await expect(page.getByRole('link', { name: /Task 1 — Opposite Trends/ })).toBeVisible()
})

test('Esc closes the selection menu without saving anything', async ({ page }) => {
  await loadExampleNotes(page)
  await page.goto('/writing?tab=paragraphs')
  await page.getByRole('link', { name: /Task 1 — Opposite Trends/ }).first().click()
  const before = (await readStore(page, 'notes')).length

  await dragSelect(page, PHRASE)
  const menu = page.getByRole('menu', { name: 'Create note from selection' })
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await readStore(page, 'notes')).toHaveLength(before)
})
