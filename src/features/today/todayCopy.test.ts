import { describe, expect, it } from 'vitest'
import { backupLine, continueTarget, dueLine, lastStudiedLine, nextReviewLine, notesCount } from './todayCopy'

const NOW = new Date(2026, 9, 7, 14, 0)

describe('todayCopy', () => {
  it('T-1 due line for 0, 1 and 12 items', () => {
    expect(dueLine(0)).toBe('Nothing is waiting for review today.')
    expect(dueLine(1)).toBe('Your notebook has 1 item waiting for review.')
    expect(dueLine(12)).toBe('Your notebook has 12 items waiting for review.')
  })

  it('T-1b next review line uses local days and counts', () => {
    expect(nextReviewLine(null, 0, NOW)).toBe('No reviews scheduled.')
    expect(nextReviewLine(new Date(2026, 9, 8).toISOString(), 3, NOW)).toBe('Next review tomorrow · 3 notes')
    expect(nextReviewLine(new Date(2026, 9, 10).toISOString(), 1, NOW)).toBe('Next review in 3 days · 1 note')
    expect(nextReviewLine(new Date(2026, 10, 2).toISOString(), 2, NOW)).toBe('Next review on 2 Nov · 2 notes')
  })

  it('T-1c last studied line', () => {
    expect(lastStudiedLine(new Date(2026, 9, 7, 9).toISOString(), NOW)).toBe('Last studied today')
    expect(lastStudiedLine(new Date(2026, 9, 6, 23, 59).toISOString(), NOW)).toBe('Last studied yesterday')
    expect(lastStudiedLine(new Date(2026, 9, 4).toISOString(), NOW)).toBe('Last studied 3 days ago')
    expect(lastStudiedLine(new Date(2026, 8, 27).toISOString(), NOW)).toBe('Last studied on 27 Sep')
  })

  it('T-1d continue target for Writing and Speaking', () => {
    expect(continueTarget({ mode: 'writing', task_type: 'task1', topic: 'Stability', at: '' })).toEqual({
      kicker: 'Academic Task 1',
      title: 'Stability',
      to: '/writing?tab=task1&topic=Stability',
    })
    expect(continueTarget({ mode: 'speaking', task_type: '', topic: 'Daily Routine', at: '' })).toEqual({
      kicker: 'Speaking',
      title: 'Daily Routine',
      to: '/speaking?topic=Daily+Routine',
    })
    expect(continueTarget({ mode: 'writing', task_type: 'task2', topic: '', at: '' })).toEqual({
      kicker: 'Writing',
      title: 'Task 2',
      to: '/writing?tab=task2',
    })
    expect(continueTarget({ mode: 'speaking', task_type: '', topic: '', at: '' })).toEqual({
      kicker: 'Speaking',
      title: 'All topics',
      to: '/speaking',
    })
  })

  it('T-1e backup line only with 10+ notes and no export in 14 days', () => {
    expect(backupLine(9, null, NOW)).toBeNull()
    expect(backupLine(10, null, NOW)).toBe('No backup yet.')
    expect(backupLine(42, new Date(2026, 8, 16, 10).toISOString(), NOW)).toBe('Last backup 21 days ago.')
    expect(backupLine(42, new Date(2026, 8, 23, 10).toISOString(), NOW)).toBeNull()
  })

  it('T-1f note counts', () => {
    expect(notesCount(1)).toBe('1 note')
    expect(notesCount(4)).toBe('4 notes')
  })
})
