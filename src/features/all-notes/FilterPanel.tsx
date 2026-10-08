/**
 * All Notes filters (brief §31): one small drawer, not a row of controls across the page.
 * Desktop and tablet show it in a Popover (mockup 14b); under 640px the screen puts it in a full-screen Dialog sheet.
 * Every change applies at once (the list and the URL update live); Done only closes the panel.
 */
import type React from 'react'
import { useId } from 'react'
import { Link } from 'react-router'
import { useErrorTypes, useTopics } from '@/lib/hooks'
import { MASTERY, MASTERY_ORDER, NOTE_TYPES } from '@/lib/taxonomy'
import type { Mode, NoteFilter, NoteType, ReviewStatusFilter } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { Checkbox } from '@/components/ui/Field'
import { MasteryGlyph } from '@/components/ui/MasteryMark'
import { SegmentedControl } from '@/components/ui/Tabs'
import { Tag } from '@/components/ui/Tag'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { REVIEW_STATUS_LABELS } from './filterTags'
import { PanelDate, PanelSelect } from './ToolbarControls'

type Option = { value: string; label: string }

function uniqueCaseInsensitive(lists: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const v of list) {
      const k = v.trim().toLowerCase()
      if (!k || seen.has(k)) continue
      seen.add(k)
      out.push(v.trim())
    }
  }
  return out
}

/** A select that adds one value at a time; chosen values show as removable tags below it. */
function MultiSelect(props: {
  id: string
  values: string[]
  options: readonly Option[]
  onChange: (values: string[]) => void
  anyLabel: string
  addLabel: string
}): React.JSX.Element {
  const { id, values, options, onChange, anyLabel, addLabel } = props
  const chosen = new Set(values.map((v) => v.toLowerCase()))
  const remaining = options.filter((o) => !chosen.has(o.value.toLowerCase()))
  const labelOf = (v: string) => options.find((o) => o.value.toLowerCase() === v.toLowerCase())?.label ?? v
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <PanelSelect
        id={id}
        value=""
        placeholder={values.length ? addLabel : anyLabel}
        options={remaining}
        onChange={(v) => {
          if (v) onChange([...values, v])
        }}
      />
      {values.length ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Tag key={v} title={labelOf(v)} onRemove={() => onChange(values.filter((x) => x !== v))}>
              <span className="text-ink">{labelOf(v)}</span>
            </Tag>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Mastery is multi-choice: four toggle buttons in one segmented frame, each with its symbol and word. */
function MasteryToggles(props: { value: NoteFilter['mastery']; onChange: (v: NoteFilter['mastery']) => void }): React.JSX.Element {
  const selected = new Set(props.value ?? [])
  return (
    <div role="group" aria-label="Mastery" className="inline-flex flex-wrap self-start rounded-sm border border-line-strong bg-paper p-0.5">
      {MASTERY_ORDER.map((m) => {
        const on = selected.has(m)
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => {
              const next = on ? [...selected].filter((x) => x !== m) : [...selected, m]
              props.onChange(next.length ? MASTERY_ORDER.filter((x) => next.includes(x)) : undefined)
            }}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-xs px-2 text-small whitespace-nowrap transition-colors duration-150 max-sm:h-11 max-sm:px-2.5',
              // On: like the selected segment of SegmentedControl, a stone surface with a faint brass edge.
              on ? 'bg-stone text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--gold)_32%,transparent)]' : 'text-graphite hover:text-ink',
            )}
          >
            <MasteryGlyph status={m} />
            {MASTERY[m].label}
          </button>
        )
      })}
    </div>
  )
}

