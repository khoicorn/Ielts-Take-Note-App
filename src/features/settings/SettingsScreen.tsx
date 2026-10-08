import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import type React from 'react'
import { useId, useState } from 'react'
import { useTheme } from '@/app/theme'
import { ShortcutTable } from '@/app/ShortcutsDialog'
import { Button, ButtonLink } from '@/components/ui/Button'
import { READING_PAGE } from '@/components/ui/cn'
import { useConfirm } from '@/components/ui/Confirm'
import { Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { SegmentedControl } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/lib/db'
import { useSettings } from '@/lib/hooks'
import { deleteAllData, loadExampleData, removeExampleData, updateSettings } from '@/lib/repo'
import { ERROR_TYPES, SPEAKING_TOPICS, TASK1_TOPICS, TASK2_TOPICS } from '@/lib/taxonomy'
import type { ReviewStyle, Settings, ThemePreference } from '@/lib/types'
import { DataSection } from './DataSection'
import { LabelListEditor } from './LabelListEditor'
import { SettingRow, SettingRows } from './SettingRow'
import { count } from './settingsCopy'
import { useExampleNoteCount } from './useExampleNoteCount'

const VERSION = '0.1.0'
const SESSION_SIZES = [10, 20, 30, 50] as const
const SECTION_GAP = 'mt-14'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

const REVIEW_STYLES: { value: ReviewStyle; label: string; description: string }[] = [
  {
    value: 'mixed',
    label: 'Mixed review types',
    description: 'After two reviews, a note also comes back as fill in the blank, phrase to sentence or pattern recall.',
  },
  {
    value: 'upgrade_only',
    label: 'Always Mistake → Upgrade',
    description: 'Every card shows what you wrote or said and asks for the better version.',
  },
]

/** Quick links to the sections. They wrap on phones. */
const SECTION_LINKS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'review', label: 'Review' },
  { id: 'topics', label: 'Topics' },
  { id: 'data', label: 'Your data' },
  { id: 'shortcuts', label: 'Shortcuts' },
]

function save(patch: Partial<Settings>): Promise<Settings> {
  return updateSettings(patch)
}

