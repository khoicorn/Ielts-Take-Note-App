import { Plus, RotateCcw } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { useNotes, useParagraphs, useTopics } from '@/lib/hooks'
import { isDue } from '@/lib/srs'
import { FIELD_LABELS, genresFor, taskTypeLabel } from '@/lib/taxonomy'
import type { Note, NoteDraft, TaskType } from '@/lib/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ModeTabs, UnderlineTabs } from '@/components/ui/Tabs'
import { groupByTopic, notebookSummary } from '@/features/all-notes/notebook'
import { NotebookView } from '@/features/all-notes/NotebookView'
import { MOBILE_QUERY, useMediaQuery } from '@/components/ui/uiState'
import { ParagraphList } from '@/features/paragraphs/ParagraphList'

type WritingTab = 'task1' | 'task2' | 'paragraphs'
type Task = Exclude<TaskType, ''>

const EYEBROW = `${FIELD_LABELS.writing.original} → ${FIELD_LABELS.writing.upgraded}`
const EMPTY_BODY = 'Save the sentences you want to write better next time.'

function parseTab(v: string | null): WritingTab {
  return v === 'task2' || v === 'paragraphs' ? v : 'task1'
}

function lower(s: string): string {
  return s.trim().toLowerCase()
}

/** Chart or essay types used by these notes: the default ones in their usual order, then any custom ones. */
function usedGenres(notes: Note[], task: Task): string[] {
  const used = new Map<string, string>()
  for (const n of notes) if (n.task_genre.trim() && !used.has(lower(n.task_genre))) used.set(lower(n.task_genre), n.task_genre.trim())
  const defaults = genresFor(task).filter((g) => used.has(lower(g)))
  const custom = [...used.entries()].filter(([k]) => !genresFor(task).some((g) => lower(g) === k)).map(([, v]) => v)
  return [...defaults, ...custom.sort((a, b) => a.localeCompare(b))]
}

