import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetDb } from './db'
import { makeNote, makeReview } from './fixtures'
import { useDueCounts, useErrorTypes, useNote, useNotes, useSettings, useStudyStreak, useTopics } from './hooks'
import { createNote, updateSettings } from './repo'
import { todayKey } from './dates'
import { DEFAULT_SETTINGS } from './types'

beforeEach(async () => {
  await resetDb()
})

describe('hooks', () => {
  it('H-1 useNotes applies the filter and updates live', async () => {
    await createNote({ mode: 'speaking', upgraded_text: 'one' })
    const { result } = renderHook(() => useNotes({ mode: 'writing' }))
    await waitFor(() => expect(result.current).toEqual([]))
    await act(async () => {
      await createNote({ mode: 'writing', upgraded_text: 'two', task_type: 'task1' })
    })
    await waitFor(() => expect(result.current?.map((n) => n.upgraded_text)).toEqual(['two']))
  })

  it('H-2 useNote returns null for a missing id', async () => {
    const { result } = renderHook(() => useNote('missing'))
    await waitFor(() => expect(result.current).toBeNull())
  })

  it('H-3 useDueCounts counts new notes as due', async () => {
    await createNote({ mode: 'speaking', upgraded_text: 'one' })
    await createNote({ mode: 'writing', upgraded_text: 'two', task_type: 'task2' }, { start: 'none' })
    const { result } = renderHook(() => useDueCounts())
    await waitFor(() => expect(result.current).toMatchObject({ total: 1, speaking: 1, writing: 0 }))
  })

  it('H-4 useSettings starts with defaults, then follows changes', async () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current).toEqual(DEFAULT_SETTINGS)
    await act(async () => {
      await updateSettings({ session_size: 30 })
    })
    await waitFor(() => expect(result.current.session_size).toBe(30))
  })

  it('H-5 useTopics merges defaults, custom and used topics', async () => {
    await updateSettings({ custom_speaking_topics: ['Pets', 'travel'] })
    await createNote({ mode: 'speaking', upgraded_text: 'x', topic: 'Nha Trang' })
    const { result } = renderHook(() => useTopics('speaking'))
    await waitFor(() => expect(result.current).toContain('Nha Trang'))
    expect(result.current[0]).toBe('Work')
    expect(result.current.filter((t) => t.toLowerCase() === 'travel')).toEqual(['Travel'])
    expect(result.current.indexOf('Pets')).toBeLessThan(result.current.indexOf('Nha Trang'))
  })

  it('H-6 useErrorTypes adds custom and used types', async () => {
    await updateSettings({ custom_error_types: ['Pronunciation'] })
    await createNote({ mode: 'speaking', upgraded_text: 'x', error_type: 'Linking' })
    const { result } = renderHook(() => useErrorTypes())
    await waitFor(() => expect(result.current.slice(-2)).toEqual(['Pronunciation', 'Linking']))
    expect(result.current[0]).toBe('Prepositions')
  })

  it('H-7 useStudyStreak counts days with reviews or new notes', async () => {
    const now = new Date()
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12)
    const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 12)
    await db.notes.add(makeNote({ id: 'a', date_created: todayKey(twoDaysAgo) }))
    await db.reviews.add(makeReview({ note_id: 'a', review_date: todayKey(yesterday) }))
    const { result } = renderHook(() => useStudyStreak(now))
    await waitFor(() => expect(result.current).toBe(2))
  })
})
