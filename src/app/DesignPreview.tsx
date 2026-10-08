import {
  Archive,
  ArrowRight,
  Copy,
  Ellipsis,
  Filter,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash,
  Undo2,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { todayKey } from '@/lib/dates'
import type { MasteryStatus, Note } from '@/lib/types'
import { MASTERY_ORDER, SPEAKING_TOPICS } from '@/lib/taxonomy'
import { Button, ButtonLink } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { Combobox } from '@/components/ui/Combobox'
import { useConfirm } from '@/components/ui/Confirm'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FavoriteStar } from '@/components/ui/FavoriteStar'
import { Checkbox, Field, Select, Switch, TextArea, TextInput } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { BrandMark, ConstellationIcon, CrescentIcon, ICON_STROKE, QuillIcon, SparkIcon } from '@/components/ui/icons'
import { Kbd, KeyHint, modLabel } from '@/components/ui/Kbd'
import { MasteryMark } from '@/components/ui/MasteryMark'
import { Divider, Ornament } from '@/components/ui/Ornament'
import { PageHeader } from '@/components/ui/PageHeader'
import { Menu, Popover } from '@/components/ui/Popover'
import { Section } from '@/components/ui/Section'
import { ModeTabs, SegmentedControl, UnderlineTabs } from '@/components/ui/Tabs'
import { Tag } from '@/components/ui/Tag'
import { TagInput } from '@/components/ui/TagInput'
import { useToast } from '@/components/ui/Toast'
import { Tooltip } from '@/components/ui/Tooltip'
import { ModeMark } from '@/components/notes/ModeMark'
import { NoteMetaLine } from '@/components/notes/NoteMetaLine'
import { NotePair } from '@/components/notes/NotePair'
import { NoteRow } from '@/components/notes/NoteRow'
import { NAV_ITEMS } from './nav'
import { useQuickAdd, useSearch, useShortcutsHelp } from './overlays'
import { useTheme } from './theme'

/* ---------- inline sample notes (no database) ---------- */

