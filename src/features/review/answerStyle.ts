import { plainText } from '@/lib/text'

/**
 * Design v1.2 rule 7: a short answer is set in the 40px serif, like a correction written into the journal.
 * Instrument Serif is narrow, so long Writing upgrades (3 lines or more) read slower in it; from about
 * 90 characters the answer stays in Inter (concept A README, "Serif answer").
 */
export const SERIF_ANSWER_MAX_CHARS = 90

/**
 * True when the answer is short enough for the serif: under 90 characters of plain text.
 * Markdown marks (**bold**, *italic*) do not count, and runs of spaces or line breaks count as one space.
 */
export function isSerifAnswer(answer: string): boolean {
  const plain = plainText(answer).replace(/\s+/g, ' ').trim()
  return Array.from(plain).length < SERIF_ANSWER_MAX_CHARS
}
