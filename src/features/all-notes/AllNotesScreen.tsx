import { ArchiveRestore, ArrowLeft, Filter, List, Plus, Rows2 } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { countActiveFilters, filterFromSearchParams, filterToSearchParams, sortNotes } from '@/lib/filters'
import type { SortKey } from '@/lib/filters'
import { useNotes } from '@/lib/hooks'
import { archiveNote, restoreNote } from '@/lib/repo'
import { searchAll } from '@/lib/search'
import { plainText } from '@/lib/text'
import type { Note, NoteFilter } from '@/lib/types'
import { NoteRow } from '@/components/notes/NoteRow'
import { Button } from '@/components/ui/Button'
import { TITLE_INITIAL } from '@/components/ui/candlelit'
import { cn } from '@/components/ui/cn'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ICON_STROKE } from '@/components/ui/icons'
import { Popover } from '@/components/ui/Popover'
import { SegmentedControl } from '@/components/ui/Tabs'
import { Tag } from '@/components/ui/Tag'
import { useToast } from '@/components/ui/Toast'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { FilterFields, FilterPopoverPanel, MatchCount } from './FilterPanel'
import { keepFocusAfterRemoval } from './focusAfterRemove'
import type { ArchiveInfo } from './FilterPanel'
import { clearFilters, filterTags, parseSort, SORT_OPTIONS } from './filterTags'
import { modeOrTask, plural } from './notebook'
import { NotebookRow } from './NotebookRow'
import { NotesTable } from './NotesTable'
import { ListFilterInput, SmallSelect } from './ToolbarControls'
import { DESKTOP_QUERY, LIST_VIEWS, MOBILE_QUERY, useMediaQuery, useStoredChoice } from './uiState'
import type { ListView } from './uiState'
import { useRowKeys } from './useRowKeys'

const PAGE_SIZE = 100
export const ALL_NOTES_VIEW_KEY = 'ielts-all-notes-view'

/** searchAll skips archived notes, so the archive view searches copies marked as active. */
function searchIds(query: string, notes: Note[]): Set<string> {
  const pool = notes.map((n) => (n.is_archived ? { ...n, is_archived: false } : n))
  return new Set(searchAll(query, pool, [], pool.length).flatMap((h) => (h.kind === 'note' ? [h.note.id] : [])))
}

/** Filter button with the number of active filters (mockup 14). */
function FilterButton(props: { count: number } & React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  const { count, className, ...rest } = props
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-line-strong bg-paper px-3 text-small text-ink transition-colors duration-150 hover:bg-stone/60 max-sm:min-h-11',
        'aria-expanded:bg-stone/60',
        className,
      )}
      {...rest}
    >
      <Filter className="size-3.5 text-graphite" strokeWidth={ICON_STROKE} aria-hidden="true" />
      Filter
      {count > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="ml-0.5 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-fill px-1 text-meta leading-none font-medium text-on-accent tabular-nums"
          >
            {count}
          </span>
          <VisuallyHidden>{`, ${count} active`}</VisuallyHidden>
        </>
      ) : null}
    </button>
  )
}

function TitleLine(props: { title: string; count: number | undefined }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
      <h1 className={cn('font-serif text-title font-normal tracking-[-0.01em] text-ink', TITLE_INITIAL)}>{props.title}</h1>
      {props.count ? (
        <span className="text-body text-graphite tabular-nums">{plural(props.count, 'note')}</span>
      ) : null}
    </div>
  )
}

/**
 * All Notes (brief §31–32, mockups 14 and 14b). Filters, the list filter text and the sort live in the URL;
 * the Compact / Reading choice is remembered in this browser. `?archived=1` shows the archive with Restore buttons.
 */
