/**
 * Deep links and offline use (design §1, §6): every route loads straight from its URL and after a reload,
 * and once the service worker is in control the app opens with no network.
 */
import { expect, makeNote, openApp, putRecords, test } from './helpers/app'

const NOTE = makeNote({ original_text: 'We enjoyed the scenario.', upgraded_text: 'The scenery was beautiful.' })

const ROUTES: { path: string; heading: RegExp | string }[] = [
  { path: '/speaking', heading: 'Speaking' },
  { path: '/writing?tab=task2', heading: 'Writing' },
  { path: '/mistakes', heading: 'My Mistakes' },
  { path: '/must-remember', heading: 'Must Remember' },
  { path: '/notes?archived=1', heading: 'Archived notes' },
  { path: '/calendar', heading: 'Calendar' },
  { path: '/settings', heading: 'Settings' },
]

test('every route loads from its URL and after a reload', async ({ page }) => {
  await openApp(page, '/')
  for (const r of ROUTES) {
    await page.goto(r.path)
    await expect(page.getByRole('heading', { level: 1, name: r.heading })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: r.heading })).toBeVisible()
  }
})

test('an unknown URL shows the not-found page inside the app', async ({ page }) => {
  await openApp(page, '/no-such-page')
  await expect(page.getByRole('navigation', { name: 'Main' }).first()).toBeVisible()
  await expect(page.locator('main')).not.toBeEmpty()
})

test('with the service worker in control, Today and a note page open offline', async ({ page, context }) => {
  await openApp(page, '/')
  await putRecords(page, { notes: [NOTE] }, { reload: false })
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The first visit installs the worker; the next load is controlled by it.
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByText('Your notebook has 1 item waiting for review.')).toBeVisible()
    await page.goto(`/notes/${NOTE.id}`)
    await expect(page.getByText('The scenery was beautiful.').first()).toBeVisible()
    await page.goto('/review')
    await expect(page.getByTestId('review-prompt')).toContainText('We enjoyed the scenario.')
  } finally {
    await context.setOffline(false)
  }
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the top-bar Menu reaches every page; the bottom bar reaches Review and back', async ({ page }) => {
    await openApp(page, '/')
    await putRecords(page, { notes: [NOTE] }, { reload: false })
    for (const [label, url] of [
      ['My Mistakes', /\/mistakes$/],
      ['Must Remember', /\/must-remember$/],
      ['All Notes', /\/notes$/],
      ['Calendar', /\/calendar$/],
      ['Settings', /\/settings$/],
    ] as const) {
      const pages = page.getByRole('navigation', { name: 'All pages' })
      // The last sheet fades out after a page change; wait until it is gone so the tap hits the new one.
      await expect(pages).toHaveCount(0)
      await page.getByRole('button', { name: 'Menu' }).tap()
      await expect(pages).toBeVisible()
      await pages.getByRole('link', { name: new RegExp(`^${label === 'My Mistakes' ? '(My )?Mistakes' : label}`) }).tap()
      await expect(page).toHaveURL(url)
    }
    await page.getByRole('link', { name: /^Review/ }).last().tap()
    await expect(page).toHaveURL(/\/review$/)
    await expect(page.getByTestId('review-prompt')).toBeVisible()
    await page.getByRole('button', { name: 'End review' }).tap()
    await expect(page).toHaveURL(/\/$/)
  })
})
