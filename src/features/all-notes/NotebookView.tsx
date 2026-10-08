import { List, Plus, Rows2 } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'
import { useLocation } from 'react-router'
import type { Note } from '@/lib/types'
import { NoteRow } from '@/components/notes/NoteRow'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { SegmentedControl } from '@/components/ui/Tabs'
import { countLine, groupByTopic, plural, resolveTopic, unusedTopics } from './notebook'
import { NotebookRow } from './NotebookRow'
import { TopicIndex, TopicStrip } from './TopicIndex'
import { DESKTOP_QUERY, LIST_VIEWS, useMediaQuery, useStoredChoice } from './uiState'
import type { ListView } from './uiState'

export const NOTEBOOK_VIEW_KEY = 'ielts-notebook-view'

export interface NotebookViewProps {
  /** The notes of this notebook (one mode, or one Writing task), newest first. */
  notes: Note[]
  /** Default, custom and used topics, from useTopics(). */
  knownTopics: readonly string[]
  /** The raw `?topic=` value. */
  topic: string | null
  hrefFor: (topic: string | null) => string
  /** Accessible name of the topic index, e.g. "Speaking topics". */
  indexLabel: string
  /** First line of each row's meta column (subtopic, chart type…). */
  rowLabel: (note: Note) => string
  now: Date
  /** Extra controls between the list head and the groups (the Writing genre filter). */
  filters?: React.ReactNode
  /** Opens Quick Add for this notebook, preset to a topic. */
  onNewNote: (topic?: string) => void
  newNoteLabel: string
}

/**
 * A notebook page body (mockup 16): the topic index on the left (sticky, 1024px and wider) or a topic strip
 * above (narrower screens), and the notes grouped by topic, each group a serif heading over a hairline.
 */
export function NotebookView(props: NotebookViewProps): React.JSX.Element {
  const { notes, knownTopics, topic, hrefFor, indexLabel, rowLabel, now, filters, onNewNote, newNoteLabel } = props
  const location = useLocation()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [view, setView] = useStoredChoice<ListView>(NOTEBOOK_VIEW_KEY, LIST_VIEWS, 'reading')

  const groups = useMemo(() => groupByTopic(notes, knownTopics, now), [notes, knownTopics, now])
  const empty = useMemo(() => unusedTopics(knownTopics, groups), [knownTopics, groups])
  const selected = resolveTopic(topic, groups, knownTopics)
  const shown = selected ? groups.filter((g) => g.key === selected.key) : groups
  const shownNotes = shown.flatMap((g) => g.notes)
  const due = shown.reduce((sum, g) => sum + g.due, 0)
  const ids = shownNotes.map((n) => n.id)
  const linkState = { ids, from: location.pathname + location.search }
  const items = groups.filter((g) => g.key).map((g) => ({ key: g.key, label: g.label, count: g.notes.length }))
  const indexProps = { label: indexLabel, allCount: notes.length, items, selected: selected?.key ?? null, hrefFor }

  const main = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
        <p className="text-small text-graphite tabular-nums">
          {plural(shownNotes.length, 'note')}
          {due > 0 ? (
            <>
              {' · '}
              <span className="text-ink">{due} due today</span>
            </>
          ) : null}
        </p>
        <SegmentedControl<ListView>
          aria-label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'compact', label: 'Compact', icon: List },
            { value: 'reading', label: 'Reading', icon: Rows2 },
          ]}
        />
      </div>
      {filters}
      {shown.length === 0 ? (
        <EmptyState
          title={selected ? `No ${selected.label} notes yet` : 'No notes here yet'}
          body="Save a correction on this topic and it will appear here."
          action={
            <Button variant="secondary" icon={Plus} onClick={() => onNewNote(selected?.label)}>
              {newNoteLabel}
            </Button>
          }
        />
      ) : (
        shown.map((g) => (
          <Section
            key={g.key || 'none'}
            id={g.slug}
            title={g.label}
            className="mt-10"
            action={<span className="text-graphite tabular-nums">{countLine(g.notes.length, g.due)}</span>}
          >
            {view === 'reading' ? (
              <ul>
                {g.notes.map((n) => (
                  <NotebookRow
                    key={n.id}
                    note={n}
                    to={`/notes/${n.id}`}
                    linkState={linkState}
                    label={rowLabel(n)}
                    now={now}
                  />
                ))}
              </ul>
            ) : (
              <ul>
                {g.notes.map((n) => (
                  <li key={n.id}>
                    <NoteRow note={n} view="compact" to={`/notes/${n.id}`} linkState={linkState} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ))
      )}
    </div>
  )

  if (desktop) {
    return (
      <div className="mt-10 grid grid-cols-[11.5rem_minmax(0,1fr)] items-start gap-14">
        <TopicIndex {...indexProps} empty={empty} />
        {main}
      </div>
    )
  }
  return (
    <div className="mt-6">
      <TopicStrip {...indexProps} selectedLabel={selected?.label} />
      {main}
    </div>
  )
}
