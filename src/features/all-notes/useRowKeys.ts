/**
 * Keyboard movement through a list of note rows (design §9): J / K anywhere on the page, ↑ / ↓ while a row
 * has focus. Enter opens the focused row (it is a link). Single letters never fire while typing in a field.
 */
import type React from 'react'
import { useCallback } from 'react'
import { useHotkeys } from '@/app/hotkeys'
import { isAnyDialogOpen } from '@/components/ui/Dialog'

function rowLinks(list: HTMLElement | null): HTMLAnchorElement[] {
  if (!list) return []
  return Array.from(list.querySelectorAll<HTMLLIElement>(':scope > li'))
    .map((li) => li.querySelector<HTMLAnchorElement>('a[href]'))
    .filter((a): a is HTMLAnchorElement => a !== null)
}

export function useRowKeys(listRef: React.RefObject<HTMLElement | null>, enabled = true): {
  onKeyDown: (e: React.KeyboardEvent) => void
} {
  const step = useCallback(
    (delta: 1 | -1): boolean => {
      const links = rowLinks(listRef.current)
      if (links.length === 0) return false
      const active = document.activeElement
      // Popovers and menus keep their own keys.
      if (active instanceof Element && active.closest('[data-floating]')) return false
      const i = links.findIndex((a) => a === active || a.contains(active))
      const next = i === -1 ? 0 : Math.min(links.length - 1, Math.max(0, i + delta))
      links[next]?.focus()
      return true
    },
    [listRef],
  )

  useHotkeys(
    {
      j: () => {
        if (!isAnyDialogOpen()) step(1)
      },
      k: () => {
        if (!isAnyDialogOpen()) step(-1)
      },
    },
    { enabled },
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (!(e.target instanceof HTMLAnchorElement)) return
      if (step(e.key === 'ArrowDown' ? 1 : -1)) e.preventDefault()
    },
    [step],
  )

  return { onKeyDown }
}
