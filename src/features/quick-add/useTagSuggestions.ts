import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

const EMPTY: string[] = []

/** Tags already used in notes, most used first, for the Tags field. */
export function useTagSuggestions(limit = 60): string[] {
  return (
    useLiveQuery(async () => {
      const counts = new Map<string, number>()
      await db.notes.each((n) => {
        if (n.is_archived) return
        for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
      })
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([t]) => t)
    }, [limit]) ?? EMPTY
  )
}
