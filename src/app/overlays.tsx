import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { QuickAddDialog } from '@/features/quick-add/QuickAddDialog'
import { SearchPalette } from '@/features/search/SearchPalette'
import type { Mode, Note, NoteDraft } from '@/lib/types'
import { ShortcutsDialog } from './ShortcutsDialog'

export interface QuickAddOptions {
  /** Skip the Speaking/Writing choice. */
  mode?: Mode
  prefill?: Partial<NoteDraft>
  sourceParagraphId?: string
  /** Dialog title override, e.g. "New note from paragraph". */
  title?: string
  onSaved?: (note: Note) => void
}

interface QuickAddApi {
  open: (opts?: QuickAddOptions) => void
  close: () => void
  isOpen: boolean
}
interface SearchApi {
  open: (initialQuery?: string) => void
  close: () => void
  isOpen: boolean
}
interface ShortcutsApi {
  open: () => void
}

const QuickAddContext = createContext<QuickAddApi | null>(null)
const SearchContext = createContext<SearchApi | null>(null)
const ShortcutsContext = createContext<ShortcutsApi | null>(null)

/**
 * Owns the app-wide overlays. QuickAddDialog, SearchPalette and the shortcut list are always rendered;
 * each returns null while closed.
 */
export function OverlayProvider(props: { children: React.ReactNode }): React.JSX.Element {
  const [quickAdd, setQuickAdd] = useState<{ open: boolean; options: QuickAddOptions }>({ open: false, options: {} })
  const [search, setSearch] = useState<{ open: boolean; initialQuery: string }>({ open: false, initialQuery: '' })
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const openQuickAdd = useCallback((opts?: QuickAddOptions) => {
    setSearch((s) => (s.open ? { ...s, open: false } : s))
    setShortcutsOpen(false)
    setQuickAdd({ open: true, options: opts ?? {} })
  }, [])
  const closeQuickAdd = useCallback(() => setQuickAdd((s) => ({ ...s, open: false })), [])

  const openSearch = useCallback((initialQuery?: string) => {
    setShortcutsOpen(false)
    setSearch({ open: true, initialQuery: initialQuery ?? '' })
  }, [])
  const closeSearch = useCallback(() => setSearch((s) => ({ ...s, open: false })), [])

  const quickAddApi = useMemo<QuickAddApi>(
    () => ({ open: openQuickAdd, close: closeQuickAdd, isOpen: quickAdd.open }),
    [openQuickAdd, closeQuickAdd, quickAdd.open],
  )
  const searchApi = useMemo<SearchApi>(
    () => ({ open: openSearch, close: closeSearch, isOpen: search.open }),
    [openSearch, closeSearch, search.open],
  )
  const shortcutsApi = useMemo<ShortcutsApi>(() => ({ open: () => setShortcutsOpen(true) }), [])

  return (
    <QuickAddContext.Provider value={quickAddApi}>
      <SearchContext.Provider value={searchApi}>
        <ShortcutsContext.Provider value={shortcutsApi}>
          {props.children}
          <QuickAddDialog open={quickAdd.open} options={quickAdd.options} onClose={closeQuickAdd} />
          <SearchPalette open={search.open} initialQuery={search.initialQuery} onClose={closeSearch} />
          <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </ShortcutsContext.Provider>
      </SearchContext.Provider>
    </QuickAddContext.Provider>
  )
}

function need<T>(v: T | null, name: string): T {
  if (!v) throw new Error(`${name} must be used inside <OverlayProvider>.`)
  return v
}

export function useQuickAdd(): QuickAddApi {
  return need(useContext(QuickAddContext), 'useQuickAdd')
}

export function useSearch(): SearchApi {
  return need(useContext(SearchContext), 'useSearch')
}

export function useShortcutsHelp(): ShortcutsApi {
  return need(useContext(ShortcutsContext), 'useShortcutsHelp')
}
