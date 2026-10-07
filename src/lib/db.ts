/**
 * IndexedDB through Dexie (design §3). Database "ielts-notebook", version 1.
 * Booleans are not valid IndexedDB keys, so favorite and archived are filtered in memory.
 */
import { Dexie } from 'dexie'
import type { Table } from 'dexie'
import type { Note, Paragraph, Review } from './types'

export interface MetaRow {
  key: string
  value: unknown
}

export class NotebookDB extends Dexie {
  // `declare` keeps TypeScript from emitting class fields that would overwrite Dexie's tables.
  declare notes: Table<Note, string>
  declare reviews: Table<Review, string>
  declare paragraphs: Table<Paragraph, string>
  declare meta: Table<MetaRow, string>

  constructor(name = 'ielts-notebook') {
    super(name)
    this.version(1).stores({
      notes: 'id, mode, next_review_at, date_created, created_at, updated_at, *tags, source_paragraph_id',
      reviews: 'id, note_id, review_date, created_at',
      paragraphs: 'id, task_type, created_at, updated_at',
      meta: 'key',
    })
  }
}

export const db = new NotebookDB()

/** Clears every table. Used by tests and by "Delete all data". */
export async function resetDb(): Promise<void> {
  await db.transaction('rw', [db.notes, db.reviews, db.paragraphs, db.meta], async () => {
    await Promise.all([db.notes.clear(), db.reviews.clear(), db.paragraphs.clear(), db.meta.clear()])
  })
}
