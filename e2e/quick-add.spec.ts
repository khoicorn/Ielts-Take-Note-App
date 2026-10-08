/**
 * Quick Add (design §12, plan C1): both modes, validation, smart paste of a labelled ChatGPT block,
 * Undo after Fill, and Save and add another.
 */
import { dialog, expect, expectToast, MOD, type NoteRecord, openApp, pasteInto, readStore, test, toast, waitForDb } from './helpers/app'

/** What ChatGPT puts on the clipboard: bold labels, one paragraph each. */
const CHATGPT_HTML = [
  '<p><strong>Original:</strong> I don\'t customize other factors.</p>',
  '<p><strong>More natural:</strong> I\'m pretty flexible about the rest.</p>',
  '<p><strong>Why:</strong> "customize" sounds technical.</p>',
  '<p><strong>Example:</strong> I normally ask them to cut the sugar down to 30%, but I\'m pretty flexible about the rest.</p>',
].join('')
const CHATGPT_PLAIN = [
  "Original: I don't customize other factors.",
  "More natural: I'm pretty flexible about the rest.",
  'Why: "customize" sounds technical.',
  "Example: I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.",
].join('\n\n')

test.beforeEach(async ({ page }) => {
  await openApp(page, '/')
  await waitForDb(page)
})

test('Speaking: N, S, type and Ctrl+Enter saves the note', async ({ page }) => {
  await page.keyboard.press('n')
  await expect(dialog(page, 'What are you saving?')).toBeVisible()
  await page.keyboard.press('s')

  const form = dialog(page, 'New Speaking note')
  await expect(form).toBeVisible()
  const topic = form.getByRole('combobox', { name: 'Topic' })
  await topic.fill('Travel')
  await topic.press('Enter')
  await form.getByLabel('What I Said').fill('"We enjoyed the scenario."')
  await form.getByLabel('Native Upgrade').fill('The scenery was beautiful.')
  await form.getByLabel('In context').fill('The scenery along the coast was beautiful.')
  await page.keyboard.press(`${MOD}+Enter`)

  await expectToast(page, 'Note saved.')
  await expect(form).toBeHidden()

  const notes = await readStore<NoteRecord>(page, 'notes')
  expect(notes).toHaveLength(1)
  expect(notes[0]).toMatchObject({
    mode: 'speaking',
    topic: 'Travel',
    // One pair of wrapping quotes is dropped on save (design §7).
    original_text: 'We enjoyed the scenario.',
    upgraded_text: 'The scenery was beautiful.',
    example_sentence: 'The scenery along the coast was beautiful.',
    task_type: '',
    review_stage: 0,
    mastery_status: 'new',
  })
  expect(notes[0].next_review_at).not.toBeNull()
})

test('Save without an upgrade shows the field error and keeps the dialog open', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  await form.getByLabel('What I Said').fill('We enjoyed the scenario.')
  await page.keyboard.press(`${MOD}+Enter`)

  await expect(form.getByText('Add the better version first.')).toBeVisible()
  await expect(form.getByLabel('Native Upgrade')).toBeFocused()
  await expect(form).toBeVisible()
  expect(await readStore(page, 'notes')).toHaveLength(0)
})

test('Writing: W, Task 2, all essential fields, View opens the saved note', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('w')

  const form = dialog(page, 'New Writing note')
  await expect(form).toBeVisible()
  await form.getByRole('tab', { name: 'Task 2' }).click()
  await form.getByLabel('My Sentence').fill('Online learning has many advantage.')
  await form.getByLabel('Band 7+ Upgrade').fill('Online learning offers considerable advantages.')
  await form.getByLabel('Reusable pattern').fill('___ offers considerable advantages.')
  await form.getByLabel('Example', { exact: true }).fill('Online learning offers considerable advantages for working adults.')
  await form.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(form).toBeHidden()
  const saved = toast(page, 'Note saved.')
  await expect(saved).toBeVisible()
  await saved.getByRole('button', { name: 'View' }).click()

  await expect(page).toHaveURL(/\/notes\/[^/]+$/)
  await expect(page.getByText('Online learning offers considerable advantages.').first()).toBeVisible()

  const [note] = await readStore<NoteRecord>(page, 'notes')
  expect(note).toMatchObject({
    mode: 'writing',
    task_type: 'task2',
    original_text: 'Online learning has many advantage.',
    upgraded_text: 'Online learning offers considerable advantages.',
    reusable_pattern: '___ offers considerable advantages.',
  })
  expect(page.url()).toContain(`/notes/${note.id}`)
})

