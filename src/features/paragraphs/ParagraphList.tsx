import { ArchiveRestore, ChevronDown, Plus } from 'lucide-react'
import type React from 'react'
import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { cn, WRAP } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/EmptyState'
import { FavoriteStar } from '@/components/ui/FavoriteStar'
import { ICON_STROKE } from '@/components/ui/icons'
import { useToast } from '@/components/ui/Toast'
import { useNotes, useParagraphs } from '@/lib/hooks'
import { createParagraph, restoreParagraph } from '@/lib/repo'
import type { Paragraph, TaskType } from '@/lib/types'
import { paragraphMeta, paragraphPreview, paragraphTitle, plural, UNTITLED } from './paragraphText'

function ParagraphRow(props: { paragraph: Paragraph; notes: number; trailing?: React.ReactNode }): React.JSX.Element {
  const { paragraph: p, notes, trailing } = props
  const meta = paragraphMeta(p)
  const preview = paragraphPreview(p.body)
  return (
    <li className="group -mx-3 flex items-stretch rounded-sm px-3 transition-colors duration-150 hover:bg-stone/60">
      <div className="flex min-w-0 flex-1 items-stretch border-b border-line">
        <Link
          to={`/writing/paragraphs/${p.id}`}
          className={cn(
            'flex min-w-0 flex-1 items-start gap-4 rounded-sm py-5 sm:gap-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo',
            '-ml-3 pl-3',
            trailing ? null : '-mr-3 pr-3',
          )}
        >
          <div className="min-w-0 flex-1">
            <h3 className={cn('font-serif text-section font-normal text-ink', WRAP)}>{paragraphTitle(p)}</h3>
            {meta ? <p className="mt-1 text-small text-graphite">{meta}</p> : null}
            {preview ? (
              <p className={cn('mt-2 line-clamp-2 max-w-[64ch] text-body text-graphite', WRAP)}>{preview}</p>
            ) : (
              <p className="mt-2 text-body text-graphite">No text yet.</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1.5">
            {notes > 0 ? <span className="text-small text-graphite tabular-nums">{plural(notes, 'note')}</span> : null}
            <FavoriteStar active={p.is_favorite} />
          </div>
        </Link>
        {trailing ? <div className="flex shrink-0 items-center pl-3">{trailing}</div> : null}
      </div>
    </li>
  )
}

/**
 * Model Paragraphs, inside the Writing screen's tab (brief §23). Newest first. `taskType` presets new paragraphs.
 */
export function ParagraphList(props: { taskType?: TaskType }): React.JSX.Element {
  const { taskType } = props
  const navigate = useNavigate()
  const toast = useToast()
  const paragraphs = useParagraphs()
  const archived = useParagraphs({ archived: true })
  const notes = useNotes()
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)
  const archivedId = useId()

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of notes ?? []) {
      if (n.source_paragraph_id) m.set(n.source_paragraph_id, (m.get(n.source_paragraph_id) ?? 0) + 1)
    }
    return m
  }, [notes])

  const create = async () => {
    if (creating) return
    setCreating(true)
    try {
      const p = await createParagraph({ title: UNTITLED, body: '', task_type: taskType ?? '' })
      navigate(`/writing/paragraphs/${p.id}?edit=1`)
    } finally {
      setCreating(false)
    }
  }

  const restore = async (p: Paragraph) => {
    await restoreParagraph(p.id)
    toast.show('Paragraph restored.')
  }

  if (paragraphs === undefined) return <div className="min-h-40" aria-busy="true" />

  const newButton = (
    <Button variant="secondary" size="sm" icon={Plus} loading={creating} onClick={() => void create()}>
      New model paragraph
    </Button>
  )

  const archivedCount = archived?.length ?? 0

  return (
    <div className="max-w-[760px]">
      {paragraphs.length === 0 ? (
        <EmptyState
          decoration="book"
          title="No model paragraphs yet"
          body="Save full paragraphs you want to learn from."
          action={newButton}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
            <p className="text-small text-graphite">{plural(paragraphs.length, 'paragraph')}</p>
            {newButton}
          </div>
          <ul>
            {paragraphs.map((p) => (
              <ParagraphRow key={p.id} paragraph={p} notes={counts.get(p.id) ?? 0} />
            ))}
          </ul>
        </>
      )}

      {archivedCount > 0 ? (
        <div className="mt-8">
          <button
            type="button"
            aria-expanded={showArchived}
            aria-controls={showArchived ? archivedId : undefined}
            onClick={() => setShowArchived((v) => !v)}
            className="-ml-1.5 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 text-small text-graphite transition-colors duration-150 hover:text-ink max-sm:min-h-11"
          >
            Archived paragraphs
            <span className="tabular-nums">{archivedCount}</span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className={cn('size-3.5 transition-transform duration-180', showArchived && 'rotate-180')}
            />
          </button>
          {showArchived ? (
            <ul id={archivedId} className="mt-1">
              {(archived ?? []).map((p) => (
                <ParagraphRow
                  key={p.id}
                  paragraph={p}
                  notes={counts.get(p.id) ?? 0}
                  trailing={
                    <Button variant="ghost" size="sm" icon={ArchiveRestore} onClick={() => void restore(p)}>
                      Restore
                    </Button>
                  }
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
