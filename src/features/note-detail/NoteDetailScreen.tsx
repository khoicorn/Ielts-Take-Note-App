import { Archive, ArchiveRestore, ArrowLeft, ChevronLeft, ChevronRight, Copy, Ellipsis, Pencil, Repeat, Trash2 } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useHotkeys } from '@/app/hotkeys'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { useAnyDialogOpen } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { FavoriteStar } from '@/components/ui/FavoriteStar'
import { ICON_STROKE } from '@/components/ui/icons'
import { Menu, type MenuItem } from '@/components/ui/Popover'
import { useToast } from '@/components/ui/Toast'
import { useNote } from '@/lib/hooks'
import {
  archiveNote,
  deleteNote,
  duplicateNote,
  markSeenAgain,
  restoreNote,
  setLastStudied,
  setMastery,
  toggleFavorite,
} from '@/lib/repo'
import { MASTERY } from '@/lib/taxonomy'
import { plainText } from '@/lib/text'
import type { MasteryStatus, Note } from '@/lib/types'
import { backLabel, type DetailState, readDetailState } from './detail'
import { NoteBody } from './NoteBody'
import { NoteEditForm } from './NoteEditForm'
import { NoteMeta } from './NoteMeta'
import { ReviewHistory } from './ReviewHistory'

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.'
}

/** Route /notes/:id (brief §18, §33, §41). */
export function NoteDetailScreen(): React.JSX.Element {
  const { id } = useParams()
  const note = useNote(id)
  const location = useLocation()
  const nav = useMemo(() => readDetailState(location.state), [location.state])

  if (note === undefined) return <div className="mx-auto min-h-[60vh] max-w-[1040px]" aria-busy="true" />
  if (note === null) {
    return (
      <div className="mx-auto max-w-[760px]">
        <EmptyState
          decoration="book"
          title="This note does not exist."
          body="It may have been deleted. Your other notes are in All Notes."
          action={
            <ButtonLink to="/notes" variant="secondary">
              All notes
            </ButtonLink>
          }
        />
      </div>
    )
  }
  // Keyed by id: edit mode and focus start fresh on another note.
  return <NoteDetail key={note.id} note={note} nav={nav} />
}

