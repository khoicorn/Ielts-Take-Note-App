import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { db } from '@/lib/db'
import { useNotes, useParagraphs } from '@/lib/hooks'
import { toggleFavorite, updateNote, updateParagraph } from '@/lib/repo'
import type { Mode, Note, Paragraph } from '@/lib/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { READING_PAGE as PAGE } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/EmptyState'
import { FavoriteStar } from '@/components/ui/FavoriteStar'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { UnderlineTabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { keepFocusAfterRemoval } from '@/features/all-notes/focusAfterRemove'
import { plural } from '@/features/all-notes/notebook'
import { EssentialNote } from './EssentialNote'
import { ParagraphEntry } from './ParagraphEntry'

const EMPTY_BODY = 'Open a note and choose Must Remember to keep it here.'
/** Each note or paragraph on the page (EssentialNote, ParagraphEntry). */
const ENTRY = '[data-entry]'

type Tab = 'all' | Mode

function parseTab(v: string | null): Tab {
  return v === 'speaking' || v === 'writing' ? v : 'all'
}

/** "5 notes and 1 model paragraph." */
function contents(notes: number, paragraphs: number): string {
  const parts = [notes ? plural(notes, 'note') : '', paragraphs ? plural(paragraphs, 'model paragraph') : ''].filter(Boolean)
  return parts.join(' and ')
}

/**
 * Must Remember, the Essential Notes (brief §29, mockup 17): notes marked with the gold ribbon in a calm
 * reading layout, then marked model paragraphs. Removing the ribbon takes an item off the page, with Undo.
 */
export function MustRememberScreen(): React.JSX.Element {
  const [params] = useSearchParams()
  const location = useLocation()
  const toast = useToast()
  const tab = parseTab(params.get('mode'))
  const notes = useNotes({ favorite: true })
  const paragraphs = useParagraphs()
  // With an empty notebook, the empty state offers the first note instead of an empty All Notes.
  const activeNotes = useLiveQuery(() => db.notes.filter((n) => !n.is_archived).count(), [])
  const quickAdd = useQuickAdd()
  // `notes` changes whenever the data does, so "now" stays fresh for due dates.
  const now = useMemo(() => new Date(), [notes])

  const marked = useMemo(() => paragraphs?.filter((p) => p.is_favorite) ?? [], [paragraphs])
  const speaking = notes?.filter((n) => n.mode === 'speaking') ?? []
  const writing = notes?.filter((n) => n.mode === 'writing') ?? []
  const shownNotes = tab === 'all' ? (notes ?? []) : tab === 'speaking' ? speaking : writing
  const shownParagraphs = tab === 'speaking' ? [] : marked
  const loading = notes === undefined || paragraphs === undefined || activeNotes === undefined
  const nothing = !loading && notes.length === 0 && marked.length === 0
  const linkState = { ids: shownNotes.map((n) => n.id), from: location.pathname + location.search }

  // The item leaves the page, so keyboard focus moves to the next item (or the title).
  const unmarkNote = async (note: Note) => {
    const refocus = keepFocusAfterRemoval(ENTRY)
    await toggleFavorite(note.id)
    refocus()
    toast.show('Removed from Must Remember.', {
      action: { label: 'Undo', onClick: () => void updateNote(note.id, { is_favorite: true }) },
    })
  }
  const unmarkParagraph = async (p: Paragraph) => {
    const refocus = keepFocusAfterRemoval(ENTRY)
    await updateParagraph(p.id, { is_favorite: false })
    refocus()
    toast.show('Removed from Must Remember.', {
      action: { label: 'Undo', onClick: () => void updateParagraph(p.id, { is_favorite: true }) },
    })
  }

  const tabs = (
    <UnderlineTabs
      aria-label="Must Remember sections"
      value={tab}
      items={[
        { value: 'all', label: 'All', to: '/must-remember', count: (notes?.length ?? 0) + marked.length },
        { value: 'speaking', label: 'Speaking', to: '/must-remember?mode=speaking', count: speaking.length },
        { value: 'writing', label: 'Writing', to: '/must-remember?mode=writing', count: writing.length + marked.length },
      ]}
    />
  )

  let body: React.ReactNode
  if (loading) {
    body = <div className="min-h-[40vh]" aria-busy="true" />
  } else if (nothing) {
    body = (
      <EmptyState
        decoration="book"
        title="Nothing marked yet"
        body={EMPTY_BODY}
        action={
          activeNotes === 0 ? (
            <Button variant="primary" icon={Plus} onClick={() => quickAdd.open()}>
              Add first note
            </Button>
          ) : (
            <ButtonLink to="/notes" variant="secondary">
              Open All Notes
            </ButtonLink>
          )
        }
      />
    )
  } else if (shownNotes.length === 0 && shownParagraphs.length === 0) {
    body = <EmptyState title={`No ${tab === 'speaking' ? 'Speaking' : 'Writing'} notes marked yet`} body={EMPTY_BODY} />
  } else {
    body = (
      <>
        {shownNotes.length > 0 ? (
          <div className="mt-2">
            {shownNotes.map((n) => (
              <EssentialNote
                key={n.id}
                note={n}
                now={now}
                linkState={linkState}
                ribbon={<FavoriteStar active onToggle={() => void unmarkNote(n)} />}
              />
            ))}
          </div>
        ) : null}
        {shownParagraphs.length > 0 ? (
          <Section
            id="model-paragraphs"
            title="Model paragraphs"
            className={shownNotes.length > 0 ? 'mt-16' : 'mt-4'}
            action={<span className="text-graphite tabular-nums">{plural(shownParagraphs.length, 'paragraph')}</span>}
          >
            {shownParagraphs.map((p) => (
              <ParagraphEntry
                key={p.id}
                paragraph={p}
                ribbon={<FavoriteStar active onToggle={() => void unmarkParagraph(p)} />}
              />
            ))}
          </Section>
        ) : null}
      </>
    )
  }

  return (
    <div className={PAGE}>
      <PageHeader
        eyebrow="Essential Notes"
        mark
        title="Must Remember"
        description={
          loading || nothing ? undefined : `The phrases and patterns worth keeping close. ${contents(notes.length, marked.length)}.`
        }
        className={nothing ? undefined : 'mb-0 sm:mb-0'}
      >
        {loading || nothing ? undefined : tabs}
      </PageHeader>
      {body}
    </div>
  )
}
