import { LucideProvider } from 'lucide-react'
import type React from 'react'
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ICON_STROKE } from '@/components/ui/icons'
import { ToastProvider } from '@/components/ui/Toast'
import { repairStoredNotes } from '@/lib/repo'
import { AppShell } from './AppShell'
import { DocumentTitle } from './documentTitle'
import { GlobalHotkeys } from './GlobalHotkeys'
import { NotFound } from './NotFound'
import { OverlayProvider } from './overlays'
import { ThemeProvider } from './theme'
import { UpdatePrompt } from './UpdatePrompt'

/*
 * Each screen is its own chunk (plan Task F2), so the first load stays small.
 * The loaders are kept so every chunk can be fetched ahead of time while the browser is idle.
 */
const loaders = {
  today: () => import('@/features/today/TodayScreen').then((m) => ({ default: m.TodayScreen })),
  review: () => import('@/features/review/ReviewScreen').then((m) => ({ default: m.ReviewScreen })),
  speaking: () => import('@/features/speaking/SpeakingScreen').then((m) => ({ default: m.SpeakingScreen })),
  writing: () => import('@/features/writing/WritingScreen').then((m) => ({ default: m.WritingScreen })),
  paragraph: () => import('@/features/paragraphs/ParagraphScreen').then((m) => ({ default: m.ParagraphScreen })),
  mistakes: () => import('@/features/mistakes/MistakesScreen').then((m) => ({ default: m.MistakesScreen })),
  mustRemember: () => import('@/features/must-remember/MustRememberScreen').then((m) => ({ default: m.MustRememberScreen })),
  allNotes: () => import('@/features/all-notes/AllNotesScreen').then((m) => ({ default: m.AllNotesScreen })),
  noteDetail: () => import('@/features/note-detail/NoteDetailScreen').then((m) => ({ default: m.NoteDetailScreen })),
  calendar: () => import('@/features/calendar/CalendarScreen').then((m) => ({ default: m.CalendarScreen })),
  settings: () => import('@/features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
}

/** The developer preview (/design) exists only in dev builds. Vite drops the chunk from production. */
const DesignPreview = import.meta.env.DEV
  ? lazy(() => import('./DesignPreview').then((m) => ({ default: m.DesignPreview })))
  : null

const TodayScreen = lazy(loaders.today)
const ReviewScreen = lazy(loaders.review)
const SpeakingScreen = lazy(loaders.speaking)
const WritingScreen = lazy(loaders.writing)
const ParagraphScreen = lazy(loaders.paragraph)
const MistakesScreen = lazy(loaders.mistakes)
const MustRememberScreen = lazy(loaders.mustRemember)
const AllNotesScreen = lazy(loaders.allNotes)
const NoteDetailScreen = lazy(loaders.noteDetail)
const CalendarScreen = lazy(loaders.calendar)
const SettingsScreen = lazy(loaders.settings)

/** Fetches every screen chunk once the first screen has settled, so later moves never wait. */
function usePrefetchScreens(): void {
  useEffect(() => {
    const run = () => {
      for (const load of Object.values(loaders)) void load().catch(() => undefined)
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = window.setTimeout(run, 1500)
    return () => window.clearTimeout(t)
  }, [])
}

/** Routes (design §6). /review is full screen, outside the shell. /design is hidden from navigation and dev-only. */
export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route
        path="/review"
        element={
          // A quiet page-colored fallback: no spinner, no flash.
          <Suspense fallback={<div className="min-h-dvh bg-page" aria-busy="true" />}>
            <ReviewScreen />
          </Suspense>
        }
      />
      <Route element={<AppShell />}>
        <Route index element={<TodayScreen />} />
        <Route path="/speaking" element={<SpeakingScreen />} />
        <Route path="/writing" element={<WritingScreen />} />
        <Route path="/writing/paragraphs/:id" element={<ParagraphScreen />} />
        <Route path="/mistakes" element={<MistakesScreen />} />
        <Route path="/must-remember" element={<MustRememberScreen />} />
        <Route path="/notes" element={<AllNotesScreen />} />
        <Route path="/notes/:id" element={<NoteDetailScreen />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        {DesignPreview ? <Route path="/design" element={<DesignPreview />} /> : null}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

/** Vite's base ('/' locally, '/Ielts-Take-Note-App/' on GitHub Pages) without the trailing slash. */
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

/** Fixes rows that older versions stored (see repairStoredNotes). Runs once per page load, in the background. */
function useRepairStoredNotes(): void {
  useEffect(() => {
    void repairStoredNotes()
  }, [])
}

export function App(): React.JSX.Element {
  usePrefetchScreens()
  useRepairStoredNotes()
  return (
    <ThemeProvider>
      <LucideProvider strokeWidth={ICON_STROKE}>
        <BrowserRouter basename={ROUTER_BASENAME}>
          <ToastProvider>
            <ConfirmProvider>
              <OverlayProvider>
                <DocumentTitle />
                <GlobalHotkeys />
                <AppRoutes />
                <UpdatePrompt />
              </OverlayProvider>
            </ConfirmProvider>
          </ToastProvider>
        </BrowserRouter>
      </LucideProvider>
    </ThemeProvider>
  )
}
