import { Plus } from 'lucide-react'
import type React from 'react'
import { NavLink } from 'react-router'
import { useDueCounts } from '@/lib/hooks'
import { FILL, FILL_HOVER, GILT_ROUND } from '@/components/ui/candlelit'
import { cn } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'
import { MOBILE_TABS, navItem } from './nav'
import { useQuickAdd } from './overlays'

/**
 * Mobile bottom bar (<640px, brief §38): Today, Speaking, Add, Writing, Review.
 * The center Add is the one round control in the app.
 */
export function BottomNav(): React.JSX.Element {
  const quickAdd = useQuickAdd()
  const due = useDueCounts()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {MOBILE_TABS.map((key) => {
          if (key === 'add') {
            return (
              <li key="add" className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label="New note"
                  onClick={() => quickAdd.open()}
                  // Deep indigo fill with the gilt ring 3px inside, like the primary button (design v1.2).
                  className={cn(
                    'flex size-12 cursor-pointer items-center justify-center rounded-full transition-colors duration-150',
                    FILL,
                    FILL_HOVER,
                    GILT_ROUND,
                  )}
                >
                  <Plus className="size-6" strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              </li>
            )
          }
          const item = navItem(key)
          const Icon = item.icon
          const count = key === 'review' ? due?.total : undefined
          return (
            <li key={key}>
              <NavLink
                to={item.to}
                end={item.end}
                aria-label={count ? `${item.label}, ${count} due` : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-16 flex-col items-center justify-center gap-1 text-meta transition-colors duration-150',
                    isActive ? 'text-ink' : 'text-graphite',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-b-full bg-brass transition-opacity duration-180',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="relative">
                      <Icon
                        className={cn('size-5', isActive ? 'text-indigo' : 'text-graphite')}
                        strokeWidth={ICON_STROKE}
                        aria-hidden="true"
                      />
                      {count ? (
                        <span aria-hidden="true" className="absolute -top-1 left-full ml-0.5 text-meta leading-none text-graphite tabular-nums">
                          {count > 99 ? '99+' : count}
                        </span>
                      ) : null}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