/** One labeled line. Side by side in the popover, stacked in the mobile sheet. A small dot marks a filter in use. */
function Row(props: { label: string; active: boolean; htmlFor?: string; stacked: boolean; children: React.ReactNode }): React.JSX.Element {
  const { label, active, htmlFor, stacked, children } = props
  const text = (
    <>
      {label}
      {active ? (
        <>
          <span aria-hidden="true" className="ml-1.5 inline-block size-1 -translate-y-px rounded-full bg-brass align-middle" />
          <VisuallyHidden> (in use)</VisuallyHidden>
        </>
      ) : null}
    </>
  )
  // No wrap beside the fields: "Must Remember" and its dot stay on one line (it may reach 2px into the gap).
  const labelClass = cn('text-small text-graphite', stacked ? null : 'pt-1.5 whitespace-nowrap')
  return (
    <div className={stacked ? 'flex flex-col gap-1.5' : 'grid grid-cols-[6.75rem_minmax(0,1fr)] items-start gap-3'}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {text}
        </label>
      ) : (
        <span className={labelClass}>{text}</span>
      )}
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  )
}

/** The archive is a separate view (`?archived=1`), so the panel links to it instead of filtering in place. */
export interface ArchiveInfo {
  /** Archived notes in the notebook. */
  count: number | undefined
  /** True on the archived view. */
  inArchive: boolean
  onNavigate: () => void
}

const PANEL_LINK =
  'inline-flex min-h-8 items-center self-start rounded-xs text-small text-indigo underline-offset-4 hover:underline max-sm:min-h-11 max-sm:text-body'

function ArchiveLink(props: { archive: ArchiveInfo }): React.JSX.Element {
  const { count, inArchive, onNavigate } = props.archive
  if (inArchive) {
    return (
      <Link to="/notes" className={PANEL_LINK} onClick={onNavigate}>
        Back to All Notes
      </Link>
    )
  }
  if (!count) return <p className="pt-1.5 text-small text-graphite max-sm:pt-0">No archived notes</p>
  return (
    <Link to="/notes?archived=1" className={PANEL_LINK} onClick={onNavigate}>
      {count === 1 ? 'Show 1 archived note' : `Show ${count} archived notes`}
    </Link>
  )
}

