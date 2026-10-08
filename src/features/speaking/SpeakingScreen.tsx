import { Plus, RotateCcw } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { useNotes, useTopics } from '@/lib/hooks'
import { isDue } from '@/lib/srs'
import { FIELD_LABELS } from '@/lib/taxonomy'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ModeTabs } from '@/components/ui/Tabs'
import { groupByTopic, notebookSummary } from '@/features/all-notes/notebook'
import { NotebookView } from '@/features/all-notes/NotebookView'

const EYEBROW = `${FIELD_LABELS.speaking.original} → ${FIELD_LABELS.speaking.upgraded}`

function hrefFor(topic: string | null): string {
  return topic ? `/speaking?${new URLSearchParams({ topic })}` : '/speaking'
}

/** The Speaking notebook (brief §16, §21, mockup 16): notes grouped by topic, a topic index, `?topic=` for one topic. */
export function SpeakingScreen(): React.JSX.Element {
  const [params] = useSearchParams()
  const quickAdd = useQuickAdd()
  const notes = useNotes({ mode: 'speaking' })
  const topics = useTopics('speaking')
  // `notes` changes whenever the data does, so "now" stays fresh for due dates.
  const now = useMemo(() => new Date(), [notes])
  const topic = params.get('topic')

  const groups = useMemo(() => (notes ? groupByTopic(notes, topics, now) : []), [notes, topics, now])
  const due = notes?.filter((n) => isDue(n, now)).length ?? 0
  const topicCount = groups.filter((g) => g.key).length

  const newNote = (t?: string) => quickAdd.open(t ? { mode: 'speaking', prefill: { topic: t } } : { mode: 'speaking' })
  const selectedLabel = topic ? (groups.find((g) => g.key === topic.trim().toLowerCase())?.label ?? topic.trim()) : undefined

  const actions =
    notes && notes.length > 0 ? (
      <>
        {due > 0 ? (
          <ButtonLink to="/review?mode=speaking" variant="secondary" size="sm" icon={RotateCcw}>
            Review Speaking
            <span className="text-graphite tabular-nums">{due}</span>
          </ButtonLink>
        ) : null}
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => newNote(selectedLabel)}>
          New Speaking note
        </Button>
      </>
    ) : undefined

  return (
    <div className="mx-auto max-w-[1040px]">
      <PageHeader
        eyebrow={EYEBROW}
        title="Speaking"
        description={notes && notes.length > 0 ? notebookSummary(notes.length, topicCount, due) : undefined}
        actions={actions}
        className="mb-0 sm:mb-0"
      >
        <ModeTabs value="speaking" />
      </PageHeader>

      {notes === undefined ? (
        <div className="min-h-[40vh]" aria-busy="true" />
      ) : notes.length === 0 ? (
        <EmptyState
          decoration="constellation"
          title="No Speaking notes yet"
          body="Save the phrases you wish you had used."
          className="mt-6"
          action={
            <Button variant="primary" icon={Plus} onClick={() => newNote()}>
              Add first note
            </Button>
          }
        />
      ) : (
        <NotebookView
          notes={notes}
          knownTopics={topics}
          topic={topic}
          hrefFor={hrefFor}
          indexLabel="Speaking topics"
          rowLabel={(n) => n.subtopic}
          now={now}
          onNewNote={newNote}
          newNoteLabel="New Speaking note"
        />
      )}
    </div>
  )
}
