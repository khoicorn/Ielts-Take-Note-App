import type React from 'react'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { Sidebar } from './Sidebar'
import { useTheme } from './theme'

/**
 * A very faint paper grain (about 1.5% average alpha). Ink-colored specks on parchment,
 * light specks on the night theme. Plan: skip it if it ever reads as dirt or lowers contrast.
 */
function grain(rgb: string, opacity: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='${rgb} 0 0 0 1.2 -0.25'/></filter><rect width='160' height='160' filter='url(%23g)' opacity='${opacity}'/></svg>`
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23').replace(/"/g, "'")}")`
}

const GRAIN = {
  light: grain('0 0 0 0 0.13 0 0 0 0 0.12 0 0 0 0 0.14', 0.05),
  dark: grain('0 0 0 0 0.92 0 0 0 0 0.9 0 0 0 0 0.86', 0.035),
}

export function AppShell(): React.JSX.Element {
  const { pathname } = useLocation()
  const { resolved } = useTheme()
  const paper: React.CSSProperties = { backgroundImage: GRAIN[resolved] }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="relative min-h-dvh bg-page text-ink" style={paper}>
      <a
        href="#main"
        className="sr-only rounded-sm bg-paper px-3 py-2 text-small text-ink shadow-float focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90]"
      >
        Skip to content
      </a>
      <div className="hidden lg:block">
        <Sidebar variant="full" style={paper} />
      </div>
      <div className="hidden sm:block lg:hidden">
        <Sidebar variant="rail" style={paper} />
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
