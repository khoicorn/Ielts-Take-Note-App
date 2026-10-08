/**
 * Shared helpers for the end-to-end suite.
 *
 * The suite runs against the production build (vite preview), so it never imports src modules.
 * Data is seeded through the UI ("Load example notes") or written straight into IndexedDB here.
 */
import { expect as baseExpect, test as base, type Locator, type Page } from '@playwright/test'

/**
 * The suite often runs while other work keeps the CPU busy (builds, unit tests, screenshots).
 * Steps then take seconds, not milliseconds, so every test gets more time than the config's 30s,
 * and assertions wait up to 15s. A real hang still fails.
 */
export const test = base.extend<{ roomyTimeout: void }>({
  roomyTimeout: [
    async ({}, use, testInfo) => {
      testInfo.setTimeout(Math.max(testInfo.timeout, 120_000))
      await use()
    },
    { auto: true },
  ],
})
export const expect = baseExpect.configure({ timeout: 15_000 })

export const DB_NAME = 'ielts-notebook'
export const APP_ID = 'ielts-upgrade-notebook'

/* ------------------------------------------------------------------ */
/* Dates (the browser runs in the same time zone as the test runner)   */
/* ------------------------------------------------------------------ */

export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export type Mode = 'speaking' | 'writing'

export interface NoteRecord {
  id: string
  mode: Mode
  date_created: string
  topic: string
  subtopic: string
  task_type: '' | 'task1' | 'task2'
  task_genre: string
  original_text: string
  upgraded_text: string
  explanation: string
  example_sentence: string
  reusable_pattern: string
  model_paragraph: string
  note_type: string
  error_type: string
  error_pattern: string
  fix_pattern: string
  recall_prompt: string
  tags: string[]
  difficulty: 0 | 1 | 2 | 3
  is_favorite: boolean
  mastery_status: 'new' | 'learning' | 'familiar' | 'mastered'
  review_stage: number
  last_reviewed_at: string | null
  next_review_at: string | null
  times_reviewed: number
  times_seen: number
  source_paragraph_id: string | null
  is_archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ReviewRecord {
  id: string
  note_id: string
  review_date: string
  rating: 'again' | 'hard' | 'good' | 'easy'
  review_type: 'upgrade' | 'phrase_to_sentence' | 'fill_blank' | 'pattern_recall'
  previous_stage: number
  new_stage: number
  previous_interval: number
  new_interval: number
  created_at: string
}

let counter = 0
function uid(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`
}

/** A complete note row. New and due now unless the overrides say otherwise. */
export function makeNote(over: Partial<NoteRecord> = {}): NoteRecord {
  const now = new Date()
  const iso = now.toISOString()
  return {
    id: uid('e2e-note'),
    mode: 'speaking',
    date_created: dayKey(now),
    topic: 'Travel',
    subtopic: '',
    task_type: '',
    task_genre: '',
    original_text: '',
    upgraded_text: 'placeholder upgrade',
    explanation: '',
    example_sentence: '',
    reusable_pattern: '',
    model_paragraph: '',
    note_type: 'correction',
    error_type: '',
    error_pattern: '',
    fix_pattern: '',
    recall_prompt: '',
    tags: [],
    difficulty: 0,
    is_favorite: false,
    mastery_status: 'new',
    review_stage: 0,
    last_reviewed_at: null,
    next_review_at: iso,
    times_reviewed: 0,
    times_seen: 1,
    source_paragraph_id: null,
    is_archived: false,
    archived_at: null,
    created_at: iso,
    updated_at: iso,
    ...over,
  }
}

export function makeReview(noteId: string, over: Partial<ReviewRecord> = {}): ReviewRecord {
  const d = daysFromNow(-3)
  return {
    id: uid('e2e-review'),
    note_id: noteId,
    review_date: dayKey(d),
    rating: 'good',
    review_type: 'upgrade',
    previous_stage: 0,
    new_stage: 1,
    previous_interval: 0,
    new_interval: 1,
    created_at: d.toISOString(),
    ...over,
  }
}

/* ------------------------------------------------------------------ */
/* Page setup                                                          */
/* ------------------------------------------------------------------ */

/** Opens a route and waits until the app has rendered into its main landmark (or the review screen). */
export async function openApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path)
  await page.locator('main').first().waitFor()
}

/** Resolves once the app has created its IndexedDB database. */
export async function waitForDb(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async (name) => {
          const list = (await indexedDB.databases?.()) ?? []
          return list.some((d) => d.name === name)
        }, DB_NAME),
      { message: 'the app should create its IndexedDB database' },
    )
    .toBe(true)
}

/**
 * Writes rows straight into the app's IndexedDB (the database must exist: call after openApp).
 * The app's live queries do not see raw writes, so the page is reloaded afterwards.
 */
export async function putRecords(
  page: Page,
  data: { notes?: NoteRecord[]; reviews?: ReviewRecord[]; paragraphs?: Record<string, unknown>[] },
  opts: { reload?: boolean } = {},
): Promise<void> {
  await waitForDb(page)
  await page.evaluate(
    async ({ name, data }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['notes', 'reviews', 'paragraphs'], 'readwrite')
        for (const n of data.notes ?? []) tx.objectStore('notes').put(n)
        for (const r of data.reviews ?? []) tx.objectStore('reviews').put(r)
        for (const p of data.paragraphs ?? []) tx.objectStore('paragraphs').put(p)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    { name: DB_NAME, data },
  )
  if (opts.reload !== false) {
    await page.reload()
    await page.locator('main').first().waitFor()
  }
}

/** Reads every row of one store. */
export async function readStore<T = Record<string, unknown>>(page: Page, store: 'notes' | 'reviews' | 'paragraphs' | 'meta'): Promise<T[]> {
  await waitForDb(page)
  return page.evaluate(
    async ({ name, store }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const req = db.transaction(store, 'readonly').objectStore(store).getAll()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      db.close()
      return rows
    },
    { name: DB_NAME, store },
  ) as Promise<T[]>
}

/** Seeds the example notebook through the first-run button on Today. */
export async function loadExampleNotes(page: Page): Promise<void> {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Load example notes' }).click()
  await expectToast(page, 'Example notes added. Remove them in Settings.')
  await expect(page.getByRole('button', { name: 'Load example notes' })).toHaveCount(0)
}

/* ------------------------------------------------------------------ */
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */

export function toast(page: Page, text: string | RegExp): Locator {
  return page.getByRole('status').filter({ hasText: text })
}

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(toast(page, text).first()).toBeVisible()
}

export function dialog(page: Page, name: string | RegExp): Locator {
  return page.getByRole('dialog', { name })
}

/** Ctrl on Windows and Linux, Meta on macOS: the app binds "mod" to the platform key. */
export const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'

/**
 * Pastes like a browser would: a trusted-looking paste event with text/html and text/plain on the clipboard.
 * The app's TextArea converts the HTML (ChatGPT copies HTML) and inserts it at the cursor.
 */
export async function pasteInto(target: Locator, data: { html?: string; plain: string }): Promise<void> {
  await target.focus()
  await target.evaluate((el, d) => {
    const dt = new DataTransfer()
    if (d.html) dt.setData('text/html', d.html)
    dt.setData('text/plain', d.plain)
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    const notHandled = el.dispatchEvent(ev)
    // A synthetic paste has no default action. When the app did not insert the text itself, do it here.
    if (notHandled && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) {
      document.execCommand('insertText', false, d.plain)
    }
  }, data)
}
