/**
 * Example notes for a Band 6.5 learner whose first language is Vietnamese.
 * Loaded from Today ("Load example notes") and removed from Settings. Every row is tagged "example".
 *
 * buildExampleData() turns each note's study plan into a consistent history by running the real
 * scheduler: a review happens on the first study day on or after the due day.
 */
import { addDays, startOfDay, toDayKey } from './dates'
import { newId } from './ids'
import { pickReviewType } from './reviewTypes'
import { initialSchedule, schedule } from './srs'
import { EXAMPLE_TAG } from './taxonomy'
import type { LastStudied, Note, NoteDraft, Paragraph, ParagraphDraft, Rating, Review } from './types'

interface ExamplePlan {
  /** date_created, in days before today (0–20). */
  daysAgo: number
  /** Ratings given on each review, in order. Unused ratings are skipped once the note is no longer due. */
  ratings: Rating[]
  /** The learner logged this mistake again before ("I made this mistake again"). */
  timesSeen?: number
  archived?: boolean
  /** Index into EXAMPLE_PARAGRAPHS: the note was made from a selection in that paragraph. */
  paragraph?: number
}

interface ExampleEntry {
  draft: NoteDraft
  plan: ExamplePlan
}

const OPPOSITE_TRENDS_BODY =
  'From 2012 to 2022, the three attractions showed markedly different trends. The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions. In contrast, the number of visitors to the City Zoo increased steadily from 35,000 to 68,000, making it the most visited attraction in 2022. Meanwhile, visitor numbers at the Botanical Garden remained relatively stable, rising slightly by 2,000 to 30,000 in 2017 before falling to 29,000 in 2022.'

const ONLINE_LEARNING_BODY =
  'Admittedly, studying online offers a degree of flexibility that traditional classrooms cannot match. Learners can watch lectures at any time and revise difficult material as often as they need. However, this convenience comes at a cost. Without regular face-to-face contact, many students lose motivation and struggle to ask questions when they are confused. For this reason, I believe online courses work best as a supplement to, rather than a replacement for, classroom teaching.'

export const EXAMPLE_PARAGRAPHS: ParagraphDraft[] = [
  {
    title: 'Task 1 — Opposite Trends',
    body: OPPOSITE_TRENDS_BODY,
    task_type: 'task1',
    task_genre: 'Line Graph',
    topic: 'Comparison',
    tags: [EXAMPLE_TAG, 'trends'],
    is_favorite: true,
  },
  {
    title: 'Task 2 — Concession and Rebuttal',
    body: ONLINE_LEARNING_BODY,
    task_type: 'task2',
    task_genre: 'Opinion',
    topic: 'Concession',
    tags: [EXAMPLE_TAG, 'education'],
  },
]

/** Days ago on which the example learner did reviews, oldest first. Today is left open, so some notes are still due. */
const STUDY_DAYS: readonly number[] = [20, 18, 17, 15, 13, 11, 9, 8, 6, 4, 3, 2, 1]

const PARAGRAPH_DAYS_AGO: readonly number[] = [18, 6]