test('Smart paste: a labelled ChatGPT block fills four fields and saves them', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  const original = form.getByLabel('What I Said')

  await pasteInto(original, { html: CHATGPT_HTML, plain: CHATGPT_PLAIN })
  const bar = form.getByText('This looks like a correction. Fill 4 fields from it?')
  await expect(bar).toBeVisible()
  await form.getByRole('button', { name: 'Fill fields' }).click()

  await expect(bar).toBeHidden()
  await expect(form.getByText('Fields filled')).toBeVisible()
  await expect(original).toHaveValue("I don't customize other factors.")
  await expect(form.getByLabel('Native Upgrade')).toHaveValue("I'm pretty flexible about the rest.")
  await expect(form.getByLabel('In context')).toHaveValue(
    "I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.",
  )
  // Why lives in More details, which opens to show it.
  await expect(form.getByLabel('Why', { exact: true })).toHaveValue('"customize" sounds technical.')

  await page.keyboard.press(`${MOD}+Enter`)
  await expectToast(page, 'Note saved.')
  const [note] = await readStore<NoteRecord>(page, 'notes')
  expect(note).toMatchObject({
    original_text: "I don't customize other factors.",
    upgraded_text: "I'm pretty flexible about the rest.",
    explanation: '"customize" sounds technical.',
    example_sentence: "I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.",
  })
})

test('Smart paste: Undo in the form puts the pasted block back', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  const original = form.getByLabel('What I Said')

  await pasteInto(original, { html: CHATGPT_HTML, plain: CHATGPT_PLAIN })
  await form.getByRole('button', { name: 'Fill fields' }).click()
  await expect(form.getByLabel('Native Upgrade')).toHaveValue("I'm pretty flexible about the rest.")

  await form.getByRole('button', { name: 'Undo' }).click()
  await expect(form.getByLabel('Native Upgrade')).toHaveValue('')
  await expect(original).toHaveValue(/Original:.*I don't customize other factors\./s)
  await expect(original).toHaveValue(/More natural:/)
})

test('Save and add another keeps the topic, clears the sentences and focuses What I Said', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  const topic = form.getByRole('combobox', { name: 'Topic' })
  await topic.fill('Food')
  await topic.press('Enter')
  await form.getByLabel('What I Said').fill('The food was very delicious.')
  await form.getByLabel('Native Upgrade').fill('The food was absolutely delicious.')
  await form.getByRole('button', { name: 'Save and add another' }).click()

  await expectToast(page, 'Note saved.')
  await expect(form).toBeVisible()
  await expect(topic).toHaveValue('Food')
  await expect(form.getByLabel('What I Said')).toHaveValue('')
  await expect(form.getByLabel('Native Upgrade')).toHaveValue('')
  await expect(form.getByLabel('What I Said')).toBeFocused()

  await page.keyboard.type('I very like street food.')
  await form.getByLabel('Native Upgrade').fill('I really love street food.')
  await page.keyboard.press(`${MOD}+Enter`)
  await expect(form).toBeHidden()

  const notes = await readStore<NoteRecord>(page, 'notes')
  expect(notes).toHaveLength(2)
  expect(notes.map((n) => n.topic)).toEqual(['Food', 'Food'])
  expect(notes.map((n) => n.upgraded_text).sort()).toEqual(['I really love street food.', 'The food was absolutely delicious.'])
})

test('a closed dialog keeps the draft; reopening restores it, and Discard clears it', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  await form.getByLabel('What I Said').fill('I am agree with you.')
  await form.getByLabel('Native Upgrade').fill('I agree with you.')
  await page.keyboard.press('Escape')
  await expect(form).toBeHidden()
  expect(await readStore(page, 'notes')).toHaveLength(0)

  // A reload in between: the draft lives in localStorage.
  await page.reload()
  await page.locator('main').first().waitFor()
  await page.keyboard.press('n')
  const again = dialog(page, 'New Speaking note')
  await expect(again).toBeVisible()
  await expect(again.getByText('Draft restored')).toBeVisible()
  await expect(again.getByLabel('What I Said')).toHaveValue('I am agree with you.')
  await expect(again.getByLabel('Native Upgrade')).toHaveValue('I agree with you.')

  await again.getByRole('button', { name: 'Discard' }).click()
  await expect(again.getByLabel('What I Said')).toHaveValue('')
  await expect(again.getByLabel('Native Upgrade')).toHaveValue('')
  await page.keyboard.press('Escape')
  // App keys pause while a dialog is open or fading out.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('n')
  await expect(dialog(page, 'What are you saving?').or(dialog(page, 'New Speaking note'))).toBeVisible()
  await expect(page.getByText('Draft restored')).toHaveCount(0)
})

