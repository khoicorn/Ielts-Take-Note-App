import { CornerDownLeft, FileText, Plus, Search, X } from 'lucide-react'
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { ModeMark } from '@/components/notes/ModeMark'
import { NOTE_LABEL, NotePair } from '@/components/notes/NotePair'
import { Button } from '@/components/ui/Button'
import { ACTIVE_OPTION, cn, WRAP } from '@/components/ui/cn'
import { Dialog } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { ICON_STROKE } from '@/components/ui/icons'
import { Kbd } from '@/components/ui/Kbd'
import { MasteryMark } from '@/components/ui/MasteryMark'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { useNotes, useParagraphs } from '@/lib/hooks'
import { Markdown } from '@/lib/markdown'
import { searchAll } from '@/lib/search'
import type { SearchField, SearchHit } from '@/lib/search'
import { FIELD_LABELS, taskTypeLabel } from '@/lib/taxonomy'
import { plainText } from '@/lib/text'
import type { Note, Paragraph } from '@/lib/types'

export interface SearchPaletteProps {
  open: boolean
  initialQuery: string
  onClose: () => void
}

const DEBOUNCE_MS = 80
const RESULT_LIMIT = 30
const RECENT_COUNT = 5
/** Longer queries are shortened inside the "Save as a new note" button, so it never overflows. */
const BUTTON_QUERY_MAX = 28

type NoteHit = Extract<SearchHit, { kind: 'note' }>
type ParagraphHit = Extract<SearchHit, { kind: 'paragraph' }>

type Entry =
  | { kind: 'note'; note: Note; hit?: NoteHit }
  | { kind: 'paragraph'; paragraph: Paragraph; hit: ParagraphHit }

interface Group {
  key: string
  title: string
  count?: number
  entries: Entry[]
}

/**
 * Global search (brief §30, design §8). A top-aligned dialog with one large input.
 * Results update as you type, grouped into notes and model paragraphs, with matches highlighted.
 * ↑ ↓ move, Enter opens, Esc closes. Focus stays in the input (listbox with aria-activedescendant).
 */
export function SearchPalette(props: SearchPaletteProps): React.JSX.Element | null {
  const { open, initialQuery, onClose } = props
  const inputRef = useRef<HTMLInputElement>(null)
  // A fresh body (empty query, first row active) every time the palette opens.
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSession((s) => s + 1)
  }

  // The Dialog renders its children only while open or fading out, so the live queries below stop when closed.
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Search notes"
      hideTitle
      size="md"
      placement="top"
      initialFocusRef={inputRef}
      bodyClassName="flex flex-col p-0! overflow-hidden!"
    >
      <PaletteBody key={session} inputRef={inputRef} initialQuery={initialQuery} onClose={onClose} />
    </Dialog>
  )
}

