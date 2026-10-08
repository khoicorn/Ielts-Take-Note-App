import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { isRecord } from '@/lib/records'
import { META_KEYS } from '@/lib/repo'

/**
 * How many example notes (added by loadExampleData) are still in the notebook. undefined while loading.
 * Local to Settings for now; requested as a shared hook in src/lib/hooks.ts.
 */
export function useExampleNoteCount(): number | undefined {
  return useLiveQuery(async () => {
    const value = (await db.meta.get(META_KEYS.exampleIds))?.value
    const ids = isRecord(value) && Array.isArray(value.notes) ? value.notes.filter((v): v is string => typeof v === 'string') : []
    if (ids.length === 0) return 0
    return (await db.notes.bulkGet(ids)).filter(Boolean).length
  }, [])
}
