import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { db, resetDb } from '@/lib/db'
import { downloadText } from '@/lib/exporters'
import { makeNote } from '@/lib/fixtures'
import { SettingsScreen } from './SettingsScreen'

// jsdom has no URL.createObjectURL, so the file download itself is replaced.
vi.mock('@/lib/exporters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/exporters')>()
  return { ...actual, downloadText: vi.fn() }
})

function renderSettings() {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/settings']}>
        <ToastProvider>
          <ConfirmProvider>
            <SettingsScreen />
          </ConfirmProvider>
        </ToastProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('SettingsScreen', () => {
  beforeEach(async () => {
    await resetDb()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.mocked(downloadText).mockClear()
  })

  it('ST1 the theme radio sets the theme', async () => {
    const user = userEvent.setup({ delay: null })
    renderSettings()
    const group = screen.getByRole('radiogroup', { name: 'Theme' })
    expect(within(group).getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')

    await user.click(within(group).getByRole('radio', { name: 'Dark' }))
    expect(within(group).getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('ielts-theme')).toBe('dark')
    await waitFor(async () => expect((await db.meta.get('settings'))?.value).toMatchObject({ theme: 'dark' }))
  })

  it('ST2 Export JSON calls downloadText with a .json name and records the export', async () => {
    await db.notes.add(makeNote({ upgraded_text: 'The scenery was beautiful.' }))
    const user = userEvent.setup({ delay: null })
    renderSettings()
    expect(await screen.findByText('No backup yet.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Export JSON backup' }))
    await waitFor(() => expect(downloadText).toHaveBeenCalledTimes(1))
    const [name, content, mime] = vi.mocked(downloadText).mock.calls[0]
    expect(name).toMatch(/^ielts-notebook-\d{4}-\d{2}-\d{2}\.json$/)
    expect(mime).toBe('application/json')
    const bundle = JSON.parse(content)
    expect(bundle.app).toBe('ielts-upgrade-notebook')
    expect(bundle.notes).toHaveLength(1)

    await waitFor(async () => expect(typeof (await db.meta.get('last_export_at'))?.value).toBe('string'))
    expect(await screen.findByText('Last backup today.')).toBeInTheDocument()
    expect(await screen.findByText('Backup exported.')).toBeInTheDocument()
  })

  it('ST2b CSV and Markdown exports do not count as a backup', async () => {
    await db.notes.add(makeNote({ upgraded_text: 'The scenery was beautiful.' }))
    const user = userEvent.setup({ delay: null })
    renderSettings()
    await user.click(screen.getByRole('button', { name: 'Export CSV' }))
    await user.click(screen.getByRole('button', { name: 'Export Markdown' }))
    await waitFor(() => expect(downloadText).toHaveBeenCalledTimes(2))
    expect(vi.mocked(downloadText).mock.calls[0][0]).toMatch(/\.csv$/)
    expect(vi.mocked(downloadText).mock.calls[1][0]).toMatch(/\.md$/)
    expect(await db.meta.get('last_export_at')).toBeUndefined()
  })

  it('ST3 importing an invalid file shows the error', async () => {
    const user = userEvent.setup({ delay: null })
    renderSettings()
    const file = new File(['not json at all'], 'notes.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Backup file'), file)
    expect(await screen.findByText('This file is not a JSON backup.')).toBeInTheDocument()
  })

  it('ST3b importing a valid backup asks first, then reports what changed', async () => {
    const note = makeNote({ upgraded_text: 'I usually go to bed late.' })
    const backup = {
      app: 'ielts-upgrade-notebook',
      version: 1,
      exported_at: new Date().toISOString(),
      notes: [note],
      reviews: [],
      paragraphs: [],
    }
    const user = userEvent.setup({ delay: null })
    renderSettings()
    await user.upload(screen.getByLabelText('Backup file'), new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }))

    const dialog = await screen.findByRole('dialog', { name: 'Import backup' })
    expect(dialog).toHaveTextContent('Import 1 note? Existing notes are kept; newer copies win.')
    await user.click(within(dialog).getByRole('button', { name: 'Import' }))
    await waitFor(async () => expect(await db.notes.count()).toBe(1))
    expect(await screen.findByText('Import done: 1 new note.')).toBeInTheDocument()
  })

  it('ST4 Delete all data requires typing DELETE', async () => {
    await db.notes.add(makeNote({ upgraded_text: 'The scenery was beautiful.' }))
    const user = userEvent.setup({ delay: null })
    renderSettings()
    await user.click(screen.getByRole('button', { name: 'Delete all data' }))

    const dialog = await screen.findByRole('dialog', { name: 'Delete all data?' })
    const confirm = within(dialog).getByRole('button', { name: 'Delete all data' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Type DELETE to confirm.'), 'delete')
    expect(confirm).toBeDisabled()
    await user.clear(within(dialog).getByLabelText('Type DELETE to confirm.'))
    await user.type(within(dialog).getByLabelText('Type DELETE to confirm.'), 'DELETE')
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    await waitFor(async () => expect(await db.notes.count()).toBe(0))
    expect(await screen.findByText('All data deleted.')).toBeInTheDocument()
  })

  it('ST5 a custom topic can be added and removed; defaults cannot be removed', async () => {
    const user = userEvent.setup({ delay: null })
    renderSettings()
    const input = screen.getByLabelText('Add a Speaking topic')
    await user.type(input, 'Nha Trang trip{Enter}')
    await waitFor(async () => expect((await db.meta.get('settings'))?.value).toMatchObject({ custom_speaking_topics: ['Nha Trang trip'] }))
    expect(screen.queryByRole('button', { name: 'Remove Travel' })).toBeNull()

    await user.type(input, 'travel{Enter}')
    expect(await screen.findByText('“travel” is already in the list.')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Remove Nha Trang trip' }))
    await waitFor(async () => expect((await db.meta.get('settings'))?.value).toMatchObject({ custom_speaking_topics: [] }))
  })
})