function PaletteBody(props: {
  inputRef: React.RefObject<HTMLInputElement | null>
  initialQuery: string
  onClose: () => void
}): React.JSX.Element {
  const { inputRef, initialQuery, onClose } = props
  const navigate = useNavigate()
  const quickAdd = useQuickAdd()
  const notes = useNotes()
  const paragraphs = useParagraphs()
  const baseId = useId()
  const listId = `${baseId}-list`
  const optionId = (i: number) => `${baseId}-option-${i}`

  const [query, setQuery] = useState(initialQuery)
  const [searched, setSearched] = useState(initialQuery.trim())
  useEffect(() => {
    const t = window.setTimeout(() => setSearched(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  const loading = notes === undefined || paragraphs === undefined

  const groups = useMemo<Group[]>(() => {
    if (!notes || !paragraphs) return []
    if (!searched) {
      const recent = notes.slice(0, RECENT_COUNT).map((note): Entry => ({ kind: 'note', note }))
      return recent.length ? [{ key: 'recent', title: 'Recent notes', entries: recent }] : []
    }
    const hits = searchAll(searched, notes, paragraphs, RESULT_LIMIT)
    const noteEntries: Entry[] = []
    const paragraphEntries: Entry[] = []
    for (const hit of hits) {
      if (hit.kind === 'note') noteEntries.push({ kind: 'note', note: hit.note, hit })
      else paragraphEntries.push({ kind: 'paragraph', paragraph: hit.paragraph, hit })
    }
    const out: Group[] = []
    if (noteEntries.length) out.push({ key: 'notes', title: 'Notes', count: noteEntries.length, entries: noteEntries })
    if (paragraphEntries.length) {
      out.push({ key: 'paragraphs', title: 'Model paragraphs', count: paragraphEntries.length, entries: paragraphEntries })
    }
    return out
  }, [notes, paragraphs, searched])

  const entries = useMemo(() => groups.flatMap((g) => g.entries), [groups])

  // The first row is active again whenever the typed text changes. This follows the text, not the 80ms debounced
  // search, so an arrow key pressed right after typing still counts when the new results arrive.
  const [active, setActive] = useState(0)
  const [activeFor, setActiveFor] = useState(query)
  if (activeFor !== query) {
    setActiveFor(query)
    setActive(0)
  }
  const activeIndex = entries.length ? Math.min(active, entries.length - 1) : -1

  // Keep the active row visible when it moves by keyboard.
  const movedByKey = useRef(false)
  useEffect(() => {
    if (!movedByKey.current || activeIndex < 0) return
    movedByKey.current = false
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' })
    // optionId is derived from a stable id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  const openEntry = (entry: Entry) => {
    const to = entry.kind === 'note' ? `/notes/${entry.note.id}` : `/writing/paragraphs/${entry.paragraph.id}`
    onClose()
    navigate(to)
  }

  const saveAsNote = () => {
    const text = searched
    onClose()
    // Open Quick Add after the palette has handed focus back, so closing Quick Add returns focus there too.
    window.setTimeout(() => quickAdd.open({ prefill: { upgraded_text: text } }), 0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!entries.length) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      movedByKey.current = true
      setActive((activeIndex + step + entries.length) % entries.length)
    } else if (e.key === 'Enter') {
      const entry = entries[activeIndex]
      if (!entry) return
      e.preventDefault()
      openEntry(entry)
    }
  }

  const noResults = !loading && searched !== '' && entries.length === 0
  const resultCount = searched && !loading ? entries.length : null
  const countText = resultCount === null ? '' : resultCount === 1 ? '1 result' : `${resultCount} results`

  let index = 0
  return (
    <>
      {/* The input has no box, so its focus shows on the bar's bottom line. */}
      <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line pr-3 pl-5 transition-colors duration-150 has-[input:focus-visible]:border-indigo/60 max-sm:pt-[env(safe-area-inset-top)] max-sm:pr-2 max-sm:pl-4">
        <Search className="size-5 shrink-0 text-graphite" strokeWidth={ICON_STROKE} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search notes"
          aria-expanded={entries.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          placeholder="Search mistakes, upgrades, patterns, topics…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-16 min-w-0 flex-1 bg-transparent text-note text-ink outline-hidden placeholder:text-graphite"
        />
        {query ? (
          <IconButton
            icon={X}
            label="Clear search"
            size="sm"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          />
        ) : null}
        <Button variant="ghost" size="sm" className="sm:hidden" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-2 pb-3 [&_mark]:text-ink">
        {/* Search tips only when there is something to search. */}
        {!searched && !loading && notes.length + paragraphs.length > 0 ? (
          <p className="px-3 pt-1.5 pb-2 text-small text-graphite">Try: stable · visitors to · Travel</p>
        ) : null}

        <div id={listId} role="listbox" aria-label="Results">
          {groups.map((group, g) => {
            const headId = `${baseId}-group-${group.key}`
            return (
              <div
                key={group.key}
                role="group"
                aria-labelledby={headId}
                className={cn(g > 0 && 'mt-2 border-t border-line pt-2')}
              >
                <p id={headId} className={cn(NOTE_LABEL, 'flex items-baseline gap-2 px-3 pt-2 pb-1.5')}>
                  <span>{group.title}</span>
                  {group.count !== undefined ? (
                    <span className="font-normal tracking-normal tabular-nums">{group.count}</span>
                  ) : null}
                </p>
                {group.entries.map((entry) => {
                  const i = index++
                  const isActive = i === activeIndex
                  return (
                    <div
                      key={entry.kind === 'note' ? entry.note.id : entry.paragraph.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => {
                        if (!isActive) setActive(i)
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => openEntry(entry)}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-sm px-3 pt-2.5 pb-[11px] transition-colors duration-150',
                        isActive && ACTIVE_OPTION,
                      )}
                    >
                      {entry.kind === 'note' ? (
                        <NoteResult note={entry.note} hit={entry.hit} query={searched} />
                      ) : (
                        <ParagraphResult paragraph={entry.paragraph} hit={entry.hit} query={searched} />
                      )}
                      <span className="flex w-4 shrink-0 self-center text-graphite" aria-hidden="true">
                        {isActive ? <CornerDownLeft className="size-4" strokeWidth={ICON_STROKE} /> : null}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {!searched && !loading && entries.length === 0 ? (
          <p className="px-3 py-4 text-body text-graphite">No notes yet. Saved notes appear here.</p>
        ) : null}

        {noResults ? (
          <div className="px-3 pt-4 pb-3">
            <p className={cn('text-body text-ink', WRAP)}>No notes match “{searched}”.</p>
            <Button
              className="mt-4"
              icon={Plus}
              onClick={saveAsNote}
              aria-label={shorten(searched) === searched ? undefined : `Save “${searched}” as a new note`}
            >
              Save “{shorten(searched)}” as a new note
            </Button>
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {countText}
      </p>

      <div className="hidden shrink-0 items-center gap-5 border-t border-line px-5 py-3 sm:flex">
        <span className="inline-flex items-center gap-1.5 text-meta text-graphite">
          <span className="inline-flex gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </span>
          to move
        </span>
        <span className="inline-flex items-center gap-1.5 text-meta text-graphite">
          <Kbd>Enter</Kbd>
          to open
        </span>
        <span className="inline-flex items-center gap-1.5 text-meta text-graphite">
          <Kbd>Esc</Kbd>
          to close
        </span>
        {countText ? (
          <span className="ml-auto text-meta text-graphite tabular-nums" aria-hidden="true">
            {countText}
          </span>
        ) : null}
      </div>
    </>
  )
}

function shorten(s: string): string {
  return s.length > BUTTON_QUERY_MAX ? `${s.slice(0, BUTTON_QUERY_MAX - 1).trimEnd()}…` : s
}

function Dot(): React.JSX.Element {
  return <span aria-hidden="true">·</span>
}

/** The label for a matched field that the row does not already show (mistake, upgrade and topic are always shown). */
function fieldLabel(field: SearchField, note: Note): string | null {
  const labels = FIELD_LABELS[note.mode]
  switch (field) {
    case 'example_sentence':
      return labels.example
    case 'explanation':
      return labels.explanation
    case 'reusable_pattern':
      return labels.pattern
    case 'error_pattern':
      return 'Mistake pattern'
    case 'fix_pattern':
      return 'Fix pattern'
    case 'tags':
      return 'Tags'
    case 'subtopic':
      return 'Subtopic'
    case 'model_paragraph':
      return 'Model paragraph'
    default:
      return null
  }
}

/** Mistake and upgrade (brief §18), the matched field when it is another one, then Mode · Topic · Mastery. */
function NoteResult(props: { note: Note; hit?: NoteHit; query: string }): React.JSX.Element {
  const { note, hit, query } = props
  const topic = note.topic.trim()
  const label = hit ? fieldLabel(hit.field, note) : null
  const extra = hit && label ? (hit.field === 'tags' ? note.tags.join(', ') : hit.snippet) : ''
  return (
    <div className="min-w-0 flex-1">
      <NotePair note={note} size="compact" highlight={query || undefined} />
      {label && extra ? (
        <p className={cn('mt-1 line-clamp-2 text-small text-graphite', WRAP)}>
          <span className={cn(NOTE_LABEL, 'mr-2')}>{label}</span>
          <Markdown text={extra} inline highlight={query} />
        </p>
      ) : null}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-small text-graphite">
        <ModeMark mode={note.mode} />
        {topic ? (
          <>
            <Dot />
            <span className={cn('min-w-0', WRAP)}>
              <VisuallyHidden>Topic: </VisuallyHidden>
              <Markdown text={topic} inline highlight={query || undefined} />
            </span>
          </>
        ) : null}
        <Dot />
        <MasteryMark status={note.mastery_status} />
      </p>
    </div>
  )
}

/** Serif title, a short snippet around the match, then Task · Chart or essay type · Topic. */
function ParagraphResult(props: { paragraph: Paragraph; hit: ParagraphHit; query: string }): React.JSX.Element {
  const { paragraph, hit, query } = props
  const title = paragraph.title.trim() || 'Untitled paragraph'
  const snippet = hit.field === 'body' ? hit.snippet : plainText(paragraph.body).replace(/\s+/g, ' ').trim()
  const meta = [taskTypeLabel(paragraph.task_type), paragraph.task_genre.trim(), paragraph.topic.trim()].filter(Boolean)
  return (
    <>
      <FileText className="mt-1 size-4 shrink-0 text-graphite" strokeWidth={ICON_STROKE} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn('font-serif text-note text-ink', WRAP)}>
          <Markdown text={title} inline highlight={query} />
        </p>
        {snippet ? (
          <p className={cn('mt-0.5 line-clamp-2 text-small text-graphite', WRAP)}>
            <Markdown text={snippet} inline highlight={query} />
          </p>
        ) : null}
        {meta.length ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-meta text-graphite">
            {meta.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <Dot /> : null}
                <span>{m}</span>
              </React.Fragment>
            ))}
          </p>
        ) : null}
      </div>
    </>
  )
}
