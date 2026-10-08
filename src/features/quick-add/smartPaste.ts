/**
 * Smart paste (plan C1): a labelled ChatGPT correction pasted into one field can fill several fields.
 * parseSmartPaste (lib/text) finds the parts; these helpers decide what to offer and what Fill writes.
 */
import { parseSmartPaste, type SmartPasteResult } from '@/lib/text'
import { TEXT_KEYS, type FormValues, type TextKey } from './form'

export interface PasteOffer {
  /** The field the text was pasted into. */
  field: TextKey
  /** The pasted block, with line ends as a textarea stores them. */
  pasted: string
  parsed: SmartPasteResult
}

/** Textareas store line ends as \n, whatever the clipboard had. */
export function normalizePasted(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

export function makeOffer(field: TextKey, pastedText: string): PasteOffer | null {
  const pasted = normalizePasted(pastedText)
  if (!pasted.trim()) return null
  const parsed = parseSmartPaste(pasted)
  return parsed ? { field, pasted, parsed } : null
}

/** The fields Fill would write, in note order. */
export function offerFields(offer: PasteOffer): TextKey[] {
  return TEXT_KEYS.filter((k) => (offer.parsed[k] ?? '').trim() !== '')
}

/** The offer is shown only while the pasted block is still in its field (editing it away hides the bar). */
export function isOfferLive(v: FormValues, offer: PasteOffer | null): offer is PasteOffer {
  return offer !== null && v[offer.field].includes(offer.pasted)
}

/**
 * Writes each parsed part into its field. In the field the text was pasted into, only the pasted
 * block is replaced, so words typed before the paste stay.
 */
export function applyOffer(v: FormValues, offer: PasteOffer): FormValues {
  const next: FormValues = { ...v }
  const current = v[offer.field]
  const at = current.lastIndexOf(offer.pasted)
  const own = offer.parsed[offer.field] ?? ''
  if (at >= 0) {
    next[offer.field] = (current.slice(0, at) + own + current.slice(at + offer.pasted.length)).trim()
  }
  for (const key of offerFields(offer)) {
    if (key !== offer.field) next[key] = offer.parsed[key] ?? ''
  }
  return next
}

/**
 * Topic is a short label. Text that reads like a sentence or a pasted correction belongs in the
 * first text field instead (the cursor starts in Topic, so a quick paste often lands there).
 */
export function looksLikeNoteText(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/\n/.test(t) || t.length > 48) return true
  return /[.!?…]["'”’)]*$/.test(t) && t.split(/\s+/).length >= 3
}
