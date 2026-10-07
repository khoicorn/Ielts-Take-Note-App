import { describe, expect, it } from 'vitest'
import { addDays, startOfDay, toDayKey } from './dates'
import {
  firstStageOf,
  initialSchedule,
  intervalForStage,
  isDue,
  manualMastery,
  masteryForStage,
  previewIntervals,
  schedule,
} from './srs'

const NOW = new Date(2026, 9, 7, 14, 30)

function dueDayOffset(iso: string): number {
  const due = new Date(iso)
  return Math.round((startOfDay(due).getTime() - startOfDay(NOW).getTime()) / 86_400_000)
}

describe('srs', () => {
  it('S1 stage 0 + good moves to stage 1 in 1 day', () => {
    const r = schedule({ review_stage: 0 }, 'good', NOW)
    expect(r).toMatchObject({ review_stage: 1, new_interval: 1, mastery_status: 'learning', requeue: false, previous_interval: 0 })
    expect(toDayKey(r.next_review_at)).toBe('2026-10-08')
  })

  it('S2 stage 2 + good moves to familiar in 7 days', () => {
    expect(schedule({ review_stage: 2 }, 'good', NOW)).toMatchObject({
      review_stage: 3,
      new_interval: 7,
      mastery_status: 'familiar',
      previous_interval: 3,
    })
  })

  it('S3 stage 4 + good moves to mastered in 30 days', () => {
    expect(schedule({ review_stage: 4 }, 'good', NOW)).toMatchObject({ review_stage: 5, new_interval: 30, mastery_status: 'mastered' })
  })

  it('S4 stage 7 + easy stays at stage 7 with 120 days', () => {
    expect(schedule({ review_stage: 7 }, 'easy', NOW)).toMatchObject({ review_stage: 7, new_interval: 120, mastery_status: 'mastered' })
  })

  it('S5 again drops to stage 1, 1 day, and asks for a requeue', () => {
    expect(schedule({ review_stage: 3 }, 'again', NOW)).toMatchObject({
      review_stage: 1,
      new_interval: 1,
      requeue: true,
      mastery_status: 'learning',
      previous_interval: 7,
    })
  })

  it('S6 hard keeps the stage and halves the interval', () => {
    expect(schedule({ review_stage: 3 }, 'hard', NOW)).toMatchObject({ review_stage: 3, new_interval: 4, requeue: false })
  })

  it('S7 hard on a new note moves to stage 1 with 1 day', () => {
    expect(schedule({ review_stage: 0 }, 'hard', NOW)).toMatchObject({ review_stage: 1, new_interval: 1 })
  })

  it('S8 easy jumps two stages', () => {
    expect(schedule({ review_stage: 1 }, 'easy', NOW)).toMatchObject({ review_stage: 3, new_interval: 7 })
  })

  it('S9 next review lands on local midnight N days ahead', () => {
    for (const rating of ['again', 'hard', 'good', 'easy'] as const) {
      const r = schedule({ review_stage: 2 }, rating, NOW)
      const due = new Date(r.next_review_at)
      expect(due.getHours()).toBe(0)
      expect(due.getMinutes()).toBe(0)
      expect(dueDayOffset(r.next_review_at)).toBe(r.new_interval)
    }
    const late = schedule({ review_stage: 1 }, 'good', new Date(2026, 2, 7, 23, 59))
    expect(toDayKey(late.next_review_at)).toBe('2026-03-10')
    expect(new Date(late.next_review_at).getHours()).toBe(0)
  })

  it('S10 isDue uses the end of the local day', () => {
    const now = new Date(2026, 9, 7, 0, 1)
    expect(isDue({ next_review_at: new Date(2026, 9, 7, 23, 0).toISOString(), is_archived: false }, now)).toBe(true)
    expect(isDue({ next_review_at: new Date(2026, 9, 8, 0, 0).toISOString(), is_archived: false }, now)).toBe(false)
    expect(isDue({ next_review_at: new Date(2026, 9, 1).toISOString(), is_archived: true }, now)).toBe(false)
    expect(isDue({ next_review_at: null, is_archived: false }, now)).toBe(false)
  })

  it('S11 previews the next gap for each rating', () => {
    expect(previewIntervals({ review_stage: 2 })).toEqual({ again: 1, hard: 2, good: 7, easy: 14 })
    expect(previewIntervals({ review_stage: 0 })).toEqual({ again: 1, hard: 1, good: 1, easy: 3 })
  })

  it('S12 manual mastery moves to the first stage of that level', () => {
    const m = manualMastery('mastered', NOW)
    expect(m.review_stage).toBe(5)
    expect(m.mastery_status).toBe('mastered')
    expect(m.next_review_at).toBe(startOfDay(addDays(NOW, 30)).toISOString())
    const n = manualMastery('new', NOW)
    expect(n).toEqual({ review_stage: 0, mastery_status: 'new', next_review_at: NOW.toISOString() })
    expect(manualMastery('familiar', NOW).review_stage).toBe(3)
  })

  it('S13 maps stages to mastery and back', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((s) => masteryForStage(s as 0))).toEqual([
      'new',
      'learning',
      'learning',
      'familiar',
      'familiar',
      'mastered',
      'mastered',
      'mastered',
    ])
    expect(firstStageOf('new')).toBe(0)
    expect(firstStageOf('learning')).toBe(1)
    expect(firstStageOf('familiar')).toBe(3)
    expect(firstStageOf('mastered')).toBe(5)
    expect(intervalForStage(4)).toBe(14)
  })

  it('S14 initial schedule follows the chosen start', () => {
    expect(initialSchedule('today', NOW)).toEqual({ review_stage: 0, mastery_status: 'new', next_review_at: NOW.toISOString() })
    expect(initialSchedule('tomorrow', NOW).next_review_at).toBe(new Date(2026, 9, 8).toISOString())
    expect(initialSchedule('none', NOW).next_review_at).toBeNull()
  })
})