const ENTRIES: ExampleEntry[] = [
  /* ---------------------------------- Speaking ---------------------------------- */
  {
    draft: {
      mode: 'speaking',
      topic: 'Travel',
      subtopic: 'Nha Trang trip',
      original_text: 'We enjoyed the scenario.',
      upgraded_text: 'The scenery was beautiful.',
      explanation: '"Scenery" refers to the landscape or views. "Scenario" refers to a situation.',
      example_sentence: 'The scenery along the coast was beautiful.',
      note_type: 'correction',
      error_type: 'Word Choice',
      error_pattern: 'scenario (for views)',
      fix_pattern: 'scenery',
      is_favorite: true,
      tags: [EXAMPLE_TAG, 'travel'],
    },
    plan: { daysAgo: 20, ratings: ['easy', 'easy', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Drinks',
      subtopic: 'Ordering bubble tea',
      original_text: "I don't customize other factors.",
      upgraded_text: "I'm pretty flexible about the rest.",
      explanation: '"Customize" sounds technical in casual speech. "I\'m pretty flexible about the rest" is how people talk about their preferences.',
      example_sentence: "I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.",
      note_type: 'correction',
      error_type: 'Awkward Phrasing',
      error_pattern: 'customize (for preferences)',
      fix_pattern: 'be flexible about',
      tags: [EXAMPLE_TAG, 'food-and-drinks'],
    },
    plan: { daysAgo: 19, ratings: ['easy', 'easy', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Work',
      subtopic: 'My job',
      original_text: 'I am working as an accountant since 2021.',
      upgraded_text: "I've been working as an accountant since 2021.",
      explanation: 'With "since" and a starting point, use the present perfect continuous, not the present continuous.',
      example_sentence: "I've been working as an accountant since 2021, mostly with small businesses.",
      reusable_pattern: "I've been ___ since ___.",
      note_type: 'correction',
      error_type: 'Tenses',
      error_pattern: 'am working + since',
      fix_pattern: 'have been working + since',
      tags: [EXAMPLE_TAG, 'part-1'],
    },
    plan: { daysAgo: 16, ratings: ['good', 'hard', 'good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Hometown',
      subtopic: 'Ho Chi Minh City',
      original_text: 'My hometown has many traffic jam.',
      upgraded_text: 'There are a lot of traffic jams in my hometown, especially at rush hour.',
      explanation: '"Traffic jam" is countable, so it needs the plural after "many" or "a lot of". "There are" sounds more natural than "my hometown has".',
      example_sentence: 'The roads near my house are packed, and there are a lot of traffic jams at rush hour.',
      note_type: 'correction',
      error_type: 'Speaking Grammar',
      error_pattern: 'many + singular noun',
      fix_pattern: 'many + plural noun',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 13, ratings: ['good', 'good', 'easy'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Study',
      original_text: 'I very like studying English.',
      upgraded_text: 'I really enjoy studying English.',
      explanation: '"Very" cannot go before a verb. Use "really like" or "really enjoy".',
      example_sentence: 'I really enjoy studying English in the evening, when the house is quiet.',
      note_type: 'correction',
      error_type: 'Speaking Grammar',
      error_pattern: 'very + verb',
      fix_pattern: 'really + verb',
      tags: [EXAMPLE_TAG, 'part-1'],
    },
    plan: { daysAgo: 12, ratings: ['again', 'good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Family',
      original_text: 'My family has 4 people.',
      upgraded_text: 'There are four of us in my family.',
      explanation: '"There are four of us" is the natural way to give the size of your family.',
      example_sentence: 'There are four of us in my family: my parents, my younger brother and me.',
      note_type: 'correction',
      error_type: 'Awkward Phrasing',
      error_pattern: 'my family has + number + people',
      fix_pattern: 'there are + number + of us',
      tags: [EXAMPLE_TAG, 'part-1'],
    },
    plan: { daysAgo: 10, ratings: ['good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Technology',
      upgraded_text: "I'm glued to my phone",
      explanation: 'An informal way to say you use your phone a lot. Good for Part 1 answers about technology.',
      example_sentence: "To be honest, **I'm glued to my phone** most evenings, mostly reading the news.",
      note_type: 'useful_expression',
      tags: [EXAMPLE_TAG, 'idiom'],
    },
    plan: { daysAgo: 9, ratings: ['easy', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Weather',
      subtopic: 'Hanoi summers',
      original_text: 'The weather in Hanoi is very hot and wet in summer.',
      upgraded_text: 'Hanoi gets really hot and humid in the summer.',
      explanation: '"Humid" describes air that feels heavy with water. "Wet" is for rain or water on a surface.',
      example_sentence: 'Hanoi gets really hot and humid in the summer, so I stay inside at midday.',
      note_type: 'correction',
      error_type: 'Word Choice',
      error_pattern: 'wet (for air)',
      fix_pattern: 'humid',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 7, ratings: ['good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Health',
      original_text: 'I go to the gym for keeping fit.',
      upgraded_text: 'I go to the gym to keep fit.',
      explanation: 'To give a purpose, use "to + verb", not "for + -ing".',
      example_sentence: 'I go to the gym three times a week to keep fit.',
      reusable_pattern: 'I ___ to keep fit.',
      note_type: 'correction',
      error_type: 'Speaking Grammar',
      error_pattern: 'for + -ing (purpose)',
      fix_pattern: 'to + verb (purpose)',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 6, ratings: ['easy', 'easy'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Travel',
      subtopic: 'Ha Long Bay',
      original_text: 'Many visitors of Ha Long Bay come in summer.',
      upgraded_text: 'Many visitors to Ha Long Bay come in the summer.',
      explanation: 'Use "visitors to + place". The visitors travel to the place; they do not belong to it.',
      example_sentence: 'Many visitors to Ha Long Bay take an overnight boat trip.',
      note_type: 'correction',
      error_type: 'Prepositions',
      error_pattern: 'visitors of + place',
      fix_pattern: 'visitors to + place',
      tags: [EXAMPLE_TAG, 'travel'],
    },
    plan: { daysAgo: 4, ratings: ['good', 'good'] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Daily Routine',
      original_text: 'I usually go to bed lately.',
      upgraded_text: 'I usually go to bed late.',
      explanation: '"Late" is the adverb for time. "Lately" means "recently".',
      example_sentence: 'I usually go to bed late on weekdays because I study after work.',
      note_type: 'correction',
      error_type: 'Word Forms',
      error_pattern: 'lately (for late)',
      fix_pattern: 'late',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 2, ratings: [] },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Shopping',
      original_text: 'I usually buy clothes in online.',
      upgraded_text: 'I usually buy clothes online.',
      explanation: '"Online" works as an adverb here, so it needs no preposition.',
      example_sentence: 'I usually buy clothes online because it saves time.',
      note_type: 'correction',
      error_type: 'Prepositions',
      error_pattern: 'in online',
      fix_pattern: 'online (no preposition)',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 3, ratings: ['good', 'good'], timesSeen: 2 },
  },
  {
    draft: {
      mode: 'speaking',
      topic: 'Friends',
      upgraded_text: 'we hit it off straight away',
      explanation: '"Hit it off" means you liked each other from the start.',
      example_sentence: 'I met my best friend at university, and **we hit it off straight away**.',
      note_type: 'useful_expression',
      tags: [EXAMPLE_TAG, 'idiom'],
    },
    plan: { daysAgo: 0, ratings: [] },
  },

  /* ---------------------------------- Writing: Academic Task 1 ---------------------------------- */
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Increase',
      original_text: 'The number of visitors of the City Zoo increased steadily.',
      upgraded_text: 'The number of visitors to the City Zoo increased steadily.',
      explanation: 'Use "visitors to + place" rather than "visitors of + place".',
      reusable_pattern: 'The number of visitors to ___ increased steadily from ___ to ___.',
      example_sentence: 'The number of visitors to the City Zoo increased steadily from 35,000 to 68,000.',
      note_type: 'correction',
      error_type: 'Prepositions',
      error_pattern: 'visitors of + place',
      fix_pattern: 'visitors to + place',
      is_favorite: true,
      tags: [EXAMPLE_TAG, 'trends'],
    },
    plan: { daysAgo: 20, ratings: ['easy', 'easy', 'easy'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Stability',
      upgraded_text: 'remained relatively stable',
      explanation: 'A safe way to describe small changes. "Relatively" shows the figure moved a little.',
      example_sentence: 'Visitor numbers at the Botanical Garden **remained relatively stable** at around 30,000.',
      reusable_pattern: '___ remained relatively stable at around ___.',
      recall_prompt: 'Describe a stable trend.',
      note_type: 'collocation',
      is_favorite: true,
      tags: [EXAMPLE_TAG, 'trends'],
    },
    plan: { daysAgo: 18, ratings: ['easy', 'good', 'good'], paragraph: 0 },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Bar Chart',
      topic: 'Stability',
      upgraded_text: 'remained broadly unchanged',
      explanation: 'A formal way to say "stayed the same". Use it so you do not repeat "stable".',
      example_sentence: 'The proportion of students who walked to school remained broadly unchanged over the period.',
      note_type: 'collocation',
      tags: [EXAMPLE_TAG, 'trends'],
    },
    plan: { daysAgo: 17, ratings: ['good', 'easy', 'easy'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Table',
      topic: 'Stability',
      original_text: 'The sales of e-books kept stable in 2 million.',
      upgraded_text: 'Sales of e-books maintained a stable level of around 2 million copies.',
      explanation: '"Keep stable" is not a natural collocation in a report. Use "remain stable" or "maintain a stable level", with "at" or "of" before the figure, not "in".',
      note_type: 'correction',
      error_type: 'Collocations',
      error_pattern: 'keep stable',
      fix_pattern: 'remain stable / maintain a stable level',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 13, ratings: ['good', 'good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Decrease',
      upgraded_text: 'experienced a steady decline',
      explanation: '"Experience a decline" sounds more academic than "go down". Add "steady" or "sharp" to show the speed.',
      example_sentence: 'The National Gallery **experienced** a steady decline in attendance.',
      reusable_pattern: '___ experienced a steady decline in ___ from ___ to ___.',
      note_type: 'collocation',
      tags: [EXAMPLE_TAG, 'trends'],
    },
    plan: { daysAgo: 15, ratings: ['easy', 'easy', 'good'], paragraph: 0 },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Increase',
      original_text: 'The number of car owners increased very fast from 2010 to 2020.',
      upgraded_text: 'The number of car owners rose sharply between 2010 and 2020.',
      explanation: '"Very fast" is informal. "Rose sharply" is a standard Task 1 collocation. Use "between … and …" for the whole period.',
      reusable_pattern: 'The number of ___ rose sharply between ___ and ___.',
      recall_prompt: 'Describe a sharp rise over ten years.',
      note_type: 'correction',
      error_type: 'Academic Task 1',
      error_pattern: 'increase very fast',
      fix_pattern: 'rise sharply',
      tags: [EXAMPLE_TAG, 'trends'],
    },
    plan: { daysAgo: 8, ratings: ['good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Overview',
      original_text: 'In general, we can see that the zoo is the most popular.',
      upgraded_text: 'Overall, the City Zoo became the most popular attraction by the end of the period.',
      explanation: 'Start the overview with "Overall,". Leave out "we can see". Name the main trend and the end point.',
      reusable_pattern: 'Overall, ___ became the most ___ by the end of the period.',
      note_type: 'correction',
      error_type: 'Academic Task 1',
      error_pattern: 'we can see that',
      fix_pattern: 'Overall, + main trend',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 6, ratings: ['good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Comparison',
      upgraded_text: 'In contrast,',
      explanation: 'Use it to move from a falling trend to a rising one. Put a comma after it.',
      example_sentence: '**In contrast**, the number of visitors to the City Zoo increased steadily from 35,000 to 68,000.',
      note_type: 'linking_phrase',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 15, ratings: ['good', 'good', 'easy'], paragraph: 0 },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Pie Chart',
      topic: 'Approximation',
      original_text: 'The figure was about less than 30%.',
      upgraded_text: 'The figure was just under 30%.',
      explanation: '"About" and "less than" do not go together. Use "just under" or "just over" for a figure close to a round number.',
      example_sentence: 'Just under 30% of households owned a computer in 2000.',
      reusable_pattern: 'just under / just over ___%',
      note_type: 'correction',
      error_type: 'Word Choice',
      error_pattern: 'about less than',
      fix_pattern: 'just under',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 3, ratings: ['good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Fluctuation',
      original_text: 'Price of rice fluctuated between $400 and $500.',
      upgraded_text: 'The price of rice fluctuated between $400 and $500 per tonne.',
      explanation: 'Use "the" before "price of + noun". Add the unit so the figures are clear.',
      example_sentence: 'The price of rice fluctuated between $400 and $500 per tonne throughout the decade.',
      note_type: 'correction',
      error_type: 'Articles',
      error_pattern: 'price of + noun (no article)',
      fix_pattern: 'the price of + noun',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 11, ratings: ['easy', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Line Graph',
      topic: 'Peak',
      original_text: 'The number of visitors of the Science Museum peaked at 50,000 in 2015.',
      upgraded_text: 'The number of visitors to the Science Museum peaked at 50,000 in 2015.',
      explanation: 'The same habit as "visitors of the City Zoo": the visitors go to the place.',
      reusable_pattern: 'The number of visitors to ___ peaked at ___ in ___.',
      note_type: 'correction',
      error_type: 'Prepositions',
      error_pattern: 'visitors of + place',
      fix_pattern: 'visitors to + place',
      tags: [EXAMPLE_TAG, 'trends'],
    },
    plan: { daysAgo: 12, ratings: ['good', 'good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task1',
      task_genre: 'Bar Chart',
      topic: 'Introduction',
      original_text: 'The bar chart compares visitors of three museums in London.',
      upgraded_text: 'The bar chart compares the number of visitors to three museums in London.',
      explanation: 'Compare "the number of" visitors, not the visitors themselves. Then use "visitors to + place".',
      reusable_pattern: 'The bar chart compares the number of visitors to ___ in ___.',
      note_type: 'correction',
      error_type: 'Prepositions',
      error_pattern: 'visitors of + place',
      fix_pattern: 'visitors to + place',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 1, ratings: [] },
  },

  /* ---------------------------------- Writing: Task 2 ---------------------------------- */
  {
    draft: {
      mode: 'writing',
      task_type: 'task2',
      task_genre: 'Opinion',
      topic: 'Thesis',
      original_text: 'I totally agree with this opinion because it has many benefits.',
      upgraded_text: 'I strongly agree with this view, as the benefits clearly outweigh the drawbacks.',
      explanation: '"Strongly agree" and "this view" sound more academic. Give the reason in the same sentence.',
      reusable_pattern: 'I strongly agree with this view, as ___ clearly outweigh ___.',
      note_type: 'correction',
      error_type: 'Collocations',
      error_pattern: 'totally agree with this opinion',
      fix_pattern: 'strongly agree with this view',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 16, ratings: ['easy', 'easy', 'easy'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task2',
      task_genre: 'Problem / Solution',
      topic: 'Cause and Effect',
      original_text: 'This problem makes many people become unemployed.',
      upgraded_text: 'This problem leaves many people unemployed.',
      explanation: '"Make someone become" is not natural. "Leave someone + adjective" describes the result.',
      example_sentence: 'Automation in factories leaves many low-skilled workers unemployed.',
      note_type: 'correction',
      error_type: 'Writing Grammar',
      error_pattern: 'make + someone + become',
      fix_pattern: 'leave + someone + adjective',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 7, ratings: ['good', 'good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task2',
      task_genre: 'Discussion',
      topic: 'Concession',
      original_text: 'Although online learning is convenient, but it cannot replace teachers.',
      upgraded_text: 'Although online learning is convenient, it cannot fully replace teachers.',
      explanation: 'Use "although" or "but", not both. One linking word joins the two ideas.',
      reusable_pattern: 'Although ___, ___.',
      note_type: 'grammar_pattern',
      error_type: 'Writing Grammar',
      error_pattern: 'although …, but …',
      fix_pattern: 'although …, … (no "but")',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 6, ratings: ['good', 'easy'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task2',
      task_genre: 'Advantages / Disadvantages',
      topic: 'Explanation',
      original_text: 'Education plays an importance role in society.',
      upgraded_text: 'Education plays an important role in society.',
      explanation: 'Use the adjective "important" before a noun. "Importance" is the noun.',
      example_sentence: 'Public libraries play an important role in giving everyone access to books.',
      note_type: 'correction',
      error_type: 'Word Forms',
      error_pattern: 'importance + noun',
      fix_pattern: 'important + noun',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 19, ratings: ['easy', 'easy', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task2',
      task_genre: 'Problem / Solution',
      topic: 'Conclusion',
      original_text: 'In conclusion, I think the government should have more policies to solve it.',
      upgraded_text: 'In conclusion, governments should introduce stricter policies to tackle this issue.',
      explanation: '"Introduce policies" and "tackle an issue" are strong collocations. Name the issue instead of writing "it".',
      note_type: 'correction',
      error_type: 'Collocations',
      error_pattern: 'have policies',
      fix_pattern: 'introduce policies',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 2, ratings: ['good', 'good'] },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task2',
      task_genre: 'Opinion',
      topic: 'Concession',
      upgraded_text: 'Admittedly, online courses are flexible; however, they rarely replace classroom teaching.',
      explanation: 'Accept one point from the other side, then turn it with "however". This shows a balanced view.',
      example_sentence: 'Admittedly, studying online offers a degree of flexibility that traditional classrooms cannot match.',
      reusable_pattern: 'Admittedly, ___; however, ___.',
      recall_prompt: 'Accept a point from the other side, then argue against it.',
      note_type: 'sentence_pattern',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 0, ratings: [], paragraph: 1 },
  },
  {
    draft: {
      mode: 'writing',
      task_type: 'task2',
      task_genre: 'Two-Part Question',
      topic: 'Introduction',
      original_text: 'Nowadays, technology develops more and more.',
      upgraded_text: 'Technology has advanced rapidly in recent years.',
      explanation: 'Use the present perfect for a change that continues to now. "More and more" is vague in an essay.',
      note_type: 'correction',
      error_type: 'Tenses',
      error_pattern: 'present simple for a change up to now',
      fix_pattern: 'present perfect + in recent years',
      tags: [EXAMPLE_TAG],
    },
    plan: { daysAgo: 10, ratings: ['good', 'good'], archived: true },
  },
]

export const EXAMPLE_NOTES: NoteDraft[] = ENTRIES.map((e) => e.draft)

export interface ExampleData {
  notes: Note[]
  reviews: Review[]
  paragraphs: Paragraph[]
  lastStudied: LastStudied
}

/** A local time on the day `daysAgo` before `now`, never later than `now`. */
function at(now: Date, daysAgo: number, hour: number, minute: number): Date {
  const day = startOfDay(addDays(now, -daysAgo))
  const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute)
  if (t.getTime() <= now.getTime()) return t
  return new Date(Math.max(day.getTime(), now.getTime() - (60 - minute) * 60_000))
}

function daysAgoOf(d: Date, now: Date): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000)
}

function buildParagraph(draft: ParagraphDraft, daysAgo: number, now: Date): Paragraph {
  const created = at(now, daysAgo, 18, 0).toISOString()
  return {
    id: newId(),
    title: draft.title,
    body: draft.body,
    task_type: draft.task_type ?? '',
    task_genre: draft.task_genre ?? '',
    topic: draft.topic ?? '',
    tags: draft.tags ?? [EXAMPLE_TAG],
    is_favorite: draft.is_favorite ?? false,
    is_archived: false,
    created_at: created,
    updated_at: created,
  }
}

function blankNote(draft: NoteDraft, createdAt: Date): Note {
  const created = createdAt.toISOString()
  return {
    id: newId(),
    mode: draft.mode,
    date_created: toDayKey(createdAt),
    topic: draft.topic ?? '',
    subtopic: draft.subtopic ?? '',
    task_type: draft.mode === 'speaking' ? '' : (draft.task_type ?? ''),
    task_genre: draft.mode === 'speaking' ? '' : (draft.task_genre ?? ''),
    original_text: draft.original_text ?? '',
    upgraded_text: draft.upgraded_text,
    explanation: draft.explanation ?? '',
    example_sentence: draft.example_sentence ?? '',
    reusable_pattern: draft.reusable_pattern ?? '',
    model_paragraph: draft.model_paragraph ?? '',
    note_type: draft.note_type ?? (draft.original_text ? 'correction' : 'useful_expression'),
    error_type: draft.error_type ?? '',
    error_pattern: draft.error_pattern ?? '',
    fix_pattern: draft.fix_pattern ?? '',
    recall_prompt: draft.recall_prompt ?? '',
    tags: draft.tags ?? [EXAMPLE_TAG],
    difficulty: draft.difficulty ?? 0,
    is_favorite: draft.is_favorite ?? false,
    ...initialSchedule('today', createdAt),
    last_reviewed_at: null,
    times_reviewed: 0,
    times_seen: 1,
    source_paragraph_id: null,
    is_archived: false,
    archived_at: null,
    created_at: created,
    updated_at: created,
  }
}

/** Plays the plan forward: each review happens on the first study day on or after the due day. */
function simulate(note: Note, plan: ExamplePlan, index: number, now: Date): { note: Note; reviews: Review[] } {
  let current = note
  const reviews: Review[] = []
  for (const rating of plan.ratings) {
    const dueDaysAgo = current.next_review_at ? daysAgoOf(new Date(current.next_review_at), now) : -1
    const studyDay = STUDY_DAYS.find((d) => d <= dueDaysAgo && d <= plan.daysAgo)
    if (studyDay === undefined) break
    const reviewedAt = at(now, studyDay, 20, 15 + (index % 40))
    const r = schedule(current, rating, reviewedAt)
    const type = pickReviewType(current, 'mixed')
    reviews.push({
      id: newId(),
      note_id: current.id,
      review_date: toDayKey(reviewedAt),
      rating,
      review_type: type,
      previous_stage: current.review_stage,
      new_stage: r.review_stage,
      previous_interval: r.previous_interval,
      new_interval: r.new_interval,
      created_at: reviewedAt.toISOString(),
    })
    current = {
      ...current,
      review_stage: r.review_stage,
      mastery_status: r.mastery_status,
      next_review_at: r.next_review_at,
      last_reviewed_at: reviewedAt.toISOString(),
      times_reviewed: current.times_reviewed + 1,
      updated_at: reviewedAt.toISOString(),
    }
  }
  return { note: current, reviews }
}

/** Builds the example notebook relative to `now`. Pass existing example paragraphs to link to them instead of new ones. */
export function buildExampleData(now: Date, existingParagraphs: Paragraph[] = []): ExampleData {
  const paragraphs = EXAMPLE_PARAGRAPHS.map(
    (draft, i) => existingParagraphs.find((p) => p.title === draft.title) ?? buildParagraph(draft, PARAGRAPH_DAYS_AGO[i] ?? 0, now),
  )
  const notes: Note[] = []
  const reviews: Review[] = []
  ENTRIES.forEach(({ draft, plan }, index) => {
    const createdAt = at(now, plan.daysAgo, 19, index % 50)
    const base = blankNote(draft, createdAt)
    if (plan.paragraph !== undefined) base.source_paragraph_id = paragraphs[plan.paragraph]?.id ?? null
    const simulated = simulate(base, plan, index, now)
    let note = simulated.note
    if (plan.timesSeen) note = { ...note, times_seen: plan.timesSeen }
    if (plan.archived) {
      const archivedAt = at(now, 1, 21, 0).toISOString()
      note = { ...note, is_archived: true, archived_at: archivedAt, updated_at: archivedAt }
    }
    notes.push(note)
    reviews.push(...simulated.reviews)
  })
  return {
    notes,
    reviews,
    paragraphs: paragraphs.filter((p) => !existingParagraphs.includes(p)),
    lastStudied: { mode: 'writing', task_type: 'task1', topic: 'Stability', at: at(now, 1, 21, 30).toISOString() },
  }
}
