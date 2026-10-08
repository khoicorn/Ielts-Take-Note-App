/** Joins class names, skipping empty values. */
export function cn(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Long words and URLs wrap instead of pushing the page sideways (Review Focus 3).
 * Only `anywhere`: it also lowers the min-content width, so items in flex rows can shrink.
 * Do not add `break-words`: Tailwind emits it after the arbitrary property, and it would win.
 */
export const WRAP = '[overflow-wrap:anywhere]'

/**
 * The 760px reading column (Today, Calendar, Must Remember, Settings). Like the mockups, it shares its
 * left edge with the centered 1040px container that wide pages use, so pages do not jump sideways.
 */
export const READING_PAGE = 'mr-auto max-w-[760px] ml-[max(0px,calc((100%_-_1040px)/2))]'

/**
 * The active option of a listbox (Combobox, TagInput), where focus stays in the input:
 * a 2px brass bar at the left edge, like the active nav item (design v1.2), plus a light tint.
 */
export const ACTIVE_OPTION = 'relative bg-stone/60 before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-brass'
