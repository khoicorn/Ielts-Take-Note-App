import { formatRelativeDay } from '@/lib/dates'
import type { ImportSummary } from '@/lib/repo'
import type { ExportBundle, ISODateTime } from '@/lib/types'

/** "1 note", "3 notes". */
export function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

/** "a", "a and b", "a, b and c". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** "Last backup today." · "Last backup 3 days ago." · "Last backup on 27 Sep." · "No backup yet." */
export function lastBackupText(at: ISODateTime | null, now: Date = new Date()): string {
  if (!at) return 'No backup yet.'
  const rel = formatRelativeDay(at, now)
  return /^(today|yesterday|\d+ days ago)$/.test(rel) ? `Last backup ${rel}.` : `Last backup on ${rel}.`
}

/** "42 notes, 120 reviews and 2 paragraphs". Empty parts are left out. Null when the backup holds nothing. */
export function backupContents(b: Pick<ExportBundle, 'notes' | 'reviews' | 'paragraphs'>): string | null {
  const parts = [
    b.notes.length ? count(b.notes.length, 'note') : '',
    b.reviews.length ? count(b.reviews.length, 'review') : '',
    b.paragraphs.length ? count(b.paragraphs.length, 'paragraph') : '',
  ].filter(Boolean)
  return parts.length ? joinList(parts) : null
}

/** "Import done: 40 new notes, 2 updated notes and 120 reviews." */
export function importSummaryText(s: ImportSummary): string {
  const parts = [
    s.notesAdded ? count(s.notesAdded, 'new note') : '',
    s.notesUpdated ? count(s.notesUpdated, 'updated note') : '',
    s.reviewsAdded ? count(s.reviewsAdded, 'review') : '',
    s.paragraphsAdded ? count(s.paragraphsAdded, 'new paragraph') : '',
    s.paragraphsUpdated ? count(s.paragraphsUpdated, 'updated paragraph') : '',
  ].filter(Boolean)
  if (parts.length === 0) return 'Nothing new to import. Your notebook already has these notes.'
  return `Import done: ${joinList(parts)}.`
}
