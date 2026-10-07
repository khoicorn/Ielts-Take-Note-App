/**
 * Test helpers: build complete records with sensible defaults.
 * Used by unit tests across the app. Not imported by app code.
 */
import type { Note, Paragraph, Review } from './types'

let counter = 0

function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  const created = overrides.created_at ?? new Date(2026, 9, 1, 9, 0).toISOString()
  return {
    id: nextId('note'),
    mode: 'speaking',
    date_created: '2026-10-01',
    topic: '',
    subtopic: '',
    task_type: '',
    task_genre: '',
    original_text: '',
    upgraded_text: 'The scenery was beautiful.',
    explanation: '',
    example_sentence: '',
    reusable_pattern: '',
    model_paragraph: '',
    note_type: 'useful_expression',
    error_type: '',
    error_pattern: '',
    fix_pattern: '',
    recall_prompt: '',
    tags: [],
    difficulty: 0,
    is_favorite: false,
    mastery_status: 'new',
    review_stage: 0,
    last_reviewed_at: null,
    next_review_at: created,
    times_reviewed: 0,
    times_seen: 1,
    source_paragraph_id: null,
    is_archived: false,
    archived_at: null,
    created_at: created,
    updated_at: created,
    ...overrides,
  }
}

export function makeParagraph(overrides: Partial<Paragraph> = {}): Paragraph {
  const created = overrides.created_at ?? new Date(2026, 9, 1, 9, 0).toISOString()
  return {
    id: nextId('paragraph'),
    title: 'Untitled paragraph',
    task_type: 'task1',
    task_genre: '',
    topic: '',
    body: '',
    tags: [],
    is_favorite: false,
    is_archived: false,
    created_at: created,
    updated_at: created,
    ...overrides,
  }
}

export function makeReview(overrides: Partial<Review> & Pick<Review, 'note_id'>): Review {
  return {
    id: nextId('review'),
    review_date: '2026-10-01',
    rating: 'good',
    review_type: 'upgrade',
    previous_stage: 0,
    new_stage: 1,
    previous_interval: 0,
    new_interval: 1,
    created_at: new Date(2026, 9, 1, 20, 0).toISOString(),
    ...overrides,
  }
}

/** The brief §16 Travel note. */
export const TRAVEL_NOTE: Partial<Note> = {
  mode: 'speaking',
  topic: 'Travel',
  original_text: 'We enjoyed the scenario.',
  upgraded_text: 'The scenery was beautiful.',
  explanation: '"Scenery" refers to the landscape or views. "Scenario" refers to a situation.',
  example_sentence: 'The scenery along the coast was beautiful.',
  note_type: 'correction',
}

/** The brief §23 model paragraph. */
export const OPPOSITE_TRENDS =
  'From 2012 to 2022, the three attractions showed markedly different trends. The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions. In contrast, the number of visitors to the City Zoo increased steadily from 35,000 to 68,000, making it the most visited attraction in 2022. Meanwhile, visitor numbers at the Botanical Garden remained relatively stable, rising slightly by 2,000 to 30,000 in 2017 before falling to 29,000 in 2022.'