/** Small toggle chips for the chart type (Task 1) or essay type (Task 2). */
function GenreFilter(props: { task: Task; genres: string[]; value: string | null; onChange: (genre: string | null) => void }): React.JSX.Element | null {
  const { task, genres, value, onChange } = props
  if (genres.length < 2 && !value) return null
  const label = task === 'task1' ? 'Chart type' : 'Essay type'
  return (
    <div role="group" aria-label={label} className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2.5">
      <span className="mr-1 text-small text-graphite">{label}</span>
      {genres.map((g) => {
        const on = value !== null && lower(value) === lower(g)
        return (
          <button
            key={g}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : g)}
            className={cn(
              'relative inline-flex h-7 cursor-pointer items-center rounded-full border px-3 text-small whitespace-nowrap transition-colors duration-150',
              // A 44px tall hit area on touch screens without a taller chip.
              "max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-2 max-sm:after:content-['']",
              on ? 'border-indigo/40 bg-indigo/[0.07] text-indigo' : 'border-line-strong text-graphite hover:text-ink',
            )}
          >
            {g}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The Writing notebook (brief §17, §22): Academic Task 1 · Task 2 · Model Paragraphs. Task tabs group notes by
 * language topic, with a topic index and a chart or essay type filter. `?tab=`, `?topic=` and `?genre=` live in the URL.
 */
export function WritingScreen(): React.JSX.Element {
  const [params, setParams] = useSearchParams()
  const quickAdd = useQuickAdd()
  const tab = parseTab(params.get('tab'))
  const task: Task | undefined = tab === 'paragraphs' ? undefined : tab
  const topic = params.get('topic')
  const genre = params.get('genre')?.trim() || null

  const notes = useNotes({ mode: 'writing' })
  const paragraphs = useParagraphs()
  const topics = useTopics('writing', task ?? 'task1')
  // `notes` changes whenever the data does, so "now" stays fresh for due dates.
  const now = useMemo(() => new Date(), [notes])

  const taskNotes = useMemo(() => (notes && task ? notes.filter((n) => n.task_type === task) : []), [notes, task])
  const genres = useMemo(() => (task ? usedGenres(taskNotes, task) : []), [taskNotes, task])
  const visible = useMemo(
    () => (genre ? taskNotes.filter((n) => lower(n.task_genre) === lower(genre)) : taskNotes),
    [taskNotes, genre],
  )
  const due = notes?.filter((n) => isDue(n, now)).length ?? 0
  const topicCount = useMemo(() => (notes ? groupByTopic(notes, [], now).filter((g) => g.key).length : 0), [notes, now])
  // Zero counts are left out of the tabs: they add noise and no information.
  const nonZero = (n: number | undefined) => (n ? n : undefined)
  const count = (t: Task) => nonZero(notes?.filter((n) => n.task_type === t).length)
  const mobile = useMediaQuery(MOBILE_QUERY)

  const query = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    sp.set('tab', tab)
    const merged = { topic, genre, ...patch }
    if (merged.topic) sp.set('topic', merged.topic)
    if (merged.genre) sp.set('genre', merged.genre)
    return `/writing?${sp}`
  }
  const topicHref = (t: string | null) => query({ topic: t })
  const setGenre = (g: string | null) => {
    const sp = new URLSearchParams(params)
    if (g) sp.set('genre', g)
    else sp.delete('genre')
    if (!sp.get('tab')) sp.set('tab', tab)
    setParams(sp)
  }

  const selectedLabel = topic ? (taskNotes.find((n) => lower(n.topic) === lower(topic))?.topic.trim() ?? topic.trim()) : undefined
  const newNote = (t?: string) => {
    const prefill: Partial<NoteDraft> = { task_type: task ?? 'task1' }
    if (t) prefill.topic = t
    if (genre && task) prefill.task_genre = genre
    quickAdd.open({ mode: 'writing', prefill })
  }

  const tabs = (
    <UnderlineTabs
      aria-label="Writing sections"
      value={tab}
      className="mt-4 sm:mt-6"
      items={[
        // "Task 1" under 640px, so the three tabs fit on one line at 390px.
        { value: 'task1', label: taskTypeLabel('task1', mobile ? 'short' : 'label'), to: '/writing?tab=task1', count: count('task1') },
        { value: 'task2', label: taskTypeLabel('task2'), to: '/writing?tab=task2', count: count('task2') },
        { value: 'paragraphs', label: 'Model Paragraphs', to: '/writing?tab=paragraphs', count: nonZero(paragraphs?.length) },
      ]}
    />
  )

  const hasNotes = notes !== undefined && notes.length > 0
  const actions =
    hasNotes && tab !== 'paragraphs' ? (
      <>
        {due > 0 ? (
          <ButtonLink to="/review?mode=writing" variant="secondary" size="sm" icon={RotateCcw}>
            Review Writing
            <span className="text-graphite tabular-nums">{due}</span>
          </ButtonLink>
        ) : null}
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => newNote(selectedLabel)}>
          New Writing note
        </Button>
      </>
    ) : undefined

  let body: React.ReactNode
  if (tab === 'paragraphs') {
    body = (
      <div className="mt-8">
        <ParagraphList />
      </div>
    )
  } else if (notes === undefined) {
    body = <div className="min-h-[40vh]" aria-busy="true" />
  } else if (notes.length === 0 || taskNotes.length === 0) {
    const none = notes.length === 0
    body = (
      <EmptyState
        decoration="quill"
        title={none ? 'No Writing notes yet' : `No ${taskTypeLabel(task ?? 'task1')} notes yet`}
        body={EMPTY_BODY}
        className="mt-6"
        action={
          <Button variant={none ? 'primary' : 'secondary'} icon={Plus} onClick={() => newNote()}>
            {none ? 'Add first note' : 'New Writing note'}
          </Button>
        }
      />
    )
  } else {
    body = (
      <NotebookView
        notes={visible}
        knownTopics={topics}
        topic={topic}
        hrefFor={topicHref}
        indexLabel={`${taskTypeLabel(task ?? 'task1')} topics`}
        rowLabel={(n) => n.task_genre || n.subtopic}
        now={now}
        filters={task ? <GenreFilter task={task} genres={genres} value={genre} onChange={setGenre} /> : null}
        onNewNote={newNote}
        newNoteLabel="New Writing note"
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1040px]">
      <PageHeader
        eyebrow={EYEBROW}
        title="Writing"
        description={hasNotes ? notebookSummary(notes.length, topicCount, due) : undefined}
        actions={actions}
        className="mb-0 sm:mb-0"
      >
        <ModeTabs value="writing" />
        {tabs}
      </PageHeader>
      {body}
    </div>
  )
}
