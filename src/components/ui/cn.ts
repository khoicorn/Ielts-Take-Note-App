/** Joins class names, skipping empty values. */
export function cn(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** Long words and URLs wrap instead of pushing the page sideways (Review Focus 3). */
export const WRAP = 'break-words [overflow-wrap:anywhere]'
