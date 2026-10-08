/**
 * Test helpers for the notebook screens (All Notes, Speaking, Writing, Must Remember).
 * Not a test file itself: imported by the *.test.tsx files in these folders only.
 */
import { render, screen } from '@testing-library/react'
import type React from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'

/** Viewport width that the matchMedia stub answers for. */
let viewportWidth = 1440

/**
 * jsdom has no matchMedia. This stub answers (min-width: Npx) and (max-width: Npx) queries
 * against a fixed width, so screens pick their desktop or mobile layout in tests.
 */
export function setViewportWidth(width: number): void {
  viewportWidth = width
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query)
    const max = /max-width:\s*(\d+)px/.exec(query)
    const matches = (!min || viewportWidth >= Number(min[1])) && (!max || viewportWidth <= Number(max[1]))
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList
  }) as typeof window.matchMedia
}

/** Prints the current path and query so tests can check URL changes. */
function LocationProbe(): React.JSX.Element {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

/** Renders one screen at a route, inside the providers it needs (router, toasts, confirm). */
export function renderScreen(path: string, element: React.ReactNode, url: string = path): void {
  render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path={path} element={element} />
            <Route path="*" element={<p>Other page</p>} />
          </Routes>
          <LocationProbe />
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

/** The current path and query, as shown by the location probe. */
export function currentUrl(): string {
  return screen.getByTestId('location').textContent ?? ''
}