const NOW = new Date()
const iso = (daysFromNow: number) => {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function sample(id: string, patch: Partial<Note>): Note {
  return {
    id,
    mode: 'speaking',
    date_created: todayKey(NOW),
    topic: '',
    subtopic: '',
    task_type: '',
    task_genre: '',
    original_text: '',
    upgraded_text: '',
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
    next_review_at: iso(0),
    times_reviewed: 0,
    times_seen: 1,
    source_paragraph_id: null,
    is_archived: false,
    archived_at: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...patch,
  }
}

const LONG_URL = 'https://chatgpt.com/share/6702f1c9-8d4e-800b-a3a5-' + 'f2c94e1b7a0d3e6c'.repeat(5)

export const SAMPLE_NOTES: Note[] = [
  sample('d-travel', {
    topic: 'Travel',
    subtopic: 'Nha Trang trip',
    original_text: 'We enjoyed the scenario.',
    upgraded_text: 'The scenery was beautiful.',
    explanation: '"Scenery" refers to the landscape or views. "Scenario" refers to a situation.',
    example_sentence: 'The **scenery** along the coast was beautiful.',
    error_type: 'Word Choice',
    mastery_status: 'learning',
    review_stage: 1,
    is_favorite: true,
  }),
  sample('d-food', {
    topic: 'Food',
    original_text: "I don't customize other factors.",
    upgraded_text: "I'm pretty flexible about the rest.",
    example_sentence: "I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.",
    note_type: 'useful_expression',
    mastery_status: 'familiar',
    review_stage: 3,
    next_review_at: iso(4),
  }),
  sample('d-zoo', {
    mode: 'writing',
    task_type: 'task1',
    task_genre: 'Line Graph',
    topic: 'Increase',
    original_text: 'The number of visitors of the City Zoo increased steadily.',
    upgraded_text: 'The number of visitors to the City Zoo increased steadily.',
    explanation: 'Use "visitors to + place" rather than "visitors of + place".',
    reusable_pattern: 'The number of visitors to ___ increased steadily from ___ to ___.',
    example_sentence: 'The number of visitors to the City Zoo increased steadily from 35,000 to 68,000.',
    error_type: 'Prepositions',
    error_pattern: 'visitors of + place',
    fix_pattern: 'visitors to + place',
    times_seen: 4,
  }),
  sample('d-stable', {
    mode: 'writing',
    task_type: 'task1',
    topic: 'Stability',
    upgraded_text: 'remained relatively stable',
    example_sentence: 'Visitor numbers at the Botanical Garden remained relatively stable.',
    note_type: 'collocation',
    mastery_status: 'mastered',
    review_stage: 5,
    is_favorite: true,
    next_review_at: iso(30),
  }),
  sample('d-only', {
    mode: 'writing',
    upgraded_text: 'experienced a steady decline',
    note_type: 'collocation',
    next_review_at: null,
  }),
  sample('d-long', {
    topic: 'Technology',
    original_text: `I read it in this link ${LONG_URL} and it say many thing about the AI is more better for study.`,
    upgraded_text:
      'I came across an article that makes a convincing case for using AI tools as a study aid, although it also warns that they work best when you check every suggestion yourself and keep a record of the corrections you receive, so that the same mistakes do not keep coming back in your speaking.',
    example_sentence: `Source: ${LONG_URL}`,
    mastery_status: 'learning',
    review_stage: 2,
    next_review_at: iso(1),
  }),
]

/* ---------- layout helpers ---------- */

function Row(props: { label: string; children: React.ReactNode; className?: string; id?: string }): React.JSX.Element {
  return (
    <div id={props.id} className="grid scroll-mt-24 gap-3 border-b border-line py-5 sm:grid-cols-[148px_1fr] sm:gap-6">
      <p className="pt-1.5 text-meta text-graphite">{props.label}</p>
      <div className={cn('flex min-w-0 flex-wrap items-center gap-3', props.className)}>{props.children}</div>
    </div>
  )
}

function Block(props: { id: string; title: string; children: React.ReactNode; note?: string }): React.JSX.Element {
  return (
    <Section id={props.id} title={props.title} className="mt-16 first:mt-0">
      {props.note ? <p className="mt-3 mb-1 text-small text-graphite">{props.note}</p> : null}
      {props.children}
    </Section>
  )
}

const TOKENS: { name: string; role: string; swatch: string }[] = [
  { name: 'page', role: 'Parchment. Page background', swatch: 'bg-page' },
  { name: 'paper', role: 'Paper. Writing areas, dialogs', swatch: 'bg-paper' },
  { name: 'stone', role: 'Stone. Hover, selected', swatch: 'bg-stone' },
  { name: 'ink', role: 'Primary text', swatch: 'bg-ink' },
  { name: 'graphite', role: 'Metadata, labels', swatch: 'bg-graphite' },
  { name: 'indigo', role: 'Active nav, primary action', swatch: 'bg-indigo' },
  { name: 'plum', role: 'Speaking accent', swatch: 'bg-plum' },
  { name: 'sage', role: 'Writing accent (icons only)', swatch: 'bg-sage' },
  { name: 'gold', role: 'Ornaments, favorites (never text)', swatch: 'bg-gold' },
  { name: 'crimson', role: 'The mistake', swatch: 'bg-crimson' },
  { name: 'upgrade', role: 'Deep sage. The better English', swatch: 'bg-upgrade' },
  { name: 'line', role: 'Hairlines', swatch: 'bg-line' },
]

const TYPE: { token: string; className: string; sample: string }[] = [
  { token: 'title · serif 32', className: 'font-serif text-title', sample: 'Wednesday, 7 October' },
  { token: 'recall · 28', className: 'text-recall', sample: 'We enjoyed the scenario.' },
  { token: 'section · serif 21', className: 'font-serif text-section', sample: 'Recent notes' },
  { token: 'note · 18', className: 'text-note', sample: 'The scenery was beautiful.' },
  { token: 'body-lg · 16', className: 'text-body-lg', sample: 'The scenery along the coast was beautiful.' },
  { token: 'body · 15', className: 'text-body', sample: 'Your notebook has 12 items waiting for review.' },
  { token: 'small · 13', className: 'text-small text-graphite', sample: 'Travel · Correction · Due today' },
  { token: 'meta · 12', className: 'text-meta text-graphite', sample: '10 days of consistent study.' },
]

/* ---------- the page ---------- */

export function DesignPreview(): React.JSX.Element {
  const { preference, setPreference } = useTheme()
  const toast = useToast()
  const confirm = useConfirm()
  const quickAdd = useQuickAdd()
  const search = useSearch()
  const shortcuts = useShortcutsHelp()
  const [params] = useSearchParams()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [text, setText] = useState('The scenery was beautiful.')
  const [area, setArea] = useState('**Why:** "Scenery" refers to the landscape.\n\nPaste ChatGPT text here. Bold, lists and paragraphs are kept.')
  const [empty, setEmpty] = useState('')
  const [topic, setTopic] = useState('Travel')
  const [select, setSelect] = useState('')
  const [tags, setTags] = useState(['nha-trang', 'scenery'])
  const [check, setCheck] = useState(true)
  const [check2, setCheck2] = useState(false)
  const [sw, setSw] = useState(true)
  const [sw2, setSw2] = useState(false)
  const [tab, setTab] = useState('task1')
  const [view, setView] = useState<'compact' | 'reading'>('compact')
  const [fav, setFav] = useState(false)
  const [fav2, setFav2] = useState(true)
  const menuTrigger = useRef<HTMLButtonElement>(null)

  // ?open=dialog|confirm|menu|popover|toast|quickadd|search|shortcuts opens one overlay (for screenshots).
  useEffect(() => {
    const open = params.get('open')
    if (!open) return
    const t = setTimeout(() => {
      if (open === 'dialog') setDialogOpen(true)
      if (open === 'popover') setPopoverOpen(true)
      if (open === 'menu') {
        menuTrigger.current?.scrollIntoView({ block: 'center' })
        menuTrigger.current?.click()
      }
      if (open === 'popover') document.getElementById('d-popover-row')?.scrollIntoView({ block: 'start' })
      if (open === 'toast') toast.show('Note saved.', { action: { label: 'View', onClick: () => {} }, duration: 60_000 })
      if (open === 'confirm')
        void confirm({
          title: 'Delete all data?',
          body: 'Every note, review and paragraph in this browser will be deleted. This cannot be undone.',
          confirmLabel: 'Delete everything',
          tone: 'danger',
          requireText: 'DELETE',
        })
      if (open === 'quickadd') quickAdd.open()
      if (open === 'search') search.open()
      if (open === 'shortcuts') shortcuts.open()
    }, 300)
    return () => clearTimeout(t)
    // Run once per URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow="Design system"
        title="Upgrade Notebook"
        description="Every component in every state. This page is not in the navigation."
        actions={
          <SegmentedControl
            aria-label="Theme"
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: 'System', icon: Monitor },
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
            ]}
          />
        }
      />

      {/* Notes come first: they are the hero of the product. */}
      <Block id="notes" title="Notes" note="Brief §18. The mistake is smaller and crimson; the upgrade is larger and stands out more.">
        <Row label="Detail · speaking">
          <div className="w-full max-w-[680px] py-2">
            <p className="mb-6 flex items-center gap-2 text-small text-graphite">
              <ModeMark mode="speaking" />
              <span aria-hidden="true">·</span>
              <span>Travel</span>
            </p>
            <NotePair note={SAMPLE_NOTES[0]} size="detail" />
            <Ornament className="my-8" />
            <p className="text-meta font-medium tracking-[0.08em] text-graphite uppercase">Why</p>
            <p className="mt-2 text-body-lg text-ink">{SAMPLE_NOTES[0].explanation}</p>
          </div>
        </Row>
        <Row label="Detail · writing">
          <div className="w-full max-w-[680px] py-2">
            <NotePair note={SAMPLE_NOTES[2]} size="detail" />
          </div>
        </Row>
        <Row label="Detail · upgrade only">
          <div className="w-full max-w-[680px] py-2">
            <NotePair note={SAMPLE_NOTES[4]} size="detail" />
          </div>
        </Row>
        <Row label="Reading">
          <div className="grid w-full gap-6">
            <NotePair note={SAMPLE_NOTES[0]} size="reading" />
            <NotePair note={SAMPLE_NOTES[3]} size="reading" />
          </div>
        </Row>
        <Row label="Compact">
          <div className="grid w-full max-w-[520px] gap-4">
            <NotePair note={SAMPLE_NOTES[2]} size="compact" />
            <NotePair note={SAMPLE_NOTES[4]} size="compact" />
          </div>
        </Row>
        <Row label="Long text, long URL">
          <div className="w-full min-w-0">
            <NotePair note={SAMPLE_NOTES[5]} size="reading" />
          </div>
        </Row>
        <Row label="Meta line">
          <div className="grid gap-2">
            <NoteMetaLine note={SAMPLE_NOTES[0]} now={NOW} />
            <NoteMetaLine note={SAMPLE_NOTES[2]} now={NOW} parts={['mode', 'topic', 'type', 'due', 'mastery']} />
            <NoteMetaLine note={SAMPLE_NOTES[4]} now={NOW} parts={['mode', 'topic', 'type', 'due']} />
          </div>
        </Row>
      </Block>

      <Block id="rows" title="Note rows" note="Hover a row. Tab to see the focus ring.">
        <div className="mt-4 mb-3 flex items-center justify-between gap-4">
          <p className="text-small text-graphite">{SAMPLE_NOTES.length} notes</p>
          <SegmentedControl
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'reading', label: 'Reading' },
            ]}
          />
        </div>
        <div className="border-t border-line">
          {SAMPLE_NOTES.slice(0, 5).map((n) => (
            <NoteRow key={n.id} note={n} view={view} to="/design" highlight={view === 'reading' ? 'scenery' : undefined} />
          ))}
          <NoteRow
            note={{ ...SAMPLE_NOTES[1], is_archived: true }}
            view={view}
            to="/design"
            trailing={
              <Button size="sm" variant="ghost" icon={Undo2}>
                Restore
              </Button>
            }
          />
        </div>
      </Block>

      <Block id="type" title="Type">
        {TYPE.map((t) => (
          <Row key={t.token} label={t.token}>
            <p className={cn(t.className, !t.className.includes('graphite') && 'text-ink')}>{t.sample}</p>
          </Row>
        ))}
        <Row label="Eyebrow · italic serif">
          <p className="font-serif text-body-lg text-plum italic">Error Ledger</p>
          <p className="font-serif text-body-lg text-graphite italic">Essential Notes</p>
        </Row>
      </Block>

      <Block id="color" title="Color" note="70% neutral surfaces, 20% type and lines, 10% accent (brief §9).">
        <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
          {TOKENS.map((t) => (
            <div key={t.name} className="flex items-center gap-4 border-b border-line py-3">
              <span className={cn('size-8 shrink-0 rounded-xs border border-line', t.swatch)} />
              <span className="min-w-0">
                <span className="block text-small text-ink">{t.name}</span>
                <span className="block truncate text-meta text-graphite">{t.role}</span>
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block id="buttons" title="Buttons">
        <Row label="Primary">
          <Button variant="primary" size="lg" iconRight={ArrowRight}>
            Begin Review
          </Button>
          <Button variant="primary" icon={Plus} kbd="N">
            Add first note
          </Button>
          <Button variant="primary" size="sm">
            Save
          </Button>
          <Button variant="primary" loading>
            Saving
          </Button>
          <Button variant="primary" disabled>
            Save
          </Button>
        </Row>
        <Row label="Secondary">
          <Button size="lg">Review more</Button>
          <Button icon={Pencil} kbd="E">
            Edit
          </Button>
          <Button size="sm" icon={Filter}>
            Filter
          </Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row label="Ghost">
          <Button variant="ghost">Cancel</Button>
          <Button variant="ghost" icon={Plus}>
            Load example notes
          </Button>
          <Button variant="ghost" size="sm" iconRight={ArrowRight}>
            All notes
          </Button>
        </Row>
        <Row label="Danger">
          <Button variant="danger" icon={Trash}>
            Delete note
          </Button>
          <Button variant="danger" size="sm">
            Delete all data
          </Button>
        </Row>
        <Row label="Link">
          <ButtonLink to="/" variant="secondary">
            Back to Today
          </ButtonLink>
          <ButtonLink to="/notes" variant="ghost" iconRight={ArrowRight}>
            All notes
          </ButtonLink>
        </Row>
        <Row label="Icon buttons">
          <IconButton icon={Search} label="Search" tooltip />
          <IconButton icon={Pencil} label="Edit" tooltip />
          <IconButton icon={Archive} label="Archive" size="sm" tooltip />
          <IconButton icon={Ellipsis} label="More" active />
          <IconButton icon={Trash} label="Delete" disabled />
        </Row>
      </Block>

      <Block id="fields" title="Fields">
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field label="Native Upgrade" htmlFor="d-upgrade">
            <TextInput id="d-upgrade" value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Field label="What I Said" htmlFor="d-said" optional>
            <TextInput id="d-said" value={empty} onChange={(e) => setEmpty(e.target.value)} placeholder="We enjoyed the scenario." />
          </Field>
          <Field label="Band 7+ Upgrade" htmlFor="d-error" error="Add the better version first.">
            <TextInput id="d-error" value="" onChange={() => {}} placeholder="The number of visitors to the City Zoo increased steadily." />
          </Field>
          <Field label="Reusable pattern" htmlFor="d-pattern" hint="Use ___ for slots">
            <TextInput id="d-pattern" defaultValue="The number of visitors to ___ increased steadily from ___ to ___." />
          </Field>
          <Field label="Topic" htmlFor="d-topic">
            <Combobox id="d-topic" value={topic} onChange={setTopic} options={SPEAKING_TOPICS} allowCreate placeholder="Choose or type a topic" />
          </Field>
          <Field label="Error type" htmlFor="d-select">
            <Select
              id="d-select"
              value={select}
              onChange={(e) => setSelect(e.target.value)}
              placeholder="None"
              options={['Prepositions', 'Articles', 'Tenses', 'Word Forms', 'Collocations']}
            />
          </Field>
          <Field label="Tags" htmlFor="d-tags" hint="Enter or comma adds a tag.">
            <TagInput id="d-tags" value={tags} onChange={setTags} suggestions={['travel', 'trends', 'task-1', 'speaking-part-2']} placeholder="Add a tag" />
          </Field>
          <Field label="Disabled" htmlFor="d-disabled">
            <TextInput id="d-disabled" disabled value="Not editable" onChange={() => {}} />
          </Field>
          <Field label="Why" htmlFor="d-area" hint={`Paste keeps bold and lists. ${modLabel()} B for bold.`} className="sm:col-span-2">
            <TextArea id="d-area" value={area} onValueChange={setArea} minRows={3} />
          </Field>
        </div>
        <Row label="Checkbox and switch">
          <Checkbox checked={check} onChange={setCheck} label="Must remember" />
          <Checkbox checked={check2} onChange={setCheck2} label="Due now" />
          <Switch checked={sw} onChange={setSw} label="Mixed review types" />
          <Switch checked={sw2} onChange={setSw2} label="Start tomorrow" />
        </Row>
      </Block>

      <Block id="tabs" title="Tabs">
        <Row label="Mode tabs">
          <ModeTabs value="speaking" className="w-full" />
        </Row>
        <Row label="Underline tabs">
          <UnderlineTabs
            aria-label="Writing task"
            value={tab}
            onChange={setTab}
            className="w-full"
            items={[
              { value: 'task1', label: 'Academic Task 1', count: 24 },
              { value: 'task2', label: 'Task 2', count: 9 },
              { value: 'paragraphs', label: 'Model Paragraphs', count: 2 },
            ]}
          />
        </Row>
        <Row label="Segmented">
          <SegmentedControl
            aria-label="Review start"
            value="today"
            onChange={() => {}}
            options={[
              { value: 'today', label: 'Start today' },
              { value: 'tomorrow', label: 'Start tomorrow' },
              { value: 'none', label: 'Do not review' },
            ]}
          />
        </Row>
      </Block>

      <Block id="marks" title="Marks and tags">
        <Row label="Mastery">
          {MASTERY_ORDER.map((m: MasteryStatus) => (
            <MasteryMark key={m} status={m} />
          ))}
        </Row>
        <Row label="Mastery, symbol only">
          {MASTERY_ORDER.map((m: MasteryStatus) => (
            <MasteryMark key={m} status={m} showLabel={false} />
          ))}
        </Row>
        <Row label="Must remember">
          <FavoriteStar active={fav} onToggle={() => setFav(!fav)} />
          <FavoriteStar active={fav2} onToggle={() => setFav2(!fav2)} />
          <span className="inline-flex items-center gap-2 text-small text-graphite">
            Static <FavoriteStar active />
          </span>
        </Row>
        <Row label="Mode">
          <ModeMark mode="speaking" />
          <ModeMark mode="writing" />
        </Row>
        <Row label="Tags">
          <Tag>travel</Tag>
          <Tag tone="plum">Speaking</Tag>
          <Tag tone="sage">Writing</Tag>
          <Tag tone="indigo">Due</Tag>
          <Tag tone="gold">✦ Frequent</Tag>
          <Tag onRemove={() => {}}>Prepositions</Tag>
          <Tag tone="indigo" onRemove={() => {}}>
            Mastery: Learning
          </Tag>
        </Row>
        <Row label="Keys">
          <Kbd>N</Kbd>
          <KeyHint keys={`${modLabel()} K`} />
          <KeyHint keys={`${modLabel()} Enter`} />
          <KeyHint keys="G T" />
          <KeyHint keys="1 2 3 4" />
        </Row>
        <Row label="Ornament, divider">
          <div className="w-full">
            <Ornament />
            <Ornament variant="constellation" className="mt-6" />
            <Ornament variant="moon" className="mt-6" />
            <Divider className="mt-6" />
          </div>
        </Row>
        <Row label="Symbols">
          <span className="flex items-center gap-4 text-graphite">
            <BrandMark className="size-6 text-indigo" />
            <SparkIcon className="size-5" />
            <SparkIcon className="size-5 fill-current text-gold" />
            <CrescentIcon className="size-5" />
            <QuillIcon className="size-5" />
            <ConstellationIcon className="size-5" />
          </span>
          <span className="flex items-center gap-4 text-graphite">
            {NAV_ITEMS.map((n) => (
              <n.icon key={n.key} className="size-5" strokeWidth={ICON_STROKE} aria-hidden="true" />
            ))}
          </span>
        </Row>
      </Block>

      <Block id="overlays" title="Overlays" note="Dialogs, menus and toasts are the only surfaces with a shadow.">
        <Row label="Dialog">
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button
            variant="danger"
            onClick={() =>
              void confirm({
                title: 'Delete this note?',
                body: 'Its review history will be deleted too. This cannot be undone.',
                confirmLabel: 'Delete note',
                tone: 'danger',
              })
            }
          >
            Confirm (danger)
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              void confirm({
                title: 'Delete all data?',
                body: 'Every note, review and paragraph in this browser will be deleted.',
                confirmLabel: 'Delete everything',
                tone: 'danger',
                requireText: 'DELETE',
              })
            }
          >
            Typed confirm
          </Button>
        </Row>
        <Row label="Menu and popover" id="d-popover-row">
          <Menu
            aria-label="Note actions"
            trigger={<IconButton ref={menuTrigger} icon={Ellipsis} label="Note actions" />}
            items={[
              { label: 'Edit', icon: Pencil, onSelect: () => {}, shortcut: 'E' },
              { label: 'Duplicate', icon: Copy, onSelect: () => toast.show('Note duplicated.') },
              { label: 'Archive', icon: Archive, onSelect: () => toast.show('Note archived.', { action: { label: 'Undo', onClick: () => {} } }) },
              'separator',
              { label: 'Delete', icon: Trash, tone: 'danger', onSelect: () => {} },
            ]}
          />
          <Popover
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
            trigger={
              <Button size="sm" icon={Filter}>
                Filter · 2
              </Button>
            }
          >
            <div className="grid gap-4">
              <p className="text-small text-graphite">Show notes that match</p>
              <Field label="Mode" htmlFor="d-pop-mode">
                <Select id="d-pop-mode" defaultValue="" placeholder="Speaking and Writing" options={['Speaking', 'Writing']} />
              </Field>
              <div className="grid gap-1">
                <Checkbox checked={check} onChange={setCheck} label="Must remember" />
                <Checkbox checked={check2} onChange={setCheck2} label="Due now" />
              </div>
              <div className="flex justify-between border-t border-line pt-3">
                <Button variant="ghost" size="sm" onClick={() => setPopoverOpen(false)}>
                  Clear all
                </Button>
                <Button variant="primary" size="sm" onClick={() => setPopoverOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </Popover>
          <Tooltip label="Tooltips appear on hover or keyboard focus">
            <Button variant="ghost" size="sm">
              Hover for tooltip
            </Button>
          </Tooltip>
        </Row>
        <Row label="Toast">
          <Button onClick={() => toast.show('Note saved.', { action: { label: 'View', onClick: () => {} } })}>Note saved</Button>
          <Button variant="ghost" onClick={() => toast.show('✦ Marked as mastered.')}>
            Marked as mastered
          </Button>
        </Row>
        <Row label="App overlays">
          <Button variant="ghost" onClick={() => quickAdd.open()} kbd="N">
            Quick Add
          </Button>
          <Button variant="ghost" onClick={() => search.open()} kbd={`${modLabel()} K`}>
            Search
          </Button>
          <Button variant="ghost" onClick={() => shortcuts.open()} kbd="?">
            Shortcuts
          </Button>
        </Row>
      </Block>

      <Block id="empty" title="Empty states">
        <div className="mt-2 grid sm:grid-cols-2">
          <div className="border-b border-line sm:border-r">
            <EmptyState
              decoration="quill"
              title="No Speaking notes yet"
              body="Save the phrases you wish you had used."
              action={
                <Button variant="primary" icon={Plus} kbd="N">
                  Add first note
                </Button>
              }
            />
          </div>
          <div className="border-b border-line">
            <EmptyState
              decoration="constellation"
              title="No mistakes logged yet"
              body="When you save a correction, add its error type. Repeated habits appear here."
            />
          </div>
          <div className="border-b border-line sm:border-r">
            <EmptyState decoration="moon" title="Nothing is waiting for review." body="Next review tomorrow · 3 notes" />
          </div>
          <div className="border-b border-line">
            <EmptyState decoration="book" title="No model paragraphs yet" body="Save full paragraphs you want to learn from." />
          </div>
        </div>
      </Block>

      <Block id="headers" title="Page header and section">
        <div className="mt-8 rounded-lg border border-line bg-paper p-6 sm:p-10">
          <PageHeader
            eyebrow="Error Ledger"
            title="My Mistakes"
            description="Your repeated habits, grouped. Fix the most frequent first."
            actions={
              <Button size="sm" icon={Plus}>
                New note
              </Button>
            }
          >
            <ModeTabs value="writing" />
          </PageHeader>
          <Section title="Prepositions" action={<span className="text-graphite">4 notes</span>}>
            <div className="py-4">
              <p className="text-body-lg text-crimson">visitors of + place</p>
              <p className="mt-1 text-small text-graphite">Seen 4 times</p>
              <p className="mt-2 text-body text-ink">
                Use instead: <span className="font-medium text-upgrade">visitors to + place</span>
              </p>
            </div>
          </Section>
        </div>
      </Block>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="New Speaking note"
        description="What I said → Native upgrade"
        placement="top"
        footer={
          <>
            <span className="mr-auto hidden items-center gap-2 text-meta text-graphite sm:inline-flex">
              <KeyHint keys={`${modLabel()} Enter`} /> to save
            </span>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field label="Topic" htmlFor="dd-topic">
            <Combobox id="dd-topic" value={topic} onChange={setTopic} options={SPEAKING_TOPICS} allowCreate />
          </Field>
          <Field label="What I Said" htmlFor="dd-said">
            <TextArea id="dd-said" value={empty} onValueChange={setEmpty} placeholder="We enjoyed the scenario." />
          </Field>
          <Field label="Native Upgrade" htmlFor="dd-upgrade">
            <TextArea id="dd-upgrade" value={text} onValueChange={setText} className="text-note" placeholder="The scenery was beautiful." />
          </Field>
          <Field label="In context" htmlFor="dd-context" optional>
            <TextArea id="dd-context" value="" onValueChange={() => {}} placeholder="The scenery along the coast was beautiful." />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
