/**
 * The plan's Review Focus, end to end: every example card type in one session, a note with only an
 * upgrade, very long unbroken text on a phone, and local day boundaries (a fixed clock).
 */
import type { Page } from '@playwright/test'
import { dayKey, expect, loadExampleNotes, makeNote, makeReview, MOD, openApp, putRecords, readStore, test } from './helpers/app'

async function expectNoJunk(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/)
}

test('the example notebook: a full session over every due card renders cleanly', async ({ page }) => {
  await loadExampleNotes(page)
  await page.getByRole('link', { name: 'Begin Review' }).click()
  const counter = page.locator('header').getByText(/^Note \d+ of \d+$/)
  await expect(counter).toBeVisible()
  const total = Number((await counter.innerText()).match(/of (\d+)/)![1])
  expect(total).toBeGreaterThan(0)
  const types = new Set<string>()
  for (let i = 1; i <= total; i++) {
    await expect(counter).toHaveText(`Note ${i} of ${total}`)
    await expect(page.getByTestId('review-prompt')).not.toBeEmpty()
    types.add(await page.locator('header p').last().innerText())
    await expectNoJunk(page)
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: /^Good/ })).toBeFocused()
    await expectNoJunk(page)
    await page.keyboard.press('3')
  }
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  await expect(page.getByText(`${total} notes reviewed.`)).toBeVisible()
  test.info().annotations.push({ type: 'review types seen', description: [...types].join(', ') })
})

test('a note with only an upgrade renders without empty labels on every screen', async ({ page }) => {
  const bare = makeNote({ topic: '', original_text: '', upgraded_text: 'a far cry from', note_type: 'useful_expression' })
  await openApp(page, '/')
  await putRecords(page, { notes: [bare] }, { reload: false })

  await page.goto(`/notes/${bare.id}`)
  await expect(page.getByText('a far cry from').first()).toBeVisible()
  await expect(page.getByText('What I Said')).toHaveCount(0)
  await expect(page.getByText('In context')).toHaveCount(0)
  await expectNoJunk(page)

  for (const path of ['/', '/notes', '/speaking', '/must-remember', '/mistakes', '/calendar']) {
    await page.goto(path)
    await page.locator('main').first().waitFor()
    await expectNoJunk(page)
  }

  await page.goto('/review')
  await expect(page.getByText('Use it in a full sentence')).toBeVisible()
  await expect(page.getByTestId('review-prompt')).toContainText('a far cry from')
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: /^Good/ })).toBeVisible()
  await expectNoJunk(page)

  await page.goto('/')
  await page.keyboard.press(`${MOD}+k`)
  await page.getByRole('combobox', { name: 'Search notes' }).fill('far cry')
  await expect(page.getByRole('option').first()).toContainText('a far cry from')
  await expectNoJunk(page)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('a 120-character URL and a 500-word explanation never cause horizontal scroll', async ({ page }) => {
    const url = `https://example.com/${'a'.repeat(100)}/path`
    const long = makeNote({
      original_text: `I read it on ${url}`,
      upgraded_text: `I found it on ${url}`,
      explanation: Array.from({ length: 500 }, (_, i) => (i % 40 === 0 ? url : 'word')).join(' '),
      example_sentence: `See ${url} for more.`,
      reusable_pattern: `I found it on ___ ${'x'.repeat(80)}`,
    })
    await openApp(page, '/')
    await putRecords(page, { notes: [long] }, { reload: false })
    for (const path of [`/notes/${long.id}`, '/notes', '/speaking', '/', '/review']) {
      await page.goto(path)
      await page.locator('main').first().waitFor()
      await expect(page.getByText(/I (found|read) it on/).first()).toBeVisible()
      if (path === '/review') await page.keyboard.press('Space')
      const width = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(width, `horizontal scroll on ${path}`).toBeLessThanOrEqual(390)
    }
  })
})

test.describe('local day boundaries', () => {
  // 23:59 local time on 14 October 2026, then 00:01 the next day.
  const evening = new Date(2026, 9, 14, 23, 59, 0)
  const afterMidnight = new Date(2026, 9, 15, 0, 1, 0)
  const midnight = new Date(2026, 9, 15, 0, 0, 0)

  test('a note due tomorrow is not due at 23:59 and is due at 00:01', async ({ page }) => {
    await page.clock.install({ time: evening })
    await openApp(page, '/')
    const note = makeNote({
      original_text: 'Midnight mistake.',
      upgraded_text: 'Midnight upgrade.',
      review_stage: 1,
      mastery_status: 'learning',
      times_reviewed: 1,
      next_review_at: midnight.toISOString(),
      date_created: dayKey(new Date(2026, 9, 13)),
      created_at: new Date(2026, 9, 13, 12).toISOString(),
      updated_at: new Date(2026, 9, 13, 12).toISOString(),
    })
    await putRecords(page, { notes: [note] })
    await expect(page.getByText('Nothing is waiting for review today.')).toBeVisible()
    await expect(page.getByText('Next review tomorrow · 1 note')).toBeVisible()

    await page.clock.setSystemTime(afterMidnight)
    await page.reload()
    await expect(page.getByText('Your notebook has 1 item waiting for review.')).toBeVisible()
  })

  test('a review at 23:59 counts on that day in the calendar, checked at 00:01', async ({ page }) => {
    await page.clock.install({ time: evening })
    await openApp(page, '/')
    const note = makeNote({
      original_text: 'Late mistake.',
      upgraded_text: 'Late upgrade.',
      next_review_at: new Date(2026, 9, 14, 9).toISOString(),
      date_created: dayKey(new Date(2026, 9, 14)),
      created_at: new Date(2026, 9, 14, 9).toISOString(),
      updated_at: new Date(2026, 9, 14, 9).toISOString(),
    })
    await putRecords(page, { notes: [note] }, { reload: false })
    await page.goto('/review')
    await expect(page.getByTestId('review-prompt')).toContainText('Late mistake.')
    await page.keyboard.press('Space')
    await page.keyboard.press('3')
    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
    const [review] = await readStore<{ review_date: string }>(page, 'reviews')
    expect(review.review_date).toBe('2026-10-14')

    await page.clock.setSystemTime(afterMidnight)
    await page.goto('/calendar')
    await expect(page.getByRole('button', { name: '14 October: 1 review, 1 note added' })).toBeVisible()
    await expect(page.getByRole('button', { name: '15 October: nothing recorded' })).toBeVisible()
  })

  test('the streak line counts consecutive local days', async ({ page }) => {
    await page.clock.install({ time: evening })
    await openApp(page, '/')
    const note = makeNote({ original_text: 'Streak.', upgraded_text: 'Streak upgrade.', next_review_at: new Date(2026, 9, 20).toISOString() })
    const reviews = [12, 13, 14].map((d) =>
      makeReview(note.id, { review_date: dayKey(new Date(2026, 9, d)), created_at: new Date(2026, 9, d, 23, 30).toISOString() }),
    )
    await putRecords(page, { notes: [note], reviews })
    await expect(page.getByText('3 days of consistent study.').first()).toBeVisible()
  })
})
