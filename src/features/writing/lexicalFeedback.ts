import type { LexicalRule, WritingLesson } from './curriculum'

export interface SentenceFeedback {
  sentence: string
  upgraded: string
  issues: { original: string; replacement: string; why: string }[]
}

export interface LexicalFeedback {
  band: number
  wordCount: number
  inRange: boolean
  usedTargets: string[]
  missingTargets: string[]
  sentences: SentenceFeedback[]
  summary: string
}

const GENERAL_RULES: readonly LexicalRule[] = [
  { find: '\\ba lot of\\b', replacement: 'a substantial number of', why: 'A lot of is conversational; choose a more precise quantity phrase.' },
  { find: '\\bmore and more\\b', replacement: 'an increasing number of', why: 'An increasing number of is usually more controlled in academic writing.' },
  { find: '\\bthing(?:s)?\\b', replacement: 'factor', why: 'Thing is vague; name the factor, measure, effect or issue whenever possible.' },
  { find: '\\bget(?:s|ting)? better\\b', replacement: 'improves', why: 'Improve is more concise and formal than get better.' },
  { find: '\\bget(?:s|ting)? worse\\b', replacement: 'deteriorates', why: 'Deteriorate is a precise formal verb for becoming worse.' },
]

function words(text: string): string[] {
  return text.trim().match(/[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*/g) ?? []
}

function sentences(text: string): string[] {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return []
  return clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean)
}

function findTarget(text: string, matches: string[]): boolean {
  const lower = text.toLocaleLowerCase()
  return matches.some((match) => lower.includes(match.toLocaleLowerCase()))
}

function applyRules(sentence: string, rules: readonly LexicalRule[]): SentenceFeedback {
  let upgraded = sentence
  const issues: SentenceFeedback['issues'] = []
  for (const rule of rules) {
    const pattern = new RegExp(rule.find, 'i')
    const match = upgraded.match(pattern)
    if (!match) continue
    const original = match[0]
    const next = upgraded.replace(pattern, rule.replacement)
    const replacementMatch = next.slice(match.index ?? 0, (match.index ?? 0) + Math.max(rule.replacement.length, 1))
    issues.push({ original, replacement: replacementMatch || rule.replacement, why: rule.why })
    upgraded = next
  }
  return { sentence, upgraded, issues }
}

/**
 * A deliberately transparent practice estimate, not an IELTS scoring model. It rewards the lesson's target
 * collocations, checks the assigned length and flags only explicit awkward patterns that we can explain.
 */
export function evaluateLexis(answer: string, lesson: WritingLesson): LexicalFeedback {
  const wordCount = words(answer).length
  const inRange = wordCount >= lesson.minWords && wordCount <= lesson.maxWords
  const usedTargets = lesson.targets.filter((target) => findTarget(answer, target.matches)).map((target) => target.label)
  const missingTargets = lesson.targets.filter((target) => !findTarget(answer, target.matches)).map((target) => target.label)
  const checked = sentences(answer).map((sentence) => applyRules(sentence, [...lesson.rules, ...GENERAL_RULES]))
  const issueCount = checked.reduce((sum, sentence) => sum + sentence.issues.length, 0)
  const coverage = usedTargets.length / lesson.targets.length
  const raw = 5.5 + coverage * 1.5 + (inRange ? 0.5 : 0) - Math.min(issueCount, 2) * 0.25
  const band = Math.max(5.5, Math.min(7.5, Math.round(raw * 2) / 2))

  let summary: string
  if (band >= 7) {
    summary = 'The vocabulary is generally precise, controlled and appropriate for the task. Keep checking that every strong phrase accurately matches the data or claim.'
  } else if (usedTargets.length >= 2) {
    summary = 'You are using some natural target language, but greater consistency and precision are needed for a secure Band 7 lexical performance.'
  } else {
    summary = 'The meaning is understandable, but the response needs more of today’s precise collocations and fewer general-purpose phrases.'
  }

  return { band, wordCount, inRange, usedTargets, missingTargets, sentences: checked, summary }
}