export function AllNotesScreen(): React.JSX.Element {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const quickAdd = useQuickAdd()
  const toast = useToast()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const mobile = useMediaQuery(MOBILE_QUERY)
  const [view, setView] = useStoredChoice<ListView>(ALL_NOTES_VIEW_KEY, LIST_VIEWS, 'compact')
  const [filterOpen, setFilterOpen] = useState(false)

  const filter = useMemo(() => filterFromSearchParams(params), [params])
  const query = params.get('q') ?? ''
  const sort = parseSort(params.get('sort'))
  const inArchive = Boolean(filter.archived)
  const activeCount = countActiveFilters(filter)
  const tags = filterTags(filter)

  const matching = useNotes(filter)
  const active = useNotes()
  const archived = useNotes({ archived: true })
  // The notes of the current view before any filter: the "of 32" total and the empty check.
  const base = inArchive ? archived : active
  const archivedCount = archived?.length
  // `matching` changes whenever the data does, so "now" stays fresh for due dates.
  const now = useMemo(() => new Date(), [matching])

  const visible = useMemo(() => {
    if (!matching) return undefined
    const q = query.trim()
    const found = q ? searchIds(q, matching) : null
    return sortNotes(found ? matching.filter((n) => found.has(n.id)) : matching, sort)
  }, [matching, query, sort])

  // Paging: 100 rows, then 100 more. Starts over when the filters, text or sort change.
  const listKey = params.toString()
  const [limit, setLimit] = useState({ key: listKey, n: PAGE_SIZE })
  const shown = limit.key === listKey ? limit.n : PAGE_SIZE
  const rows = visible?.slice(0, shown)
  const remaining = (visible?.length ?? 0) - (rows?.length ?? 0)

  const listRef = useRef<HTMLUListElement>(null)
  const { onKeyDown } = useRowKeys(listRef, !filterOpen)

  // Leaving or entering the archive closes the panel.
  useEffect(() => setFilterOpen(false), [inArchive])

  const update = (patch: (sp: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    patch(next)
    setParams(next, { replace: true })
  }
  const setFilter = (f: NoteFilter) => setParams(filterToSearchParams(f, params), { replace: true })
  const setQuery = (q: string) => update((sp) => (q ? sp.set('q', q) : sp.delete('q')))
  const setSort = (s: SortKey) => update((sp) => (s === 'created_desc' ? sp.delete('sort') : sp.set('sort', s)))
  // Clearing keeps the sort, the list text and the archive view.
  const clearAll = () => setParams(filterToSearchParams(clearFilters(filter), params), { replace: true })
  const clearEverything = () => {
    const next = filterToSearchParams(clearFilters(filter), params)
    next.delete('q')
    setParams(next, { replace: true })
  }

  const from = location.pathname + location.search
  const ids = useMemo(() => visible?.map((n) => n.id) ?? [], [visible])
  const linkState = () => ({ ids, from })

  const restore = async (note: Note) => {
    // The row leaves the archive list, so focus moves to the next row (or the title).
    const refocus = keepFocusAfterRemoval('[data-view] > li')
    await restoreNote(note.id)
    refocus()
    toast.show('Note restored.', { action: { label: 'Undo', onClick: () => void archiveNote(note.id) } })
  }

  const archive: ArchiveInfo = { count: archivedCount, inArchive, onNavigate: () => setFilterOpen(false) }
  const filtering = activeCount > 0 || query.trim() !== ''
  const empty = base !== undefined && base.length === 0
  const title = inArchive ? 'Archived notes' : 'All Notes'

  const filterButton = <FilterButton count={activeCount} onClick={mobile ? () => setFilterOpen(true) : undefined} />
  const sortSelect = <SmallSelect label="Sort" value={sort} onChange={setSort} options={SORT_OPTIONS} fill={mobile} />

  // Desktop and tablet: one line (mockup 14). Under 640px: the list filter and Filter, then Sort and the view.
  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2 max-sm:basis-full">
        <ListFilterInput value={query} onChange={setQuery} className="w-full max-w-[17.5rem] max-sm:max-w-none" />
        {mobile ? filterButton : sortSelect}
      </div>
      <div className="flex items-center gap-2 max-sm:w-full">
        {mobile ? sortSelect : null}
        {/* No icons under 640px, so Sort and the view fit on one line at 390px. */}
        <SegmentedControl<ListView>
          aria-label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'compact', label: 'Compact', icon: mobile ? undefined : List },
            { value: 'reading', label: 'Reading', icon: mobile ? undefined : Rows2 },
          ]}
        />
        {mobile ? null : (
          <Popover
            open={filterOpen}
            onOpenChange={setFilterOpen}
            trigger={filterButton}
            align="end"
            aria-label="Filter notes"
            preferredHeight={640}
            className="w-[32rem] max-w-[calc(100vw-2rem)] p-0"
          >
            <FilterPopoverPanel
              filter={filter}
              onChange={setFilter}
              onClear={clearAll}
              activeCount={activeCount}
              match={visible?.length}
              total={base?.length}
              onDone={() => setFilterOpen(false)}
              archive={archive}
            />
          </Popover>
        )}
      </div>
    </div>
  )

  let list: React.ReactNode
  if (rows === undefined) {
    list = <div className="min-h-[40vh]" aria-busy="true" />
  } else if (empty && !inArchive) {
    list = (
      <EmptyState
        decoration="quill"
        title="No notes yet"
        body="Save the phrases you wish you had used."
        action={
          <Button variant="primary" icon={Plus} kbd="N" onClick={() => quickAdd.open()}>
            Add first note
          </Button>
        }
      />
    )
  } else if (empty) {
    list = (
      <EmptyState
        decoration="book"
        title="No archived notes"
        body="Archived notes are kept here, out of review. Archive a note from its page."
        action={
          <Link
            to="/notes"
            className="inline-flex min-h-8 items-center rounded-xs text-small text-indigo underline-offset-4 hover:underline max-sm:min-h-11"
          >
            Back to All Notes
          </Link>
        }
      />
    )
  } else if (rows.length === 0) {
    const text = query.trim()
    // Only the list filter text is set: talk about the text, not about filters.
    const textOnly = activeCount === 0 && text !== ''
    list = (
      <EmptyState
        title={textOnly ? `No notes match “${text}”.` : 'No notes match these filters.'}
        body={
          textOnly
            ? 'Check the spelling or try one word.'
            : text
              ? `Nothing matches “${text}” with the current filters.`
              : 'Change or clear the filters to see more notes.'
        }
        action={
          <Button variant="secondary" onClick={clearEverything}>
            {textOnly ? 'Clear search' : 'Clear filters'}
          </Button>
        }
      />
    )
  } else {
    const trailing = (n: Note) =>
      inArchive ? (
        <Button
          variant="secondary"
          size="sm"
          icon={ArchiveRestore}
          aria-label={`Restore: ${plainText(n.upgraded_text).trim()}`}
          onClick={() => void restore(n)}
        >
          Restore
        </Button>
      ) : undefined
    if (view === 'compact' && desktop && !inArchive) {
      list = <NotesTable ref={listRef} notes={rows} sort={sort} linkState={linkState} highlight={query} now={now} onKeyDown={onKeyDown} />
    } else if (view === 'reading') {
      list = (
        <ul ref={listRef} aria-label="Notes" data-view="reading" onKeyDown={onKeyDown}>
          {rows.map((n) => (
            <NotebookRow
              key={n.id}
              note={n}
              to={`/notes/${n.id}`}
              linkState={linkState()}
              highlight={query}
              label={n.topic}
              sublabel={modeOrTask(n)}
              now={now}
              trailing={trailing(n)}
            />
          ))}
        </ul>
      )
    } else {
      list = (
        <ul ref={listRef} aria-label="Notes" data-view="compact" onKeyDown={onKeyDown}>
          {rows.map((n) => (
            <li key={n.id}>
              <NoteRow note={n} view="compact" to={`/notes/${n.id}`} linkState={linkState()} highlight={query} trailing={trailing(n)} />
            </li>
          ))}
        </ul>
      )
    }
  }

  return (
    <div className="mx-auto max-w-[1040px]">
      <header className="mb-7 sm:mb-8">
        {inArchive ? (
          <Link
            to="/notes"
            className="mb-3 inline-flex min-h-8 items-center gap-1.5 rounded-sm text-small text-graphite transition-colors duration-150 hover:text-ink max-sm:min-h-11"
          >
            <ArrowLeft className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
            All Notes
          </Link>
        ) : null}
        <TitleLine title={title} count={base?.length} />
        {inArchive ? (
          <p className="mt-2 max-w-[62ch] text-body text-graphite">Archived notes are hidden from review. Restore a note to bring it back.</p>
        ) : null}
      </header>

      {empty && !inArchive ? null : toolbar}

      {filtering && !empty ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-small text-graphite">
          <span className="mr-1 text-ink tabular-nums" aria-live="polite">
            {visible ? `${visible.length} of ${base?.length ?? visible.length}` : ''}
          </span>
          {tags.map((t) => (
            <Tag key={t.key} title={t.prefix ? `${t.prefix}: ${t.value}` : t.value} onRemove={() => setFilter(t.remove(filter))}>
              {t.prefix ? <span className="text-graphite">{t.prefix}: </span> : null}
              <span className="text-ink">{t.value}</span>
            </Tag>
          ))}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 inline-flex min-h-8 cursor-pointer items-center rounded-xs text-small text-graphite underline-offset-4 hover:text-ink hover:underline max-sm:min-h-11"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={cn(empty && !inArchive ? 'mt-4' : 'mt-5')}>{list}</div>

      {remaining > 0 ? (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={() => setLimit({ key: listKey, n: shown + PAGE_SIZE })}>
            {`Show ${Math.min(PAGE_SIZE, remaining)} more`}
          </Button>
        </div>
      ) : null}

      {mobile ? (
        <Dialog
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Filter notes"
          size="md"
          bodyClassName="p-0"
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              <MatchCount match={visible?.length} total={base?.length} />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={activeCount === 0}>
                  Clear all
                </Button>
                <Button variant="primary" size="sm" onClick={() => setFilterOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          }
        >
          <FilterFields filter={filter} onChange={setFilter} stacked archive={archive} />
        </Dialog>
      ) : null}
    </div>
  )
}
