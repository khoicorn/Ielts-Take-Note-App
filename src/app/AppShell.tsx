import type React from 'react'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { CandleLight } from '@/components/ui/CandleLight'
import { cn } from '@/components/ui/cn'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { Sidebar } from './Sidebar'
import { useTheme } from './theme'

/**
 * A very faint paper grain (about 1.5% average alpha), tinted warm: sepia specks on parchment,
 * candle-cream specks on the night theme. Plan: skip it if it ever reads as dirt or lowers contrast.
 */
function grain(rgb: string, opacity: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='${rgb} 0 0 0 1.2 -0.25'/></filter><rect width='160' height='160' filter='url(%23g)' opacity='${opacity}'/></svg>`
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23').replace(/"/g, "'")}")`
}

const GRAIN = {
  light: grain('0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0 0.1', 0.05),
  dark: grain('0 0 0 0 0.95 0 0 0 0 0.85 0 0 0 0 0.7', 0.03),
}

/**
 * Centers the candle glow on the 760px reading column (READING_PAGE in cn.ts), not on the whole main area,
 * about 310px from the top. ≥1024px: sidebar 232px + padding 56px, column offset max(0, (main - 1040px) / 2).
 * 640–1023px: rail 64px + padding 40px. Phones: the middle of the screen.
 */
const GLOW_AT = cn(
  'top-[-140px] left-1/2',
  'sm:left-[calc(104px_+_min(760px,_100%_-_144px)_/_2)]',
  'lg:left-[calc(288px_+_max(0px,_(100%_-_1384px)_/_2)_+_min(760px,_100%_-_344px)_/_2)]',
)

/**
 * Under 640px the sticky top bar (h-14 + 1px border) and the fixed bottom bar (h-16 + 1px border) cover
 * the page edges. Scroll padding on <html> keeps a control focused by Tab clear of both, plus 8px
 * (WCAG 2.4.11). Set only while the shell is shown: the full-screen Review has no bars.
 */
const BAR_SCROLL_PADDING = [
  'max-sm:[scroll-padding-top:calc(3.5rem_+_1px_+_0.5rem_+_env(safe-area-inset-top))]',
  'max-sm:[scroll-padding-bottom:calc(4rem_+_1px_+_0.5rem_+_env(safe-area-inset-bottom))]',
]

export function AppShell(): React.JSX.Element {
  const { pathname, hash } = useLocation()
  const { resolved } = useTheme()
  const paper: React.CSSProperties = { backgroundImage: GRAIN[resolved] }

  // A new page starts at the top. Links with a hash (/settings#data, /mistakes#prepositions) are left to
  // the screen, which scrolls to its section once loaded. This effect runs after the screen's effects.
  const hasHash = hash.length > 1
  useEffect(() => {
    if (!hasHash) window.scrollTo(0, 0)
    // Only a new path resets the scroll. The hash is read, not watched.
  }, [pathname])

  useEffect(() => {
    const html = document.documentElement
    html.classList.add(...BAR_SCROLL_PADDING)
    return () => html.classList.remove(...BAR_SCROLL_PADDING)
  }, [])

  return (
    // `isolate`: the candle layer (z-index -10) paints above this page-colored background and below all content.
    // Dialogs, menus and toasts portal to <body>, outside this stacking context, so the layer never covers them.
    <div className="relative isolate min-h-dvh bg-page text-ink" style={paper}>
      <CandleLight glowClassName={GLOW_AT} />
      <a
        href="#main"
        className="sr-only rounded-sm bg-paper px-3 py-2 text-small text-ink shadow-float focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90]"
      >
        Skip to content
      </a>
      {/* The sidebar and rail are transparent: the grain, glow and vignette run under them without a seam. */}
      <div className="hidden lg:block">
        <Sidebar variant="full" />
      </div>
      <div className="hidden sm:block lg:hidden">
        <Sidebar variant="rail" />
      </div>
      <MobileTopBar />
      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none sm:pb-0 sm:pl-16 lg:pl-58"
      >
        <div className="px-4 pt-8 pb-20 sm:px-10 sm:pt-12 lg:px-14 lg:pt-16">
          {/* Screens load as separate chunks. The fallback is an empty, page-colored block: no spinner flash. */}
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