/** Review style as two radio rows with a short line each (plain radios read better than a long segmented control). */
function ReviewStyleField(props: { value: ReviewStyle }): React.JSX.Element {
  const name = useId()
  return (
    <fieldset>
      <legend className="text-body text-ink">Review style</legend>
      <div className="mt-3 space-y-1">
        {REVIEW_STYLES.map((s) => {
          const id = `${name}-${s.value}`
          return (
            <label key={s.value} htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-sm py-2 max-sm:min-h-11">
              <input
                id={id}
                type="radio"
                name={name}
                value={s.value}
                checked={props.value === s.value}
                onChange={() => void save({ review_style: s.value })}
                className="mt-1 size-4 shrink-0 cursor-pointer accent-indigo"
              />
              <span className="min-w-0">
                <span className="block text-body text-ink">{s.label}</span>
                <span className="block text-small text-graphite">{s.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function NotebookSection(): React.JSX.Element {
  const toast = useToast()
  const confirm = useConfirm()
  const archived = useLiveQuery(() => db.notes.filter((n) => n.is_archived).count(), [])
  const examples = useExampleNoteCount()
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    try {
      const r = await loadExampleData()
      toast.show(r.notes ? `${count(r.notes, 'example note')} added.` : 'Example notes are already in your notebook.')
    } catch {
      toast.show('Example notes could not be added. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Remove example notes?',
      body: 'The example notes, their reviews and the example paragraphs will be removed. Your own notes stay.',
      confirmLabel: 'Remove example notes',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      const n = await removeExampleData()
      toast.show(`${count(n, 'example note')} removed.`)
    } catch {
      toast.show('Example notes could not be removed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section id="notebook" title="Notebook" className={SECTION_GAP}>
      <SettingRows>
        <SettingRow
          title="Archived notes"
          description={
            archived === undefined
              ? ' '
              : archived === 0
                ? 'No archived notes. Archived notes are hidden from review.'
                : `${count(archived, 'archived note')}. They are hidden from review.`
          }
        >
          {archived ? (
            <ButtonLink to="/notes?archived=1" icon={Archive}>
              Show archived notes
            </ButtonLink>
          ) : null}
        </SettingRow>
        <SettingRow
          title="Example notes"
          description={
            examples === undefined
              ? ' '
              : examples > 0
                ? `${count(examples, 'example note')} in your notebook. Removing them keeps your own notes.`
                : 'About 30 example notes to try the app with. They are tagged “example”.'
          }
        >
          {examples ? (
            <Button loading={busy} onClick={() => void remove()}>
              Remove example notes
            </Button>
          ) : (
            <Button loading={busy} disabled={examples === undefined} onClick={() => void load()}>
              Load example notes
            </Button>
          )}
        </SettingRow>
      </SettingRows>
    </Section>
  )
}

function DeleteSection(): React.JSX.Element {
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const ok = await confirm({
      title: 'Delete all data?',
      body: 'Every note, review and model paragraph in this browser will be deleted. This cannot be undone. Export a JSON backup first if you may want them back.',
      confirmLabel: 'Delete all data',
      tone: 'danger',
      requireText: 'DELETE',
    })
    if (!ok) return
    setBusy(true)
    try {
      await deleteAllData()
      toast.show('All data deleted.')
    } catch {
      toast.show('The data could not be deleted. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section id="delete" title="Start over" className={SECTION_GAP}>
      <SettingRows>
        <SettingRow title="Delete all data" description="Deletes every note, review and model paragraph in this browser.">
          <Button variant="danger" icon={Trash2} loading={busy} onClick={() => void run()}>
            Delete all data
          </Button>
        </SettingRow>
      </SettingRows>
    </Section>
  )
}

/** Settings (plan C7, design §6). One reading column; sections separated by hairlines, each with an anchor id. */
export function SettingsScreen(): React.JSX.Element {
  const settings = useSettings()
  const { preference, setPreference } = useTheme()

  return (
    <div className={READING_PAGE}>
      <PageHeader title="Settings">
        <nav aria-label="Settings sections">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {SECTION_LINKS.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  className="inline-flex min-h-8 items-center rounded-xs text-small text-graphite hover:text-ink max-sm:min-h-11"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>

      <Section id="appearance" title="Appearance">
        <SettingRows>
          <SettingRow title="Theme" titleId="theme-title" description="System follows your device setting.">
            <SegmentedControl aria-label="Theme" value={preference} onChange={setPreference} options={THEME_OPTIONS} />
          </SettingRow>
        </SettingRows>
      </Section>

      <Section id="review" title="Review" className={SECTION_GAP}>
        <SettingRows>
          <SettingRow title="Session size" htmlFor="session-size" description="How many notes one review session shows.">
            <Select
              id="session-size"
              value={String(settings.session_size)}
              onChange={(e) => void save({ session_size: Number(e.target.value) })}
              options={SESSION_SIZES.map((n) => ({ value: String(n), label: `${n} notes` }))}
              className="w-36"
            />
          </SettingRow>
          <div className="border-b border-line py-5 last:border-b-0">
            <ReviewStyleField value={settings.review_style} />
          </div>
        </SettingRows>
      </Section>

      <Section id="topics" title="Topics and error types" className={SECTION_GAP}>
        <p className="mt-4 text-body text-graphite">
          Your own labels appear in Quick Add and in filters. Built-in labels stay.
        </p>
        <LabelListEditor
          id="speaking-topics"
          title="Speaking topics"
          addLabel="Add a Speaking topic"
          placeholder="e.g. Nha Trang trip"
          defaults={SPEAKING_TOPICS}
          custom={settings.custom_speaking_topics}
          onChange={(v) => save({ custom_speaking_topics: v })}
        />
        <LabelListEditor
          id="task1-topics"
          title="Task 1 language topics"
          addLabel="Add a Task 1 language topic"
          placeholder="e.g. Approximation"
          defaults={TASK1_TOPICS}
          custom={settings.custom_task1_topics}
          onChange={(v) => save({ custom_task1_topics: v })}
        />
        <LabelListEditor
          id="task2-topics"
          title="Task 2 language categories"
          addLabel="Add a Task 2 language category"
          placeholder="e.g. Conceding a point"
          defaults={TASK2_TOPICS}
          custom={settings.custom_task2_topics}
          onChange={(v) => save({ custom_task2_topics: v })}
        />
        <LabelListEditor
          id="error-types"
          title="Error types"
          addLabel="Add an error type"
          placeholder="e.g. Register"
          defaults={ERROR_TYPES}
          custom={settings.custom_error_types}
          onChange={(v) => save({ custom_error_types: v })}
        />
      </Section>

      <DataSection className={SECTION_GAP} />
      <NotebookSection />
      <DeleteSection />

      <Section id="shortcuts" title="Keyboard shortcuts" className={SECTION_GAP}>
        <ShortcutTable className="mt-5" />
      </Section>

      <Section id="about" title="About" className={SECTION_GAP}>
        <p className="mt-4 text-body text-graphite">
          IELTS Upgrade Notebook · version {VERSION} · Works offline. No account. No tracking.
        </p>
      </Section>
    </div>
  )
}