test('smart paste of plain text with ❌ / ✅ / 💡 labels fills three fields', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  const original = form.getByLabel('What I Said')
  await pasteInto(original, {
    plain: '❌ I very like it.\n✅ I really like it.\n💡 "Very" cannot go before a verb.',
  })
  await expect(form.getByText('This looks like a correction. Fill 3 fields from it?')).toBeVisible()
  await form.getByRole('button', { name: 'Fill fields' }).click()
  await expect(original).toHaveValue('I very like it.')
  await expect(form.getByLabel('Native Upgrade')).toHaveValue('I really like it.')
  await expect(form.getByLabel('Why', { exact: true })).toHaveValue('"Very" cannot go before a verb.')
})

test('a sentence pasted into Topic goes to What I Said instead', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  const topic = form.getByRole('combobox', { name: 'Topic' })
  await pasteInto(topic, { plain: 'We enjoyed the scenario very much.' })
  await expect(form.getByLabel('What I Said')).toHaveValue('We enjoyed the scenario very much.')
  await expect(topic).toHaveValue('')
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the bottom bar New note button opens Quick Add and Save works', async ({ page }) => {
    await page.getByRole('button', { name: 'New note' }).click()
    const choose = dialog(page, 'What are you saving?')
    await expect(choose).toBeVisible()
    await choose.getByRole('button', { name: 'Speaking' }).click()
    const form = dialog(page, 'New Speaking note')
    await form.getByLabel('What I Said').fill('It was a good weather.')
    await form.getByLabel('Native Upgrade').fill('The weather was lovely.')
    const save = form.getByRole('button', { name: 'Save', exact: true })
    await expect(save).toBeInViewport()
    const box = await save.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    await save.click()
    await expectToast(page, 'Note saved.')
    expect(await readStore(page, 'notes')).toHaveLength(1)
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollW).toBeLessThanOrEqual(390)
  })
})

test('a topic and a tag typed but not chosen are kept when Ctrl+Enter saves', async ({ page }) => {
  await page.keyboard.press('n')
  await page.keyboard.press('s')
  const form = dialog(page, 'New Speaking note')
  await form.getByLabel('What I Said').fill('I am living in Hanoi since 2010.')
  await form.getByLabel('Native Upgrade').fill('I have lived in Hanoi since 2010.')
  await form.getByRole('button', { name: /^More details/ }).click()
  await form.getByRole('combobox', { name: 'Tags' }).or(form.getByLabel('Tags')).first().fill('tenses')
  await form.getByRole('combobox', { name: 'Topic' }).fill('Neighbourhood')
  await page.keyboard.press(`${MOD}+Enter`)
  await expectToast(page, 'Note saved.')

  const [note] = await readStore<NoteRecord>(page, 'notes')
  expect(note.topic).toBe('Neighbourhood')
  expect(note.tags).toEqual(['tenses'])
})

test('More details: Start tomorrow and Do not review set the schedule', async ({ page }) => {
  for (const [choice, check] of [
    ['Start tomorrow', (n: NoteRecord) => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      expect(new Date(n.next_review_at!).getTime()).toBe(tomorrow.getTime())
    }],
    ['Do not review', (n: NoteRecord) => expect(n.next_review_at).toBeNull()],
  ] as const) {
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.keyboard.press('n')
    const choose = dialog(page, 'What are you saving?')
    const form = dialog(page, 'New Speaking note')
    await expect(choose.or(form)).toBeVisible()
    if (await choose.isVisible()) await page.keyboard.press('s')
    await form.getByLabel('Native Upgrade').fill(`Upgrade for ${choice}.`)
    const toggle = form.getByRole('button', { name: /^More details/ })
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    await form.getByRole('radiogroup', { name: 'First review' }).getByRole('radio', { name: choice }).click()
    await page.keyboard.press(`${MOD}+Enter`)
    await expect(form).toBeHidden()
    const note = (await readStore<NoteRecord>(page, 'notes')).find((n) => n.upgraded_text === `Upgrade for ${choice}.`)
    expect(note, `note saved with ${choice}`).toBeTruthy()
    check(note!)
  }
  // Neither note is due today.
  await expect(page.getByText('Nothing is waiting for review today.')).toBeVisible()
})
