import { BookOpen, CalendarDays, Library, MessageCircle, PenLine, RotateCcw, ScrollText, Settings } from 'lucide-react'
import { type IconType, SparkIcon } from '@/components/ui/icons'

export type NavKey =
  | 'today'
  | 'review'
  | 'speaking'
  | 'writing'
  | 'mistakes'
  | 'must-remember'
  | 'notes'
  | 'calendar'
  | 'settings'

export interface NavItem {
  key: NavKey
  label: string
  to: string
  icon: IconType
  /** Two-key shortcut, e.g. 'g t'. */
  chord?: string
  /** Match the path exactly (Today only). */
  end?: boolean
}

/** Brief §3 order. Settings sits apart at the bottom. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'today', label: 'Today', to: '/', icon: BookOpen, chord: 'g t', end: true },
  { key: 'review', label: 'Review', to: '/review', icon: RotateCcw, chord: 'g r' },
  { key: 'speaking', label: 'Speaking', to: '/speaking', icon: MessageCircle, chord: 'g s' },
  { key: 'writing', label: 'Writing', to: '/writing', icon: PenLine, chord: 'g w' },
  { key: 'mistakes', label: 'Mistakes', to: '/mistakes', icon: ScrollText, chord: 'g m' },
  { key: 'must-remember', label: 'Must Remember', to: '/must-remember', icon: SparkIcon, chord: 'g f' },
  { key: 'notes', label: 'All Notes', to: '/notes', icon: Library, chord: 'g a' },
  { key: 'calendar', label: 'Calendar', to: '/calendar', icon: CalendarDays, chord: 'g c' },
]

export const SETTINGS_ITEM: NavItem = { key: 'settings', label: 'Settings', to: '/settings', icon: Settings }

/** Sidebar groups. A small italic label sits above the second and third. */
export const NAV_GROUPS: readonly { label?: string; keys: readonly NavKey[] }[] = [
  { keys: ['today', 'review'] },
  { label: 'Notebooks', keys: ['speaking', 'writing'] },
  { label: 'Library', keys: ['mistakes', 'must-remember', 'notes', 'calendar'] },
]

export function navItem(key: NavKey): NavItem {
  return key === 'settings' ? SETTINGS_ITEM : (NAV_ITEMS.find((i) => i.key === key) as NavItem)
}

/** Mobile bottom bar (brief §38): Today, Speaking, Add, Writing, Review. 'add' is the center button. */
export const MOBILE_TABS: readonly (NavKey | 'add')[] = ['today', 'speaking', 'add', 'writing', 'review']
