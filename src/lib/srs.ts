/**
 * Spaced repetition (design §4). Stage 0 = New, stages 1–7 = 1, 3, 7, 14, 30, 60, 120 days.
 * Next reviews land on the start of a local day.
 */
import { addDays, endOfDay, startOfDay } from './dates'
import { MAX_STAGE, STAGE_INTERVALS } from './taxonomy'
import type { ISODateTime, MasteryStatus, Note, Rating, ReviewStage, ReviewStart } from './types'

export interface ScheduleResult {
  review_stage: ReviewStage
  mastery_status: MasteryStatus
  next_review_at: ISODateTime
  previous_interval: number
  new_interval: number
  /** true only for 'again' */
  requeue: boolean
}

type ReviewState = Pick<Note, 'review_stage' | 'mastery_status' | 'next_review_at'>

const FIRST_STAGE: Readonly<Record<MasteryStatus, ReviewStage>> = { new: 0, learning: 1, familiar: 3, mastered: 5 }

function clampStage(n: number): ReviewStage {
  return Math.min(MAX_STAGE, Math.max(0, Math.round(n))) as ReviewStage
}

function dayStartIn(now: Date, days: number): ISODateTime {
  return startOfDay(addDays(now, days)).toISOString()
}

export function intervalForStage(stage: ReviewStage): number {
  return STAGE_INTERVALS[stage]
}

export function masteryForStage(stage: ReviewStage): MasteryStatus {
  if (stage === 0) return 'new'
  if (stage <= 2) return 'learning'
  if (stage <= 4) return 'familiar'
  return 'mastered'
}

export function firstStageOf(m: MasteryStatus): ReviewStage {
  return FIRST_STAGE[m]
}

function nextStep(stage: ReviewStage, rating: Rating): { stage: ReviewStage; interval: number } {
  switch (rating) {
    case 'again':
      return { stage: 1, interval: 1 }
    case 'hard': {
      const next = clampStage(Math.max(1, stage))
      return { stage: next, interval: Math.max(1, Math.round(intervalForStage(next) / 2)) }
    }
    case 'good': {
      const next = clampStage(stage + 1)
      return { stage: next, interval: intervalForStage(next) }
    }
    case 'easy': {
      const next = clampStage(stage + 2)
      return { stage: next, interval: intervalForStage(next) }
    }
  }
}

export function schedule(note: Pick<Note, 'review_stage'>, rating: Rating, now: Date): ScheduleResult {
  const current = clampStage(note.review_stage)
  const { stage, interval } = nextStep(current, rating)
  return {
    review_stage: stage,
    mastery_status: masteryForStage(stage),
    next_review_at: dayStartIn(now, interval),
    previous_interval: intervalForStage(current),
    new_interval: interval,
    requeue: rating === 'again',
  }
}

export function previewIntervals(note: Pick<Note, 'review_stage'>): Record<Rating, number> {
  const current = clampStage(note.review_stage)
  return {
    again: nextStep(current, 'again').interval,
    hard: nextStep(current, 'hard').interval,
    good: nextStep(current, 'good').interval,
    easy: nextStep(current, 'easy').interval,
  }
}

export function initialSchedule(start: ReviewStart, now: Date): ReviewState {
  const next = start === 'today' ? now.toISOString() : start === 'tomorrow' ? dayStartIn(now, 1) : null
  return { review_stage: 0, mastery_status: 'new', next_review_at: next }
}

export function manualMastery(m: MasteryStatus, now: Date): ReviewState {
  const stage = firstStageOf(m)
  return {
    review_stage: stage,
    mastery_status: m,
    next_review_at: m === 'new' ? now.toISOString() : dayStartIn(now, intervalForStage(stage)),
  }
}

export function isDue(note: Pick<Note, 'next_review_at' | 'is_archived'>, now: Date): boolean {
  if (note.is_archived || note.next_review_at === null) return false
  return new Date(note.next_review_at).getTime() <= endOfDay(now).getTime()
}
