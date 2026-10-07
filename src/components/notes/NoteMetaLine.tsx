import React from 'react'
import { formatDue } from '@/lib/dates'
import { noteTypeLabel } from '@/lib/taxonomy'
import type { Note } from '@/lib/types'
import { cn } from '@/components/ui/cn'
import { MasteryMark } from '@/components/ui/MasteryMark'
import { ModeMark } from './ModeMark'

export type MetaPart = 'mode' | 'topic' | 'type' | 'due' | 'mastery'

/** "Travel · Correction · Due today". Empty parts are skipped. */
export function NoteMetaLine(props: { note: Note; now?: Date; parts?: MetaPart[]; className?: string }): React.JSX.Element {
  const { note, now = new Date(), parts = ['topic', 'type', 'due'], className } = props
  const items: { key: string; node: React.ReactNode }[] = []
  for (const p of parts) {
    if (p === 'mode') items.push({ key: p, node: <ModeMark mode={note.mode} /> })
    else if (p === 'topic' && note.topic.trim()) items.push({ key: p, node: <span>{note.topic.trim()}</span> })
    else if (p === 'type') items.push({ key: p, node: <span>{noteTypeLabel(note.note_type)}</span> })
    else if (p === 'due')
      items.push({ key: p, node: <span>{note.is_archived ? 'Archived' : formatDue(note.next_review_at, now)}</span> })
    else if (p === 'mastery') items.push({ key: p, node: <MasteryMark status={note.mastery_status} /> })
  }
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-graphite', className)}>
      {items.map((it, i) => (
        <React.Fragment key={it.key}>
          {i > 0 ? (
            <span aria-hidden="true" className="text-graphite">
              ·
            </span>
          ) : null}
          {it.node}
        </React.Fragment>
      ))}
    </p>
  )
}
