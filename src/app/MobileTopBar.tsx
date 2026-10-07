import { Menu as MenuIcon, Plus, Search } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useDueCounts, useStudyStreak } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { NavList, SidebarLink, streakText, Wordmark } from './Sidebar'
import { useQuickAdd, useSearch } from './overlays'
import { navItem } from './nav'

/** Mobile header (<640px): wordmark, search, and a menu sheet with every page. */
export function MobileTopBar(): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const search = useSearch()
  const quickAdd = useQuickAdd()
  const due = useDueCounts()
  const streak = streakText(useStudyStreak())
  const { pathname } = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const settings = navItem('settings')

  return (
    <header className="sticky top-0 z-30 box-content flex h-14 items-center justify-between border-b border-line bg-page pt-[env(safe-area-inset-top)] pr-1.5 pl-4 sm:hidden">
      <Wordmark className="min-h-11" />
      <div className="flex items-center">
        <IconButton icon={Search} label="Search" onClick={() => search.open()} />
        <IconButton icon={MenuIcon} label="Menu" onClick={() => setMenuOpen(true)} />
      </div>
      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" size="md">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              icon={Plus}
              onClick={() => {
                setMenuOpen(false)
                quickAdd.open()
              }}
            >
              New note
            </Button>
            <Button
              icon={Search}
              variant="ghost"
              onClick={() => {
                setMenuOpen(false)
                search.open()
              }}
            >
              Search
            </Button>
          </div>
          <nav aria-label="All pages">
            <NavList reviewCount={due?.total} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-5 border-t border-line pt-3">
              <SidebarLink item={settings} onNavigate={() => setMenuOpen(false)} />
            </div>
          </nav>
          {streak ? <p className="text-small text-graphite">{streak}</p> : null}
        </div>
      </Dialog>
    </header>
  )
}