export function FilterFields(props: {
  filter: NoteFilter
  onChange: (f: NoteFilter) => void
  stacked: boolean
  archive?: ArchiveInfo
}): React.JSX.Element {
  const { filter: f, onChange, stacked, archive } = props
  const id = useId()
  const speakingTopics = useTopics('speaking')
  const writingTopics = useTopics('writing', f.task_type)
  const errorTypes = useErrorTypes()
  const topics =
    f.mode === 'speaking'
      ? speakingTopics
      : f.mode === 'writing' || f.task_type
        ? writingTopics
        : uniqueCaseInsensitive([speakingTopics, writingTopics])

  const set = (patch: Partial<NoteFilter>) => onChange({ ...f, ...patch })
  const group = cn('flex flex-col px-4', stacked ? 'gap-5 py-5' : 'gap-2.5 py-3')

  return (
    <div className="divide-y divide-line">
      <div className={group}>
        <Row label="Mode" active={Boolean(f.mode)} stacked={stacked}>
          <SegmentedControl<'all' | Mode>
            aria-label="Mode"
            className="self-start"
            value={f.mode ?? 'all'}
            onChange={(v) => set({ mode: v === 'all' ? undefined : v })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'speaking', label: 'Speaking' },
              { value: 'writing', label: 'Writing' },
            ]}
          />
        </Row>
        <Row label="Topic" active={Boolean(f.topics?.length)} htmlFor={`${id}-topic`} stacked={stacked}>
          <MultiSelect
            id={`${id}-topic`}
            values={f.topics ?? []}
            options={topics.map((t) => ({ value: t, label: t }))}
            onChange={(v) => set({ topics: v.length ? v : undefined })}
            anyLabel="Any topic"
            addLabel="Add another topic"
          />
        </Row>
        <Row label="Task type" active={Boolean(f.task_type)} stacked={stacked}>
          <SegmentedControl<'any' | 'task1' | 'task2'>
            aria-label="Task type"
            className="self-start"
            value={f.task_type ?? 'any'}
            onChange={(v) => set({ task_type: v === 'any' ? undefined : v })}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'task1', label: 'Task 1' },
              { value: 'task2', label: 'Task 2' },
            ]}
          />
        </Row>
      </div>
      <div className={group}>
        <Row label="Error type" active={Boolean(f.error_types?.length)} htmlFor={`${id}-error`} stacked={stacked}>
          <MultiSelect
            id={`${id}-error`}
            values={f.error_types ?? []}
            options={errorTypes.map((t) => ({ value: t, label: t }))}
            onChange={(v) => set({ error_types: v.length ? v : undefined })}
            anyLabel="Any error type"
            addLabel="Add another error type"
          />
        </Row>
        <Row label="Note type" active={Boolean(f.note_types?.length)} htmlFor={`${id}-type`} stacked={stacked}>
          <MultiSelect
            id={`${id}-type`}
            values={f.note_types ?? []}
            options={NOTE_TYPES}
            onChange={(v) => set({ note_types: v.length ? (v as NoteType[]) : undefined })}
            anyLabel="Any type"
            addLabel="Add another type"
          />
        </Row>
      </div>
      <div className={group}>
        <Row label="Mastery" active={Boolean(f.mastery?.length)} stacked={stacked}>
          <MasteryToggles value={f.mastery} onChange={(v) => set({ mastery: v })} />
        </Row>
        <Row label="Review status" active={Boolean(f.review_status)} htmlFor={`${id}-status`} stacked={stacked}>
          <PanelSelect
            id={`${id}-status`}
            value={f.review_status ?? ''}
            placeholder="Any status"
            options={(Object.keys(REVIEW_STATUS_LABELS) as ReviewStatusFilter[]).map((s) => ({ value: s, label: REVIEW_STATUS_LABELS[s] }))}
            onChange={(v) => set({ review_status: (v || undefined) as ReviewStatusFilter | undefined })}
          />
        </Row>
        <Row label="Must Remember" active={Boolean(f.favorite)} stacked={stacked}>
          <Checkbox
            id={`${id}-fav`}
            checked={Boolean(f.favorite)}
            onChange={(v) => set({ favorite: v || undefined })}
            label="Must Remember notes only"
          />
        </Row>
        <Row label="Date added" active={Boolean(f.date_from || f.date_to)} htmlFor={`${id}-from`} stacked={stacked}>
          <div className="grid grid-cols-2 gap-2">
            <PanelDate
              id={`${id}-from`}
              aria-label="Added from"
              value={f.date_from ?? ''}
              max={f.date_to}
              onChange={(e) => set({ date_from: e.target.value || undefined })}
            />
            <PanelDate
              aria-label="Added to"
              value={f.date_to ?? ''}
              min={f.date_from}
              onChange={(e) => set({ date_to: e.target.value || undefined })}
            />
          </div>
        </Row>
        {archive ? (
          <Row label="Archived" active={false} stacked={stacked}>
            <ArchiveLink archive={archive} />
          </Row>
        ) : null}
      </div>
    </div>
  )
}

/** "10 of 32 notes match" */
export function MatchCount(props: { match: number | undefined; total: number | undefined }): React.JSX.Element {
  const { match, total } = props
  if (match === undefined || total === undefined) return <span />
  return (
    <p className="text-small text-graphite tabular-nums" aria-live="polite">
      <span className="text-ink">{match}</span> of {total} {total === 1 ? 'note matches' : 'notes match'}
    </p>
  )
}

/** The popover version: a header with Clear all, the fields, and a footer with the match count and Done. */
export function FilterPopoverPanel(props: {
  filter: NoteFilter
  onChange: (f: NoteFilter) => void
  onClear: () => void
  activeCount: number
  match: number | undefined
  total: number | undefined
  onDone: () => void
  archive?: ArchiveInfo
}): React.JSX.Element {
  const { filter, onChange, onClear, activeCount, match, total, onDone, archive } = props
  return (
    <div>
      {/* Header and footer stay in view while the fields scroll (the popover is at most 520px tall). */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-paper px-4 py-2">
        <p className="text-small font-medium text-ink">Filter notes</p>
        <Button variant="ghost" size="sm" className="-mr-2" onClick={onClear} disabled={activeCount === 0}>
          Clear all
        </Button>
      </div>
      <FilterFields filter={filter} onChange={onChange} stacked={false} archive={archive} />
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-line bg-paper px-4 py-3">
        <MatchCount match={match} total={total} />
        <Button variant="primary" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
