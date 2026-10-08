import { useNavigate } from 'react-router'
import { isAnyDialogOpen } from '@/components/ui/Dialog'
import { useHotkeys } from './hotkeys'
import { NAV_ITEMS } from './nav'
import { useQuickAdd, useSearch, useShortcutsHelp } from './overlays'

const GLOBAL_KEYS_IN_INPUTS = ['mod+k']

/** True while a popover, menu or suggestion list is open. Its layer sits above dialogs, so nothing may open under it. */
function isFloatingLayerOpen(): boolean {
  return document.querySelector('[data-floating]') !== null
}

/**
 * App-wide keys (design §9). They pause while any dialog, popover or menu is open, so its own keys win.
 * N / mod+N new note · mod+K or / search · ? shortcut list · G then T R S W M F A C to move between pages.
 */
export function GlobalHotkeys(): null {
  const navigate = useNavigate()
  const quickAdd = useQuickAdd()
  const search = useSearch()
  const help = useShortcutsHelp()

  const guard = (fn: () => void) => () => {
    if (!isAnyDialogOpen() && !isFloatingLayerOpen()) fn()
  }

  const bindings: Record<string, () => void> = {
    n: guard(() => quickAdd.open()),
    'mod+n': guard(() => quickAdd.open()),
    'mod+k': guard(() => search.open()),
    '/': guard(() => search.open()),
    'shift+?': guard(() => help.open()),
  }
  for (const item of NAV_ITEMS) {
    if (item.chord) bindings[item.chord] = guard(() => navigate(item.to))
  }

  // Ctrl/Cmd+K also works while typing in a field (design §9). Single-letter keys never do.
  useHotkeys(bindings, { allowInInputs: GLOBAL_KEYS_IN_INPUTS })
  return null
}
