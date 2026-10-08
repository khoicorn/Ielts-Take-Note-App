/**
 * Theme (design §3.4, §10, §12): the choice in Settings applies at once and persists after a reload,
 * also when the browser's localStorage copy is gone (the notebook keeps it too).
 */
import type { Page } from '@playwright/test'
import { expect, openApp, test } from './helpers/app'

const html = (page: Page) => page.locator('html')

async function chooseTheme(page: Page, label: 'System' | 'Light' | 'Dark'): Promise<void> {
  await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: label }).click()
}

test('Dark applies at once and persists after a reload; Light switches back', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openApp(page, '/settings')
  await expect(html(page)).toHaveAttribute('data-theme', 'light')

  await chooseTheme(page, 'Dark')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')

  await page.reload()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
  // The page background follows the theme (no light flash left behind).
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).not.toBe('rgb(245, 241, 232)')

  await chooseTheme(page, 'Light')
  await page.reload()
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
})

test('System follows the device setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await openApp(page, '/settings')
  await chooseTheme(page, 'System')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
})

test('the theme comes back from the notebook when localStorage was cleared', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openApp(page, '/settings')
  await chooseTheme(page, 'Dark')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  // Give the settings write a moment to land in IndexedDB, then drop the fast copy.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string | undefined>((resolve) => {
            const req = indexedDB.open('ielts-notebook')
            req.onsuccess = () => {
              const get = req.result.transaction('meta', 'readonly').objectStore('meta').get('settings')
              get.onsuccess = () => {
                resolve((get.result?.value as { theme?: string } | undefined)?.theme)
                req.result.close()
              }
              get.onerror = () => resolve(undefined)
            }
            req.onerror = () => resolve(undefined)
          }),
      ),
    )
    .toBe('dark')
  await page.evaluate(() => localStorage.removeItem('ielts-theme'))
  await page.reload()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
})
