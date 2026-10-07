import { LucideProvider } from 'lucide-react'
import type React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ICON_STROKE } from '@/components/ui/icons'
import { ToastProvider } from '@/components/ui/Toast'
import { AllNotesScreen } from '@/features/all-notes/AllNotesScreen'
import { CalendarScreen } from '@/features/calendar/CalendarScreen'
import { MistakesScreen } from '@/features/mistakes/MistakesScreen'
import { MustRememberScreen } from '@/features/must-remember/MustRememberScreen'
import { NoteDetailScreen } from '@/features/note-detail/NoteDetailScreen'
import { ParagraphScreen } from '@/features/paragraphs/ParagraphScreen'
import { ReviewScreen } from '@/features/review/ReviewScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { SpeakingScreen } from '@/features/speaking/SpeakingScreen'
import { TodayScreen } from '@/features/today/TodayScreen'
import { WritingScreen } from '@/features/writing/WritingScreen'
import { AppShell } from './AppShell'
import { DesignPreview } from './DesignPreview'
import { GlobalHotkeys } from './GlobalHotkeys'
import { NotFound } from './NotFound'
import { OverlayProvider } from './overlays'
import { ThemeProvider } from './theme'
import { UpdatePrompt } from './UpdatePrompt'

/** Routes (design §6). /review is full screen, outside the shell. /design is hidden from navigation. */
export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/review" element={<ReviewScreen />} />
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
        <Route path="/design" element={<DesignPreview />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <LucideProvider strokeWidth={ICON_STROKE}>
        <BrowserRouter>
          <ToastProvider>
            <ConfirmProvider>
              <OverlayProvider>
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