function NoteDetail(props: { note: Note; nav: DetailState }): React.JSX.Element {
  const { nav } = props
  // The note just saved, until the live query catches up (so the reading view never flashes the old text).
  const [saved, setSaved] = useState<Note | null>(null)
  const note = saved && saved.updated_at > props.note.updated_at ? saved : props.note
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const dialogOpen = useAnyDialogOpen()
  const [editing, setEditing] = useState(false)
  const dirty = useRef(false)
  const editButton = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)
  const from = nav.from ?? '/notes'
  const onDirtyChange = useCallback((d: boolean) => {
    dirty.current = d
  }, [])

  // Opening a note counts as studying its topic ("Continue studying" on Today).
  useEffect(() => {
    void setLastStudied({ mode: note.mode, task_type: note.task_type, topic: note.topic }).catch(() => {})
    // Once per note: the component is keyed by id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Leaving edit mode puts focus back on the Edit button.
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus({ preventScroll: true })
    wasEditing.current = editing
  }, [editing])

  const ids = nav.ids ?? []
  const index = ids.indexOf(note.id)
  const prevId = index > 0 ? ids[index - 1] : undefined
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : undefined
  const goTo = (target: string | undefined) => {
    if (target) navigate(`/notes/${target}`, { replace: true, state: location.state })
  }

  /** Runs a write and shows its error as a toast instead of failing silently. */
  const run = (fn: () => Promise<void>) => () => {
    fn().catch((e: unknown) => toast.show(errorMessage(e)))
  }

  const toggleMustRemember = run(async () => {
    const on = await toggleFavorite(note.id)
    toast.show(on ? 'Added to Must Remember.' : 'Removed from Must Remember.')
  })

  const duplicate = run(async () => {
    const copy = await duplicateNote(note.id)
    navigate(`/notes/${copy.id}`, { state: { from, fromLabel: nav.fromLabel } })
    toast.show('Note duplicated.')
  })

  const archive = run(async () => {
    await archiveNote(note.id)
    toast.show('Note archived.', {
      action: { label: 'Undo', onClick: () => void restoreNote(note.id).catch((e: unknown) => toast.show(errorMessage(e))) },
    })
  })

  const restore = run(async () => {
    await restoreNote(note.id)
    toast.show('Note restored.')
  })

  const seenAgain = run(async () => {
    await markSeenAgain(note.id)
    toast.show("Logged. It will come back in today's review.")
  })

  const remove = run(async () => {
    const ok = await confirm({
      title: 'Delete this note?',
      body: 'Its review history will be deleted too. This cannot be undone.',
      confirmLabel: 'Delete note',
      tone: 'danger',
    })
    if (!ok) return
    await deleteNote(note.id)
    // Replace: Back should not return to a note that no longer exists.
    navigate(from, { replace: true })
    toast.show('Note deleted.')
  })

  const changeMastery = (m: MasteryStatus) =>
    run(async () => {
      await setMastery(note.id, m)
      toast.show(`Marked as ${MASTERY[m].label.toLowerCase()}.`)
    })()

  const onBack = (e: React.MouseEvent) => {
    if (!editing || !dirty.current) return
    e.preventDefault()
    void confirm({
      title: 'Discard your changes?',
      body: 'Your edits to this note will be lost.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      tone: 'danger',
    }).then((ok) => {
      if (ok) navigate(from)
    })
  }

  useHotkeys(
    {
      e: () => setEditing(true),
      '[': () => goTo(prevId),
      ']': () => goTo(nextId),
    },
    { enabled: !editing && !dialogOpen },
  )

  const menuItems: (MenuItem | 'separator')[] = [
    { label: 'Duplicate', icon: Copy, onSelect: duplicate },
    note.is_archived
      ? { label: 'Restore', icon: ArchiveRestore, onSelect: restore }
      : { label: 'Archive', icon: Archive, onSelect: archive },
    // An archived note is never reviewed, so "comes back in today's review" would not be true.
    { label: 'I made this mistake again', icon: Repeat, onSelect: seenAgain, disabled: note.is_archived },
    'separator',
    { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: remove },
  ]

  return (
    <article aria-labelledby="note-title" className="mx-auto max-w-[1040px]">
      <h1 id="note-title" className="sr-only">
        {`Note: ${plainText(note.upgraded_text)}`}
      </h1>

      <div className="mb-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={from}
            onClick={onBack}
            className="-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-sm px-1.5 text-small text-graphite transition-colors duration-150 hover:text-ink max-sm:min-h-11"
          >
            <ArrowLeft className="size-4" strokeWidth={ICON_STROKE} aria-hidden="true" />
            {backLabel(nav)}
          </Link>
          {index >= 0 && ids.length > 1 && !editing ? (
            <div className="flex items-center gap-1 border-l border-line pl-3">
              <IconButton icon={ChevronLeft} label="Previous note" size="sm" tooltip disabled={!prevId} onClick={() => goTo(prevId)} />
              <span className="min-w-12 text-center text-meta text-graphite tabular-nums">
                {index + 1} of {ids.length}
              </span>
              <IconButton icon={ChevronRight} label="Next note" size="sm" tooltip disabled={!nextId} onClick={() => goTo(nextId)} />
            </div>
          ) : null}
        </div>

        {editing ? null : (
          // ml-auto: on a phone with ‹ › controls the actions wrap to a second row and stay on the right.
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <FavoriteStar active={note.is_favorite} onToggle={toggleMustRemember} label="Must Remember" />
            <Button ref={editButton} size="sm" icon={Pencil} kbd="E" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Menu aria-label="Note actions" items={menuItems} trigger={<IconButton icon={Ellipsis} label="More actions" size="sm" />} />
          </div>
        )}
      </div>

      {note.is_archived ? (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-line py-3">
          <p className="flex items-center gap-2 text-small text-graphite">
            <Archive className="size-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
            This note is archived. It is hidden from review.
          </p>
          <Button size="sm" icon={ArchiveRestore} onClick={restore}>
            Restore
          </Button>
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,760px)_240px] lg:grid-rows-[auto_1fr] lg:justify-between lg:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {editing ? (
            <NoteEditForm
              note={note}
              onDone={(updated) => {
                if (updated) setSaved(updated)
                setEditing(false)
              }}
              onDirtyChange={onDirtyChange}
            />
          ) : (
            <NoteBody note={note} from={location.pathname} />
          )}
        </div>
        <NoteMeta
          note={note}
          onMasteryChange={changeMastery}
          className="mt-12 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start"
        />
        <ReviewHistory noteId={note.id} className="mt-14 lg:col-start-1 lg:row-start-2" />
      </div>
    </article>
  )
}
