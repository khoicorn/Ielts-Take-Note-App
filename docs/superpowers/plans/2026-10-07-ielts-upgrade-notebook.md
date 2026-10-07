# IELTS Upgrade Notebook Implementation Plan

> **For agentic workers:** This plan is executed by multi-agent workflows. Each task has one owner agent. Only edit files your task owns. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the IELTS Upgrade Notebook described in the brief: fast capture of personal corrections, calm spaced review, and an editorial notebook UI.

**Architecture:** A local-first React SPA. All data sits in IndexedDB through Dexie. Pure logic (scheduling, search, paste parsing, diff) lives in `src/lib` with unit tests. Live queries (`useLiveQuery`) feed screens. A shared design system in `src/components` and an app shell in `src/app` wrap feature folders in `src/features/<screen>`.

**Tech Stack:** Vite 8, React 19, TypeScript 7 (strict), React Router 8, Dexie 4, dexie-react-hooks, Tailwind 4 (locked theme), lucide-react, vite-plugin-pwa, Vitest 5 + jsdom + fake-indexeddb + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-ielts-upgrade-notebook-design.md` (technical) and `docs/product-brief.md` (product, UX, visuals). Read both before starting your task. The brief wins on UX and visuals.

## Global Constraints

- Shared contract files `src/lib/types.ts`, `src/lib/taxonomy.ts`, `src/styles/index.css` are owned by the lead. Read them. Do not edit them. If you need a change, write it under "Requests" in your final report.
- Tailwind theme is locked (see `CLAUDE.md`). Use only the token class names listed there.
- Radii: inputs and small controls 6px (`rounded-sm`), cards max 8px (`rounded-md`), dialogs and large containers 10px (`rounded-lg`). `rounded-full` only for small tags.
- Shadows: none, except `shadow-float` on popovers, menus and dialogs.
- Borders: `border-line` hairlines. Prefer horizontal separators to boxes (brief §2 Principle 2).
- Type: page title `font-serif text-title` regular weight. Section title `text-section` (serif or sans, weight 400–500). Primary note text `text-note`. Body `text-body` / `text-body-lg`. Metadata `text-meta` / `text-small` in `text-graphite`. Avoid `font-bold` except `**bold**` inside note text; use `font-medium` sparingly.
- Reading columns max 760px (`max-w-[760px]`). Tables may be wider.
- Motion 150–220ms fades and underline moves only. `prefers-reduced-motion` is handled globally in CSS; do not add JS animation loops.
- Mistake text: `text-crimson`, smaller than the upgrade, labeled with the field label. Upgrade text: `text-ink` or `text-upgrade`, larger. The upgrade must stand out more (brief §18).
- Mastery: symbol plus word (`✦ Mastered`), or symbol with `aria-label` where space is tight (brief §39).
- Field labels come from `FIELD_LABELS[mode]` in taxonomy. Exact brief strings: "Begin Review", "Reveal", "Again", "Hard", "Good", "Easy", "Recall the better version", "Better English", "Context", "My Mistakes", "Error Ledger", "Must Remember", "Essential Notes", "More details", "Add first note".
- Microcopy (brief §36): "Marked as mastered.", "Review again soon.", "N days of consistent study.". No exclamation marks. No emoji except ○ ◔ ◑ ✦.
- Breakpoints: `<640px` mobile (bottom bar), `640–1023px` icon rail 64px, `≥1024px` sidebar 232px.
- Touch targets ≥44px under 640px (`min-h-11`).
- Keyboard: single-letter shortcuts never fire while focus is in an input, textarea, select or contenteditable.
- No `dangerouslySetInnerHTML`. Note text renders through `<Markdown>`.
- Every date function takes `now: Date` (default `new Date()`) so tests can pin time.
- IDs: `newId()` from `@/lib/ids` (wraps `crypto.randomUUID()`).
- Do not add npm dependencies. Do not edit `package.json`, `vite.config.ts`, `tsconfig.json`.
- Tests: Vitest, co-located `*.test.ts(x)`. `fake-indexeddb/auto` is loaded by `src/test/setup.ts`. Reset the DB in `beforeEach` with `await resetDb()` from `@/lib/db`.
- Typecheck: `npm run typecheck`. While other agents work in parallel, errors may appear in files you do not own. Fix only errors in your files. Report the others.
- Do not commit. The lead commits after each workflow.

## Review Focus

1. **Pasted ChatGPT HTML** with headings, nested lists, code spans, emoji, `<br>` and `&nbsp;` → readable Markdown subset, no lost words. Pinned in Task A (`text.test.ts`, cases T1–T9).
2. **A note with only `upgraded_text`** (no original, example, pattern or topic) → every screen and Review renders without empty labels, "undefined", or crashes. Pinned in Task A (`reviewTypes.test.ts` R9) and Task B (`NotePair.test.tsx`).
3. **Very long text and unbroken strings** (a 500-word explanation, a 120-character URL) → wraps, no horizontal page scroll at 390px. Use `break-words` / `[overflow-wrap:anywhere]` on note text. Pinned in Task B (`NotePair.test.tsx` checks the class) and in QA screenshots.
4. **Local day boundaries**: a review at 23:59 and a check at 00:01 the next day; DST change days. Due counts and calendar must use local days. Pinned in Task A (`dates.test.ts` D6–D8, `srs.test.ts` S10) and run once with `TZ=America/New_York`.
5. **Importing an old, partial, foreign or repeated JSON backup** → friendly error for foreign files, missing fields filled with defaults, importing the same backup twice adds nothing. Pinned in Task A (`exporters.test.ts` E5–E8, `repo.test.ts` P12–P13).

---

## Phase 0 (lead, done)

- [x] Scaffold: `package.json`, `tsconfig.json`, `vite.config.ts` (React, Tailwind, PWA, Vitest), `index.html` (theme bootstrap), `playwright.config.ts`, `src/main.tsx`, `src/test/setup.ts`.
- [x] Tokens: `src/styles/index.css`.
- [x] Contract: `src/lib/types.ts`, `src/lib/taxonomy.ts`.
- [x] Commit.

---

## Workflow 1: Foundation

### Task A: Data layer and logic

**Owner files:** everything under `src/lib/` except `types.ts` and `taxonomy.ts`, plus `src/styles/tokens.test.ts`.

**Files:**
- Create: `src/lib/ids.ts`, `dates.ts`, `srs.ts`, `session.ts`, `diff.ts`, `text.ts`, `markdown.tsx`, `reviewTypes.ts`, `search.ts`, `filters.ts`, `mistakes.ts`, `exporters.ts`, `db.ts`, `repo.ts`, `hooks.ts`, `seed.ts`
- Test: `src/lib/<module>.test.ts(x)` for each module above except `ids.ts`, `hooks.ts`, `seed.ts`; plus `src/styles/tokens.test.ts`

**Interfaces (Produces). Later tasks rely on these exact names and types.**

```ts
// ids.ts
export function newId(): string

// dates.ts  (all functions use the local time zone)
export function toDayKey(d: Date | ISODateTime): DayKey            // 'YYYY-MM-DD'
export function todayKey(now?: Date): DayKey
export function dayKeyToDate(k: DayKey): Date                     // local midnight
export function startOfDay(d: Date): Date
export function endOfDay(d: Date): Date                           // 23:59:59.999 local
export function addDays(d: Date, n: number): Date                 // calendar days, DST safe
export function daysBetween(from: DayKey, to: DayKey): number     // to - from, whole days
export function formatLongDate(d: Date): string                   // "Wednesday, 7 October"
export function formatShortDate(d: Date | ISODateTime | DayKey, now?: Date): string // "7 Oct", or "7 Oct 2025" if not this year
export function formatRelativeDay(d: Date | ISODateTime | DayKey, now?: Date): string // "today" | "yesterday" | "3 days ago" (2–6) | formatShortDate
export function formatInterval(days: number): string              // 0 "Today", 1 "Tomorrow", 2–6 "N days", 7 "1 week", 14 "2 weeks", 30 "1 month", 60 "2 months", 120 "4 months"; other values: <7 days, <30 weeks (rounded), else months (rounded)
export function formatDue(next: ISODateTime | null, now?: Date): string // null "Not scheduled"; on or before end of today "Due today"; tomorrow "Tomorrow"; 2–13 days "In N days"; later formatShortDate

// srs.ts
export function intervalForStage(stage: ReviewStage): number      // STAGE_INTERVALS[stage]
export function masteryForStage(stage: ReviewStage): MasteryStatus // 0 new, 1–2 learning, 3–4 familiar, 5–7 mastered
export function firstStageOf(m: MasteryStatus): ReviewStage       // new 0, learning 1, familiar 3, mastered 5
export interface ScheduleResult {
  review_stage: ReviewStage
  mastery_status: MasteryStatus
  next_review_at: ISODateTime
  previous_interval: number
  new_interval: number
  requeue: boolean                                                // true only for 'again'
}
export function schedule(note: Pick<Note, 'review_stage'>, rating: Rating, now: Date): ScheduleResult
export function previewIntervals(note: Pick<Note, 'review_stage'>): Record<Rating, number> // days, for button hints
export function initialSchedule(start: ReviewStart, now: Date): Pick<Note, 'review_stage' | 'mastery_status' | 'next_review_at'>
export function manualMastery(m: MasteryStatus, now: Date): Pick<Note, 'review_stage' | 'mastery_status' | 'next_review_at'>
export function isDue(note: Pick<Note, 'next_review_at' | 'is_archived'>, now: Date): boolean

// session.ts
export function buildSessionQueue(notes: Note[], opts: { now: Date; size: number; mode?: Mode }): Note[]

// diff.ts
export interface DiffToken { text: string; kind: 'same' | 'added' | 'removed' }
export function tokenizeWords(s: string): string[]                // words and punctuation; whitespace dropped
export function joinTokens(tokens: string[]): string              // no space before , . ; : ! ? ) and after (
export function wordDiff(from: string, to: string): DiffToken[]   // LCS over tokens, compared case-insensitively with quotes normalized

// text.ts
export function htmlToMarkdown(html: string): string
export function stripWrappingQuotes(s: string): string            // removes ONE pair of matching wrapping quotes: "…" “…” '…' ‘…’ «…»
export function cleanSentence(s: string): string                  // trim, stripWrappingQuotes, collapse runs of spaces (keep newlines)
export function plainText(md: string): string                     // removes ** * list markers; ___ stays
export function normalizeText(s: string): string                  // NFKD, strip diacritics, lowercase, curly→straight quotes, punctuation→space (keep in-word apostrophes and +), collapse spaces, trim
export function normalizeTag(s: string): string                   // lowercase, trim, inner spaces → '-', strip leading '#'
export interface SmartPasteResult {
  original_text?: string
  upgraded_text?: string
  explanation?: string
  example_sentence?: string
  reusable_pattern?: string
  fieldCount: number
}
export function parseSmartPaste(text: string): SmartPasteResult | null // null unless upgraded_text found AND fieldCount >= 2
export function extractSentence(text: string, start: number, end: number): string // full sentence(s) containing [start,end)

// markdown.tsx
export type MdInline = { type: 'text' | 'bold' | 'italic' | 'slot'; text: string }
export type MdBlock = { type: 'p'; inline: MdInline[] } | { type: 'ul' | 'ol'; items: MdInline[][] }
export function parseInline(src: string): MdInline[]
export function parseMarkdown(src: string): MdBlock[]
export function Markdown(props: { text: string; inline?: boolean; className?: string; highlight?: string }): React.JSX.Element
// inline: render inline nodes only (no <p>), newlines → <br>. highlight: query; matches wrapped in <mark className="bg-gold/25 text-current rounded-xs">.
// slot (3+ underscores) renders <span role="img" aria-label="blank" className="inline-block min-w-12 border-b border-current align-baseline" />

// reviewTypes.ts
export interface BlankTarget { sentence: string; start: number; end: number; answer: string } // indices into plainText(sentence)
export function findBlank(note: Note): BlankTarget | null
export function availableReviewTypes(note: Note): ReviewType[]   // order: upgrade, phrase_to_sentence, fill_blank, pattern_recall
export function pickReviewType(note: Note, style: ReviewStyle): ReviewType
export interface ReviewCard {
  type: ReviewType
  promptLabel: string     // e.g. "Recall the better version"
  prompt: string          // Markdown subset
  promptHint?: string     // e.g. "What I said"
  answerLabel: string     // e.g. "Better English"
  answer: string
  context?: string        // example sentence
  pattern?: string
  explanation?: string
  blank?: { before: string; after: string; answer: string }
}
export function buildReviewCard(note: Note, type: ReviewType): ReviewCard
export function compareAnswer(typed: string, expected: string): DiffToken[]

// search.ts
export function stem(word: string): string
export type SearchField =
  | 'upgraded_text' | 'original_text' | 'reusable_pattern' | 'example_sentence' | 'error_pattern' | 'fix_pattern'
  | 'explanation' | 'topic' | 'tags' | 'subtopic' | 'model_paragraph' | 'title' | 'body'
export type SearchHit =
  | { kind: 'note'; note: Note; score: number; field: SearchField; snippet: string }
  | { kind: 'paragraph'; paragraph: Paragraph; score: number; field: SearchField; snippet: string }
export function searchAll(query: string, notes: Note[], paragraphs: Paragraph[], limit?: number): SearchHit[] // default limit 50
export function matchRanges(text: string, query: string): Array<[number, number]> // ranges in the ORIGINAL text covering each WHOLE word that matches a query token (same rule as searchAll), merged, sorted

// filters.ts
export type SortKey = 'created_desc' | 'created_asc' | 'next_review' | 'topic' | 'mastery'
export function applyFilter(notes: Note[], f: NoteFilter, now: Date): Note[]
export function sortNotes(notes: Note[], key: SortKey): Note[]
export function filterFromSearchParams(sp: URLSearchParams): NoteFilter
export function filterToSearchParams(f: NoteFilter, base?: URLSearchParams): URLSearchParams // keeps unrelated keys from base
export function countActiveFilters(f: NoteFilter): number         // archived is not counted
// URL keys: mode, topic (repeat), task, error (repeat), type (repeat), mastery (repeat), status, fav=1, from, to, archived=1

// mistakes.ts
export interface LedgerPattern { key: string; error_pattern: string; fix_pattern: string; seen: number; notes: Note[]; last_seen_at: ISODateTime }
export interface LedgerGroup { error_type: string; seen: number; patterns: LedgerPattern[]; loose: Note[] }
export function buildLedger(notes: Note[], errorTypeOrder: readonly string[]): LedgerGroup[]
export function mostRepeatedIssue(notes: Note[], now: Date, days?: number): { error_type: string; count: number } | null
export function errorTypeSlug(errorType: string): string          // "Word Forms" → "word-forms" (anchor ids)

// exporters.ts
export class ImportError extends Error {}
export function toJSON(bundle: ExportBundle): string              // pretty, 2 spaces
export function toCSV(notes: Note[]): string
export function toMarkdown(notes: Note[], paragraphs: Paragraph[]): string
export function parseImport(text: string): ExportBundle           // throws ImportError with a plain-English message
export function exportFileName(ext: 'json' | 'csv' | 'md', now?: Date): string // "ielts-notebook-2026-10-07.json"
export function downloadText(filename: string, content: string, mime: string): void

// db.ts
export class NotebookDB extends Dexie {
  notes: Table<Note, string>
  reviews: Table<Review, string>
  paragraphs: Table<Paragraph, string>
  meta: Table<{ key: string; value: unknown }, string>
}
export const db: NotebookDB
export async function resetDb(): Promise<void>                    // clears all tables (tests, "Delete all data")

// repo.ts  (every write sets updated_at; every function takes optional now)
export async function createNote(draft: NoteDraft, opts?: { start?: ReviewStart; now?: Date }): Promise<Note>
export async function updateNote(id: string, patch: NoteContentPatch, now?: Date): Promise<Note>
export async function duplicateNote(id: string, now?: Date): Promise<Note>
export async function archiveNote(id: string, now?: Date): Promise<void>
export async function restoreNote(id: string, now?: Date): Promise<void>
export async function deleteNote(id: string): Promise<void>
export async function toggleFavorite(id: string, now?: Date): Promise<boolean>
export async function setMastery(id: string, m: MasteryStatus, now?: Date): Promise<Note>
export async function markSeenAgain(id: string, now?: Date): Promise<Note>
export async function rateNote(id: string, rating: Rating, reviewType: ReviewType, now?: Date): Promise<{ note: Note; review: Review; requeue: boolean }>
export async function createParagraph(d: ParagraphDraft, now?: Date): Promise<Paragraph>
export async function updateParagraph(id: string, patch: ParagraphPatch, now?: Date): Promise<Paragraph>
export async function archiveParagraph(id: string, now?: Date): Promise<void>
export async function restoreParagraph(id: string, now?: Date): Promise<void>
export async function deleteParagraph(id: string): Promise<void>
export async function getSettings(): Promise<Settings>
export async function updateSettings(patch: Partial<Settings>): Promise<Settings> // also writes localStorage 'ielts-theme' when theme changes
export async function setLastStudied(v: Omit<LastStudied, 'at'>, now?: Date): Promise<void>
export async function markExported(now?: Date): Promise<void>
export async function exportBundle(now?: Date): Promise<ExportBundle>
export interface ImportSummary { notesAdded: number; notesUpdated: number; notesSkipped: number; reviewsAdded: number; paragraphsAdded: number; paragraphsUpdated: number }
export async function importBundle(b: ExportBundle): Promise<ImportSummary>
export async function loadExampleData(now?: Date): Promise<{ notes: number; paragraphs: number }>
export async function removeExampleData(): Promise<number>        // returns notes removed
export async function deleteAllData(): Promise<void>
export async function requestPersistentStorage(): Promise<boolean>

// hooks.ts  (useLiveQuery wrappers; undefined = loading)
export function useNotes(filter?: NoteFilter): Note[] | undefined // applyFilter + sort created_desc
export function useNote(id: string | undefined): Note | null | undefined
export function useNoteReviews(noteId: string | undefined): Review[] | undefined // newest first
export function useParagraphs(opts?: { archived?: boolean; task_type?: TaskType }): Paragraph[] | undefined
export function useParagraph(id: string | undefined): Paragraph | null | undefined
export function useNotesFromParagraph(paragraphId: string | undefined): Note[] | undefined
export interface DueCounts { total: number; speaking: number; writing: number; nextDueAt: ISODateTime | null; nextDueCount: number }
export function useDueCounts(): DueCounts | undefined
export function useSettings(): Settings                           // DEFAULT_SETTINGS until loaded
export function useLastStudied(): LastStudied | null | undefined
export function useLastExportAt(): ISODateTime | null | undefined
export function useReviewsBetween(from: DayKey, to: DayKey): Review[] | undefined
export function useTopics(mode: Mode, taskType?: TaskType): string[] // defaults, then custom, then topics used in notes; unique; case-insensitive
export function useErrorTypes(): string[]                         // ERROR_TYPES + custom + used
export function useNoteCount(): number | undefined                // non-archived
export function useStudyStreak(now?: Date): number | undefined    // consecutive local days ending today (or yesterday if nothing today) with ≥1 review or note created

// seed.ts
export const EXAMPLE_NOTES: NoteDraft[]                           // 20+ notes, all tagged 'example'
export const EXAMPLE_PARAGRAPHS: ParagraphDraft[]                 // brief §23 "Task 1 — Opposite Trends" + one Task 2 paragraph
```

**Behavior details:**

- `createNote`: throws `Error('Add the better version first.')` when `upgraded_text` is empty after trim. Applies `cleanSentence` to `original_text`, `upgraded_text`, `example_sentence`, `reusable_pattern`. Trims other strings. Tags: `normalizeTag`, unique, empty removed. Speaking forces `task_type = ''` and `task_genre = ''`. `note_type` default: `'correction'` if `original_text` is non-empty, else `'useful_expression'`. `date_created` default `todayKey(now)`. `times_seen = 1`. Review fields from `initialSchedule(opts.start ?? 'today', now)`. Calls `requestPersistentStorage()` once (meta key `persist_requested`), never throws if unsupported.
- `updateNote`: ignores keys outside `NoteContentField`. Never changes `review_stage`, `mastery_status`, `next_review_at`, `last_reviewed_at`, `times_reviewed`, `times_seen`, review rows. Same cleaning as create. Throws if the result has empty `upgraded_text`. Throws `Error('Note not found.')` for a missing id.
- `duplicateNote`: copies content fields, new id, fresh review state (`initialSchedule('today')`), `is_favorite = false`, `times_seen = 1`, not archived.
- `deleteNote`: deletes the note and its reviews in one transaction.
- `archiveNote`: `is_archived = true`, `archived_at = now`. Archived notes are never due. `restoreNote` clears both. The review state is kept.
- `rateNote`: in one transaction, `schedule()`, update note (`times_reviewed + 1`, `last_reviewed_at = now`), add a `Review` row with `review_date = todayKey(now)`. Also `setLastStudied` from the note.
- `markSeenAgain`: `times_seen + 1`, stage 1, mastery learning, `next_review_at = now`.
- `deleteParagraph`: deletes the paragraph and sets `source_paragraph_id = null` on linked notes. Notes are kept.
- `importBundle`: notes, reviews, paragraphs merge by `id`. Existing row with newer or equal `updated_at` → skipped. Older → replaced. Reviews: added if the id is new. Settings are not imported. Runs in one transaction.
- `loadExampleData`: idempotent (does nothing if any note tagged `example` exists). Gives the example notes varied states so every screen has content: about 6 due today, a few at each mastery level, `date_created` spread over the last 21 days, 3 favorites, at least 4 notes with error type Prepositions and the same `error_pattern` "visitors of + place" (the brief §28 example), and review rows on about 12 of the last 21 days so the Calendar and streak show data. Example paragraphs are tagged `example` too.
- `schedule()`: Again → stage 1, interval 1 day, `requeue = true`. Hard → stage `max(1, s)`, interval `max(1, round(intervalForStage(stage) / 2))`. Good → stage `min(7, s + 1)`. Easy → stage `min(7, s + 2)`. `next_review_at = startOfDay(addDays(now, interval)).toISOString()`. `previous_interval = intervalForStage(s)`.
- `initialSchedule`: today → stage 0, `next_review_at = now`; tomorrow → stage 0, start of tomorrow; none → stage 0, `null`. Mastery `new`.
- `manualMastery`: stage `firstStageOf(m)`; `next_review_at` = now for new, else `startOfDay(addDays(now, intervalForStage(stage)))`.
- `isDue`: not archived, `next_review_at` not null, `next_review_at <= endOfDay(now)`.
- `buildSessionQueue`: due notes, optional mode filter, sort by `next_review_at` then `created_at` ascending, take `size`, then interleave Speaking and Writing (alternate, keep each list's order, start with whichever mode has the oldest note).
- `findBlank`, in order: (1) first `**bold**` span in `example_sentence`; (2) `plainText(upgraded_text)` found case-insensitively inside the example, when the upgrade is a phrase of 1–6 words; (3) word diff original→upgraded: the first contiguous run of `added` tokens (max 4 words) placed in the upgraded sentence. Ignore runs that are only punctuation. Return null when nothing qualifies.
- `availableReviewTypes`: upgrade if original non-empty; phrase_to_sentence if original empty and example non-empty; fill_blank if `findBlank` ≠ null; pattern_recall if pattern non-empty. If the list is empty, return `['phrase_to_sentence']`.
- `pickReviewType`: style `upgrade_only` or `times_reviewed < 2` → first available. Else `available[(times_reviewed - 2) % available.length]`.
- `buildReviewCard` labels: upgrade → promptLabel "Recall the better version", promptHint the mode's original label, answerLabel "Better English", context = example. phrase_to_sentence → promptLabel "Use it in a full sentence", prompt = upgraded, answerLabel "In context", answer = example (fallback: upgraded). fill_blank → promptLabel "Fill in the blank", prompt = before + "_____" + after, answerLabel "Answer", answer = blank answer, context = full sentence. pattern_recall → promptLabel "Pattern recall", prompt = `recall_prompt` or `"Use your pattern for: " + topic` (or "Use your pattern in a sentence." when topic is empty), answerLabel "Pattern", answer = pattern, context = example. Never put empty strings in optional fields; omit them.
- `searchAll`: excludes archived notes and paragraphs. Each record's fields are normalized and tokenized; each token is stemmed. A query token matches a field when a stemmed field token starts with the stemmed query token, or the field's normalized text contains the normalized query token (for tokens of 3+ characters). Every query token must match at least one field. Score = sum over query tokens of the best matching field weight + 5 when the whole normalized query appears in one field. Weights: upgraded 10, original 8, reusable_pattern 7, example 6, error_pattern 6, fix_pattern 6, explanation 4, topic 3, tags 3, subtopic 2, model_paragraph 2, paragraph title 6, paragraph body 3. `snippet` = the best field's plain text; for long fields (> 160 chars) a window of about 140 chars around the first match with "…". Ties: newer `updated_at` first.
- `stem`: lowercase; strip suffixes in this order, keeping a stem of at least 4 letters: `ility`, `ation`, `ness`, `ment`, `ingly`, `edly`, `ing`, `ied`→`y`, `ies`→`y`, `ed`, `ly`, `es`, `s`, `le`, `e`. So `stable`→`stab`, `stability`→`stab`, `stably`→`stab`.
- `parseSmartPaste` labels (case-insensitive, at line start, followed by `:` `-` `–` or whitespace after an emoji; may be wrapped in `**`):
  - original: `❌`, `✗`, `✘`, `wrong`, `incorrect`, `original`, `mistake`, `you said`, `what you said`, `what i said`, `my sentence`, `before`, `your sentence`
  - upgraded: `✅`, `✓`, `✔`, `better`, `better version`, `corrected`, `correction`, `correct`, `native`, `native upgrade`, `more natural`, `natural`, `improved`, `upgrade`, `band 7+`, `band 7+ upgrade`, `revised`, `after`, `suggested`
  - explanation: `why`, `explanation`, `reason`, `note`, `💡`
  - example: `example`, `in context`, `context`, `e.g.`, `model sentence`
  - pattern: `pattern`, `structure`, `template`, `formula`, `reusable pattern`
  Text after the label up to the next label is the value (multi-line allowed). Values go through `cleanSentence` (sentence fields) or trim (explanation).
- `htmlToMarkdown`: parse with `DOMParser`. `b`, `strong`, and spans with `font-weight` ≥ 600 → `**…**`. `i`, `em` → `*…*`. `p`, `div`, `h1`–`h6` → paragraphs (blank line between). `br` → newline. `ul > li` → `- `, `ol > li` → `1. ` numbered; nested lists flattened one level with the same markers. `code` → its text. `a` → its text. `&nbsp;` → space. Drop `script`, `style`, `meta`. Collapse 3+ newlines to 2. Trim. Never lose text content.
- `toCSV`: RFC 4180. Header = every Note field in `types.ts` order. Tags joined with `; `. CRLF line ends. Quote values with comma, quote, CR or LF; double inner quotes. Prefix values starting with `=`, `+`, `-`, `@` with `'` (spreadsheet formula safety). Starts with a UTF-8 BOM so Excel shows Vietnamese characters correctly.
- `toMarkdown`: grouped Speaking then Writing, then by topic. Each note: `### Topic`, `**What I Said** — …`, `**Native Upgrade** — …`, Why, In context, Pattern, metadata line. Paragraphs at the end under `## Model paragraphs`.
- `parseImport`: rejects non-JSON (`"This file is not a JSON backup."`), wrong `app` (`"This file was not exported from IELTS Upgrade Notebook."`), newer `version` (`"This backup is from a newer version of the app."`). Fills missing fields on each note, review and paragraph with defaults (old backups keep working). Drops rows without an `id` or, for notes, without `upgraded_text`.
- `buildLedger`: non-archived notes that have `error_type` or `error_pattern`. Group by `error_type` (empty → "Other"). Inside a group, notes with a non-empty `error_pattern` group by `normalizeText(error_pattern)`; `seen` = sum of `times_seen`; `fix_pattern` = the newest note's non-empty fix pattern; patterns sorted by `seen` desc. Notes without a pattern go to `loose`. Groups follow `errorTypeOrder`, then other types A–Z, "Other" last. Group `seen` = sum over all its notes.
- `mostRepeatedIssue`: non-archived notes with `error_type`, `date_created` within the last `days` (default 7) local days including today. Count notes per error type. Return the top one if count ≥ 2, else null. Ties: alphabetical.

**Tests (write first, watch them fail, then implement):**

| ID | Module | Input | Expected |
|---|---|---|---|
| D1 | dates | `formatLongDate(new Date(2026, 9, 7))` | `"Wednesday, 7 October"` |
| D2 | dates | `formatInterval` for 1, 3, 7, 14, 30, 60, 120 | Tomorrow, 3 days, 1 week, 2 weeks, 1 month, 2 months, 4 months |
| D3 | dates | `formatRelativeDay` yesterday / 3 days ago / 10 days ago | "yesterday" / "3 days ago" / "27 Sep" |
| D4 | dates | `formatDue(null)` | "Not scheduled" |
| D5 | dates | `formatDue` 08:00 today, now 20:00 | "Due today" |
| D6 | dates | `toDayKey(new Date(2026, 9, 7, 23, 59))` | "2026-10-07" (local, not UTC) |
| D7 | dates | `addDays(new Date(2026, 2, 7, 12), 1)` then `toDayKey` | "2026-03-08" (run also with `TZ=America/New_York`) |
| D8 | dates | `daysBetween('2026-03-07', '2026-03-09')` | 2 |
| S1 | srs | stage 0 + good | stage 1, interval 1, mastery learning |
| S2 | srs | stage 2 + good | stage 3, interval 7, familiar |
| S3 | srs | stage 4 + good | stage 5, interval 30, mastered |
| S4 | srs | stage 7 + easy | stage 7, interval 120 |
| S5 | srs | stage 3 + again | stage 1, interval 1, requeue true, learning |
| S6 | srs | stage 3 + hard | stage 3, interval 4 (round 7/2) |
| S7 | srs | stage 0 + hard | stage 1, interval 1 |
| S8 | srs | stage 1 + easy | stage 3, interval 7 |
| S9 | srs | `next_review_at` lands on local midnight N days ahead | `new Date(r.next_review_at).getHours() === 0` |
| S10 | srs | `isDue`: next = today 23:00, now = today 00:01 | true; next = tomorrow 00:00 → false; archived → false; null → false |
| S11 | srs | `previewIntervals({review_stage: 2})` | `{again:1, hard:2, good:7, easy:14}` |
| S12 | srs | `manualMastery('mastered', now)` | stage 5, next = start of day + 30 |
| Q1 | session | 30 due + 5 not due, size 20 | 20 notes, all due, oldest first before interleave |
| Q2 | session | 3 speaking + 3 writing due | alternating modes |
| Q3 | session | mode 'writing' | only writing |
| Q4 | session | archived due note | excluded |
| W1 | diff | "visitors of the City Zoo" → "visitors to the City Zoo" | removed "of", added "to", rest same |
| W2 | diff | `joinTokens(['Hello', ',', 'world', '.'])` | "Hello, world." |
| W3 | diff | case and curly quotes differ only | all same |
| T1 | text | `<p><strong>Better:</strong> The scenery was beautiful.</p>` | `**Better:** The scenery was beautiful.` |
| T2 | text | `<ul><li>one</li><li>two</li></ul>` | `- one\n- two` |
| T3 | text | `<ol><li>a</li><li>b</li></ol>` | `1. a\n2. b` |
| T4 | text | `<p>a</p><p>b</p>` | `a\n\nb` |
| T5 | text | `line<br>next` | `line\nnext` |
| T6 | text | `<h3>Why</h3><p>x&nbsp;y</p>` | `Why\n\nx y` |
| T7 | text | nested `<ul><li>a<ul><li>b</li></ul></li></ul>` | contains `- a` and `- b` |
| T8 | text | `<span style="font-weight:600">bold</span> <code>x</code> 😊` | `**bold** x 😊` |
| T9 | text | `<script>alert(1)</script><p>keep</p>` | `keep` |
| T10 | text | `stripWrappingQuotes('“We enjoyed the scenario.”')` | `We enjoyed the scenario.` |
| T11 | text | `stripWrappingQuotes('"a" and "b"')` | unchanged (not one wrapping pair) |
| T12 | text | smart paste: `❌ We enjoyed the scenario.\n✅ The scenery was beautiful.` | original + upgraded, fieldCount 2 |
| T13 | text | smart paste: `Original: I don't customize other factors.\nMore natural: I'm pretty flexible about the rest.\nWhy: "customize" sounds technical.\nExample: I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest.` | 4 fields mapped |
| T14 | text | smart paste: `**Better version:** The number of visitors to the City Zoo increased steadily.\n**Pattern:** The number of visitors to ___ increased steadily from ___ to ___.` | upgraded + pattern |
| T15 | text | smart paste: a plain sentence with no labels | null |
| T16 | text | `extractSentence` of "experienced a steady decline" in the §23 paragraph | `"The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions."` |
| T17 | text | `normalizeText('“Visitors’ – TO!”')` | `visitors' to` |
| M1 | markdown | `parseInline('a **b** *c* ___ d')` | text, bold, text, italic, text, slot, text |
| M2 | markdown | `parseMarkdown('- a\n- b\n\npara')` | ul(2 items), p |
| M3 | markdown | render `highlight="stable"` on "remained relatively stable" | exactly one `<mark>`, containing "stable" (whole matched word, via `matchRanges`) |
| M4 | markdown | unclosed `**bold` | rendered as literal text, no crash |
| R1 | reviewTypes | brief §16 Travel note (original + upgraded + example) | available starts with upgrade; card promptLabel "Recall the better version", answer "The scenery was beautiful." |
| R2 | reviewTypes | example "The National Gallery **experienced** a steady decline." | findBlank answer "experienced" |
| R3 | reviewTypes | upgraded "remained relatively stable", example "Visitor numbers remained relatively stable." | blank answer "remained relatively stable" |
| R4 | reviewTypes | original "…visitors of the City Zoo…", upgraded "…visitors to the City Zoo…", no example | blank answer "to", before "The number of visitors ", after " the City Zoo increased steadily." |
| R5 | reviewTypes | no original, example present | phrase_to_sentence available, upgrade not |
| R6 | reviewTypes | pattern + recall_prompt "Describe a stable trend." | pattern_recall card prompt = recall prompt |
| R7 | reviewTypes | pickReviewType mixed, times_reviewed 0, 1 | first available both times |
| R8 | reviewTypes | pickReviewType mixed, times 2, 3, 4 with 3 available | rotates through all 3 |
| R9 | reviewTypes | note with only upgraded_text | available `['phrase_to_sentence']`; card has no empty optional fields; nothing is "undefined" |
| R10 | reviewTypes | compareAnswer("The scenery is beautiful", "The scenery was beautiful.") | "is" removed, "was" added |
| F1 | search | query "stable" over notes: "remained relatively stable" / "remained broadly unchanged" (topic Stability) / "maintained a stable level" / "increased sharply" | first 3 found, 4th not |
| F2 | search | "visitors to" | phrase match ranked above a note with only "visitors" |
| F3 | search | "scen" | finds "scenery" and "scenario" |
| F4 | search | archived note | not returned |
| F5 | search | paragraph body contains "markedly different" | paragraph hit, snippet contains it |
| F6 | search | `matchRanges('Remained relatively STABLE', 'stable')` | `[[20, 26]]` |
| F7 | search | `stem('stability') === stem('stable')` | true |
| L1 | filters | URL round trip of a filter with every key | equal object |
| L2 | filters | review_status due / new / scheduled / unscheduled | correct subsets |
| L3 | filters | date_from/date_to inclusive | correct subset |
| L4 | filters | archived undefined vs true | hides vs only archived |
| L5 | filters | countActiveFilters with mode + 2 topics + archived | 2 |
| X1 | mistakes | 4 notes "visitors of + place" (times_seen 1,1,1,1) | one pattern, seen 4, fix "visitors to + place" |
| X2 | mistakes | pattern case/spacing differences "Visitors of + place " | same group |
| X3 | mistakes | group order follows ERROR_TYPES, "Other" last | yes |
| X4 | mistakes | mostRepeatedIssue: 4 Prepositions this week, 1 Articles, 6 Prepositions 10 days ago | Prepositions, 4 |
| X5 | mistakes | only 1 note this week | null |
| E1 | exporters | CSV value with comma, quote, newline | quoted correctly |
| E2 | exporters | CSV value "=SUM(A1)" | "'=SUM(A1)" |
| E3 | exporters | CSV starts with BOM, header has all Note fields | yes |
| E4 | exporters | toJSON → parseImport round trip | deep equal |
| E5 | exporters | parseImport("not json") | ImportError "This file is not a JSON backup." |
| E6 | exporters | parseImport of `{"app":"other"}` | ImportError mentions IELTS Upgrade Notebook |
| E7 | exporters | old note missing `times_seen`, `error_pattern`, `is_archived` | filled with defaults |
| E8 | exporters | note without upgraded_text | dropped |
| P1 | repo | createNote cleans quotes, normalizes tags, sets defaults | yes |
| P2 | repo | createNote empty upgrade | throws "Add the better version first." |
| P3 | repo | createNote start 'none' | next_review_at null, not due |
| P4 | repo | updateNote text after 3 ratings | review_stage, mastery, next_review_at, times_reviewed, review rows unchanged |
| P5 | repo | updateNote with `{review_stage: 0}` cast in | ignored |
| P6 | repo | rateNote good | note stage +1, review row written with correct stages and intervals |
| P7 | repo | deleteNote | note and its reviews gone, other notes' reviews kept |
| P8 | repo | archive → not in due counts; restore → back | yes |
| P9 | repo | duplicateNote | new id, same text, fresh review state |
| P10 | repo | markSeenAgain | times_seen 2, stage 1, due now |
| P11 | repo | deleteParagraph | linked notes keep, `source_paragraph_id` null |
| P12 | repo | importBundle twice with the same bundle | second run: 0 added, 0 updated |
| P13 | repo | importBundle where incoming note is newer | updated; older → skipped |
| P14 | repo | loadExampleData twice | second call adds 0; data covers due, all mastery levels, favorites, 4× "visitors of + place" |
| P15 | repo | removeExampleData | only example-tagged notes and paragraphs removed |
| C1 | tokens | parse `src/styles/index.css`; for light and dark: ink, graphite, indigo, plum, crimson, upgrade on page and paper ≥ 4.5:1; ink on stone ≥ 4.5:1; on-accent on indigo ≥ 4.5:1 | all pass |

- [ ] **Step 1:** Write the tests above (one file per module). Run `npx vitest run src/lib src/styles` and confirm they fail.
- [ ] **Step 2:** Implement modules in dependency order: ids, dates, srs, session, diff, text, markdown, reviewTypes, search, filters, mistakes, exporters, db, repo, hooks, seed.
- [ ] **Step 3:** Run `npx vitest run src/lib src/styles` until all pass. Run `TZ=America/New_York npx vitest run src/lib/dates.test.ts src/lib/srs.test.ts`.
- [ ] **Step 4:** Run `npm run typecheck`. Fix errors in your files.

### Task B: Design system, app shell, overlays, keyboard, PWA assets

**Owner files:** everything under `src/app/` and `src/components/`, `public/`, `scripts/`, and the stub files listed below in `src/features/` (stubs only; screen tasks replace them).

**Files:**
- Create `src/app/`: `App.tsx` (replace scaffold), `AppShell.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `MobileTopBar.tsx`, `nav.ts`, `theme.tsx`, `hotkeys.ts`, `GlobalHotkeys.tsx`, `overlays.tsx`, `ShortcutsDialog.tsx`, `UpdatePrompt.tsx`, `DesignPreview.tsx` (route `/design`, hidden from nav: every component in every state, for QA screenshots), `NotFound.tsx`
- Create `src/components/ui/`: `Button.tsx`, `IconButton.tsx`, `Field.tsx` (Field, TextInput, TextArea, Select, Checkbox, Switch), `Combobox.tsx`, `TagInput.tsx`, `Tabs.tsx` (UnderlineTabs, ModeTabs, SegmentedControl), `Dialog.tsx`, `Popover.tsx` (Popover, Menu), `Tooltip.tsx`, `Tag.tsx`, `Kbd.tsx`, `Ornament.tsx`, `EmptyState.tsx`, `PageHeader.tsx`, `Section.tsx`, `MasteryMark.tsx`, `FavoriteStar.tsx`, `Toast.tsx`, `Confirm.tsx`, `VisuallyHidden.tsx`, `icons.tsx`
- Create `src/components/notes/`: `NotePair.tsx`, `NoteRow.tsx`, `NoteMetaLine.tsx`, `ModeMark.tsx`, `Quote.tsx`
- Create stubs (one exported component each, rendering a `PageHeader` with the screen title): `src/features/today/TodayScreen.tsx`, `review/ReviewScreen.tsx`, `speaking/SpeakingScreen.tsx`, `writing/WritingScreen.tsx`, `paragraphs/ParagraphScreen.tsx`, `paragraphs/ParagraphList.tsx`, `mistakes/MistakesScreen.tsx`, `must-remember/MustRememberScreen.tsx`, `all-notes/AllNotesScreen.tsx`, `note-detail/NoteDetailScreen.tsx`, `calendar/CalendarScreen.tsx`, `settings/SettingsScreen.tsx`, `quick-add/QuickAddDialog.tsx`, `search/SearchPalette.tsx`
- Create: `scripts/gen-icons.mjs` (renders `public/favicon.svg` to `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` with Playwright's bundled Chromium; run it once and keep the PNGs)
- Test: `src/app/hotkeys.test.ts`, `src/components/ui/Dialog.test.tsx`, `src/components/ui/Field.test.tsx`, `src/components/ui/Combobox.test.tsx`, `src/components/notes/NotePair.test.tsx`, `src/app/theme.test.tsx`

**Interfaces (Produces):**

```ts
// app/overlays.tsx
export interface QuickAddOptions {
  mode?: Mode                       // skip the Speaking/Writing choice
  prefill?: Partial<NoteDraft>
  sourceParagraphId?: string
  title?: string                    // dialog title override, e.g. "New note from paragraph"
  onSaved?: (note: Note) => void
}
export function OverlayProvider(props: { children: React.ReactNode }): React.JSX.Element
export function useQuickAdd(): { open: (opts?: QuickAddOptions) => void; close: () => void; isOpen: boolean }
export function useSearch(): { open: (initialQuery?: string) => void; close: () => void; isOpen: boolean }
export function useShortcutsHelp(): { open: () => void }
// The provider renders <QuickAddDialog open options onClose/> and <SearchPalette open initialQuery onClose/> at all times (they return null when closed).

// features/quick-add/QuickAddDialog.tsx (stub by B, real by C1)
export interface QuickAddDialogProps { open: boolean; options: QuickAddOptions; onClose: () => void }
export function QuickAddDialog(props: QuickAddDialogProps): React.JSX.Element | null
// features/search/SearchPalette.tsx (stub by B, real by C7)
export interface SearchPaletteProps { open: boolean; initialQuery: string; onClose: () => void }
export function SearchPalette(props: SearchPaletteProps): React.JSX.Element | null
// features/paragraphs/ParagraphList.tsx (stub by B, real by C6)
export function ParagraphList(props: { taskType?: TaskType }): React.JSX.Element

// app/theme.tsx
export function ThemeProvider(props: { children: React.ReactNode }): React.JSX.Element
export function useTheme(): { preference: ThemePreference; resolved: 'light' | 'dark'; setPreference: (p: ThemePreference) => void }
// Writes localStorage 'ielts-theme', sets <html data-theme>, updates <meta name="theme-color">, saves via updateSettings({theme}).

// app/hotkeys.ts
export function isTypingTarget(target: EventTarget | null): boolean
export function useHotkeys(bindings: Record<string, (e: KeyboardEvent) => void>, opts?: { enabled?: boolean; allowInInputs?: string[] }): void
// Key syntax: 'n', 'shift+?', 'mod+k' (mod = Ctrl on Windows/Linux, Cmd on macOS), 'mod+enter', 'mod+shift+enter', 'escape', 'space', '1', 'arrowup', and two-key chords 'g t' (second key within 1200ms).
// Bindings listed in allowInInputs (e.g. 'mod+enter', 'escape') also fire while typing.

// components/ui/Toast.tsx
export function ToastProvider(props: { children: React.ReactNode }): React.JSX.Element
export function useToast(): { show: (message: string, opts?: { action?: { label: string; onClick: () => void }; duration?: number }) => void }
// Bottom center (above the bottom bar on mobile), aria-live="polite", default 4s, at most 3 stacked.

// components/ui/Confirm.tsx
export interface ConfirmOptions { title: string; body?: string; confirmLabel: string; cancelLabel?: string; tone?: 'default' | 'danger'; requireText?: string }
export function ConfirmProvider(props: { children: React.ReactNode }): React.JSX.Element
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean>

// components/ui/Button.tsx
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; size?: ButtonSize; icon?: LucideIcon; iconRight?: LucideIcon; loading?: boolean; kbd?: string }
export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>
export function ButtonLink(props: Omit<ButtonProps, 'type'> & { to: string; state?: unknown }): React.JSX.Element
// primary: bg-indigo text-on-accent; secondary: border-line-strong text-ink bg-paper; ghost: text-graphite hover:bg-stone hover:text-ink; danger: text-crimson border-crimson/40. Heights sm 32 / md 40 / lg 48 (min 44 under 640px). rounded-sm.

// components/ui/IconButton.tsx
export const IconButton: React.ForwardRefExoticComponent<{ icon: LucideIcon; label: string; size?: 'sm' | 'md'; active?: boolean; tooltip?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>

// components/ui/Field.tsx
export function Field(props: { label: string; htmlFor: string; hint?: string; error?: string; optional?: boolean; children: React.ReactNode; className?: string }): React.JSX.Element
export const TextInput: React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>
export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string
  onValueChange: (v: string) => void
  minRows?: number                 // default 2; auto-grows with content
  richPaste?: boolean              // default true: HTML clipboard → htmlToMarkdown, inserted at the cursor (undo-friendly)
  onPasteText?: (pastedPlainText: string) => void // called after every paste with the inserted text (Quick Add uses it for smart split)
  variant?: 'field' | 'bare'      // bare: no border, for the focus-mode paragraph editor
}
export const TextArea: React.ForwardRefExoticComponent<TextAreaProps & React.RefAttributes<HTMLTextAreaElement>>
// Ctrl/Cmd+B wraps the selection in ** **. Ctrl/Cmd+I wraps in *.
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly (string | { value: string; label: string })[]; placeholder?: string }): React.JSX.Element
export function Checkbox(props: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }): React.JSX.Element
export function Switch(props: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }): React.JSX.Element

// components/ui/Combobox.tsx
export function Combobox(props: { id: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string; allowCreate?: boolean; 'aria-label'?: string; autoFocus?: boolean }): React.JSX.Element
// Type to filter (normalizeText contains), ↑↓ Enter Esc. With allowCreate, a last option "Use “X”" accepts free text. ARIA combobox pattern.

// components/ui/TagInput.tsx
export function TagInput(props: { id: string; value: string[]; onChange: (v: string[]) => void; suggestions?: readonly string[]; placeholder?: string }): React.JSX.Element
// Enter or comma adds (normalizeTag), Backspace on empty removes the last, chips use <Tag onRemove>.

// components/ui/Tabs.tsx
export interface TabItem { value: string; label: string; to?: string; count?: number }
export function UnderlineTabs(props: { items: TabItem[]; value: string; onChange?: (v: string) => void; 'aria-label': string; size?: 'md' | 'lg' }): React.JSX.Element
// Brief §4: plain text tabs, active = ink color + 1.5px indigo underline that slides (transform transition 180ms). Inactive = graphite. No pills. Arrow keys move between tabs.
export function ModeTabs(props: { value: Mode }): React.JSX.Element   // links to /speaking and /writing
export function SegmentedControl<T extends string>(props: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon }[]; 'aria-label': string }): React.JSX.Element

// components/ui/Dialog.tsx
export function Dialog(props: { open: boolean; onClose: () => void; title: string; hideTitle?: boolean; description?: string; size?: 'sm' | 'md' | 'lg'; placement?: 'center' | 'top'; initialFocusRef?: React.RefObject<HTMLElement | null>; footer?: React.ReactNode; children: React.ReactNode }): React.JSX.Element | null
// Portal to body. bg-scrim backdrop, panel bg-paper rounded-lg shadow-float border-line. Focus trap, Esc closes, focus returns to the opener, body scroll locked. Under 640px: md and lg become full-screen sheets (footer sticks to the bottom, respects safe-area inset). Fade 180ms.

// components/ui/Popover.tsx
export function Popover(props: { open: boolean; onOpenChange: (v: boolean) => void; trigger: React.ReactElement; align?: 'start' | 'end'; children: React.ReactNode; className?: string }): React.JSX.Element
export interface MenuItem { label: string; icon?: LucideIcon; onSelect: () => void; tone?: 'default' | 'danger'; shortcut?: string; disabled?: boolean }
export function Menu(props: { trigger: React.ReactElement; items: (MenuItem | 'separator')[]; align?: 'start' | 'end'; 'aria-label': string }): React.JSX.Element
// Menu: ARIA menu button pattern, ↑↓ Enter Esc, closes on outside click.

// components/ui/*  (smaller pieces)
export function Tooltip(props: { label: string; children: React.ReactElement; side?: 'right' | 'top' | 'bottom' }): React.JSX.Element
export function Tag(props: { children: React.ReactNode; tone?: 'neutral' | 'plum' | 'sage' | 'indigo' | 'gold'; onRemove?: () => void; title?: string }): React.JSX.Element
export function Kbd(props: { children: React.ReactNode }): React.JSX.Element
export function Ornament(props: { className?: string; symbol?: string }): React.JSX.Element   // hairline — ✦ — hairline, gold symbol, aria-hidden
export function Divider(props: { className?: string }): React.JSX.Element
export function EmptyState(props: { title: string; body: string; action?: React.ReactNode; decoration?: 'quill' | 'constellation' | 'moon' | 'book' }): React.JSX.Element
// Serif title, graphite body, thin-line SVG decoration (stroke 1, graphite/gold), centered, max-w 420px. No illustrations.
export function PageHeader(props: { title: string; eyebrow?: string; description?: string; actions?: React.ReactNode; children?: React.ReactNode }): React.JSX.Element
// eyebrow = decorative italic serif label in plum or graphite (e.g. "Error Ledger"). title = font-serif text-title. children slot for tabs under the title.
export function Section(props: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }): React.JSX.Element
export function MasteryMark(props: { status: MasteryStatus; showLabel?: boolean; className?: string }): React.JSX.Element
// symbol + label; mastered symbol in gold, others graphite; when showLabel=false, aria-label holds the word.
export function FavoriteStar(props: { active: boolean; onToggle?: () => void; className?: string }): React.JSX.Element
// With onToggle: <button aria-pressed aria-label="Must remember">. ✦ outline (graphite) → filled gold, 180ms fade. Without onToggle: static, rendered only when active.
export function VisuallyHidden(props: { children: React.ReactNode }): React.JSX.Element
export function QuillIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element
export function ConstellationIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element
export function CrescentIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element
export function SparkIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element   // four-point star

// components/notes/*
export function Quote(props: { text: string; className?: string; inline?: boolean }): React.JSX.Element // typographic quotes around <Markdown>
export function NotePair(props: { note: Note; size?: 'compact' | 'reading' | 'detail'; showLabels?: boolean; highlight?: string; className?: string }): React.JSX.Element
// Brief §18: mistake (crimson, smaller, field label) then upgrade (larger, ink or upgrade color). If original is empty, show only the upgrade. Text wraps (overflow-wrap:anywhere). compact: one line each, truncated with ellipsis. reading: full text + example in graphite. detail: large.
export function NoteRow(props: { note: Note; view?: 'compact' | 'reading'; to: string; linkState?: unknown; highlight?: string; trailing?: React.ReactNode }): React.JSX.Element
// A full-width link row with hairline bottom border, hover bg-stone/60, focus ring. Left: NotePair. Right (≥640px): topic, MasteryMark, FavoriteStar (static).
export function NoteMetaLine(props: { note: Note; now?: Date; parts?: ('mode' | 'topic' | 'type' | 'due' | 'mastery')[] }): React.JSX.Element // "Travel · Correction · Due today"
export function ModeMark(props: { mode: Mode; showLabel?: boolean }): React.JSX.Element // small plum (speaking) or sage (writing) glyph + label
```

**Shell details:**

- Nav items (`nav.ts`), in brief §3 order with lucide icons, stroke 1.5: Today (`Sun` or `CalendarCheck`… pick a calm one; suggestion `BookOpen`), Review (`RotateCcw` or `Layers`), Speaking (`MessageCircle`), Writing (`PenLine`), Mistakes (`Feather`? suggestion `ScrollText`), Must Remember (`SparkIcon` custom), All Notes (`Library`), Calendar (`CalendarDays`), Settings (`Settings`) at the bottom. Review shows the due count as small graphite text, not a red badge.
- Sidebar (≥1024px, 232px, `bg-page`, right hairline): wordmark "Upgrade Notebook" in serif with a small crescent + spark mark; a "New note" button (N hint) and a "Search" button (Ctrl K hint); nav list; Settings pinned at the bottom with a small "10 days of consistent study." line only when the streak is ≥ 2. Active item: ink text + 2px indigo bar at the left edge, no filled pill.
- Icon rail (640–1023px, 64px): icons with tooltips; New note and Search as icon buttons at the top.
- Mobile (<640px): `MobileTopBar` (page title area, search icon, menu icon opening a drawer with all nav items) and `BottomNav`: Today, Speaking, Add (center, 48px indigo circle with +; it is the one allowed round control), Writing, Review. Safe-area padding.
- `/review` renders without the shell (full screen).
- Main content area: `bg-page`; screens set their own max widths.
- Routes: as design §6, plus `/design` and a NotFound route.
- `GlobalHotkeys`: N and mod+n → `quickAdd.open()`; mod+k and `/` → `search.open()`; `shift+?` → shortcuts; `g t|r|s|w|m|f|a|c` → navigate. Disabled while a Dialog is open, except the dialog's own keys.
- `UpdatePrompt`: `useRegisterSW` from `virtual:pwa-register/react`; when `needRefresh`, a toast-like bar: "A new version is ready." [Reload].
- `index.html` theme-color meta: update on theme change.
- Paper feel: add an optional, very faint paper grain to `bg-page` via a tiny inline SVG noise data URI at ≤3% opacity, in `AppShell` only. If it reads as dirty or reduces contrast, skip it.

**Tests:**

| ID | File | Check |
|---|---|---|
| H1 | hotkeys | 'n' fires on body; does not fire when the target is an input or textarea |
| H2 | hotkeys | 'mod+enter' with `allowInInputs` fires inside a textarea |
| H3 | hotkeys | chord 'g t' fires on g then t within 1200ms; not after 1500ms |
| H4 | hotkeys | 'shift+?' fires on "?" |
| G1 | Dialog | Esc calls onClose; focus moves inside on open; returns to opener on close |
| G2 | Dialog | Tab cycles inside the panel |
| A1 | Field | TextArea paste with text/html `<p><strong>Better:</strong> x</p>` inserts `**Better:** x` and calls onPasteText |
| A2 | Field | TextArea Ctrl+B wraps the selection |
| B1 | Combobox | typing filters options; Enter selects; allowCreate offers "Use “Foo”" |
| N1 | NotePair | note with original + upgrade: both rendered, upgrade font size class larger than mistake's |
| N2 | NotePair | note with only upgraded_text: no "What I Said" label, no "undefined" in the DOM |
| N3 | NotePair | text elements carry the overflow-wrap class |
| Y1 | theme | setPreference('dark') sets data-theme="dark" and localStorage 'ielts-theme' |

- [ ] **Step 1:** Write the tests above. Run `npx vitest run src/app src/components` and confirm they fail.
- [ ] **Step 2:** Build primitives, then notes components, then shell, overlays, hotkeys, theme, stubs, DesignPreview.
- [ ] **Step 3:** Generate PWA icons with `node scripts/gen-icons.mjs`. Run `npx playwright install chromium` first if needed.
- [ ] **Step 4:** Run `npx vitest run src/app src/components` until all pass. Run `npm run typecheck`, fix errors in your files.
- [ ] **Step 5:** Run `npm run dev`, open `/design` and `/` in Playwright at 1440×900 and 390×844, light and dark. Look at the screenshots. Fix anything that looks like a generic SaaS dashboard or a fantasy game (brief §43).

### Task F1: Foundation integration (after A and B)

- [ ] Run `npm run typecheck`, `npm test`, `npm run build`. Fix every cross-module mismatch (B's components calling A's functions). Prefer fixing the caller to match the contract above. Report any contract change.
- [ ] Load example data in the dev app (temporary button on `/design`) and confirm `NoteRow` and `NotePair` render seeded notes.

---

## Workflow 2: Screens

Seven agents work in parallel. Each owns one or more folders under `src/features/` and replaces the stubs there. Shared components live in `src/components`; if you need a new shared primitive, build it inside your feature folder and report it under "Requests" so the integration step can promote it.

Each screen task follows the same steps:

- [ ] **Step 1:** Read the brief sections listed for your task, the design spec, and the interfaces above. Read `src/components` and `src/lib` to learn what exists.
- [ ] **Step 2:** Write the component tests listed for your task. Run them and confirm they fail.
- [ ] **Step 3:** Build the screen.
- [ ] **Step 4:** Run your tests until they pass. Run `npm run typecheck`, fix errors in your files.
- [ ] **Step 5:** Run the app (`npm run dev`), load example notes, and screenshot your screens with Playwright at 1440×900, 834×1112 and 390×844, light and dark. View the screenshots. Apply brief §43–44. Fix and repeat until the screens look right.

### Task C1: Quick Add (brief §19–20, §2 Principle 5, §45 priority 1)

**Owns:** `src/features/quick-add/**`

- Step 1 of the dialog: "What are you saving?" Two options, side by side: **Speaking** ("What I said → Native upgrade") and **Writing** ("My sentence → Band 7+ upgrade"). Keys S / W or 1 / 2. The last-used mode is focused, so Enter continues. Skipped when `options.mode` is set.
- Step 2, Speaking: Topic (Combobox with `useTopics('speaking')`, allowCreate), What I Said (TextArea), Native Upgrade (TextArea, required), Example Sentence (TextArea, label "In context"), Save.
- Step 2, Writing: Task Type (UnderlineTabs: Academic Task 1 · Task 2), My Sentence, Band 7+ Upgrade (required), Reusable Pattern (hint: "Use ___ for slots"), Example Sentence, Save.
- Placeholders use the brief's examples ("We enjoyed the scenario.", "The scenery was beautiful.", "The number of visitors to ___ increased steadily from ___ to ___.").
- "More details" (collapsed by default; open state remembered in localStorage): Why (explanation), Error type (Select from `useErrorTypes()`), Mistake pattern → Fix pattern (two inputs on one row, placeholders "visitors of + place" → "visitors to + place"), Note type (Select), Subtopic (Speaking), Language topic (Combobox, `useTopics('writing', taskType)`) and Chart type / Essay type (Select from `genresFor`) for Writing, Recall prompt (Writing), Tags (TagInput), Review (SegmentedControl: Start today · Start tomorrow · Do not review), Must remember (FavoriteStar toggle with label), Date (date input, default today).
- Smart paste: every TextArea passes `onPasteText`. If `parseSmartPaste` returns a result, show a quiet inline bar above the fields: "This looks like a correction. Fill N fields from it?" [Fill fields] [Keep as pasted]. Fill writes the parsed values into their fields (replacing the pasted block in the field it was pasted into). A toast "Fields filled." offers Undo, which restores the previous values.
- Validation: Save is enabled only when the upgrade field has text. On a save attempt without it, show the field error "Add the better version first." and focus the field.
- Save: `createNote(draft, {start})`, then toast "Note saved." with action "View" (navigates to `/notes/:id`), `setLastStudied`, `onSaved`, close. Ctrl/Cmd+Enter saves. "Save and add another" (Ctrl/Cmd+Shift+Enter) keeps mode, topic, task type, tags and More details state; clears the text fields; focuses What I Said.
- Draft: autosave all field values to localStorage `ielts-quickadd-draft` (300ms debounce). Opening without a prefill restores the draft and shows "Draft restored · Discard". Saved notes clear the draft. Closing with text keeps the draft (no confirm).
- Prefill (from a paragraph selection): title from `options.title`, mode Writing, fields filled, More details shows note type preset. Focus goes to the first empty essential field.
- Layout: desktop Dialog size md (≈640px), centered, top-aligned at 12vh. Mobile full-screen sheet with Save fixed at the bottom. Fields stacked, labels small graphite above. The upgrade field is visually the strongest (slightly larger text). The tab order is the essential fields, then Save, then More details.
- Footer hint: `Ctrl Enter to save` with Kbd.

**Tests (`QuickAddDialog.test.tsx`):** Q1 mode choice by key W shows Writing fields. Q2 Save disabled with empty upgrade; error text shown on Ctrl+Enter. Q3 save creates a note with stripped wrapping quotes and the chosen topic. Q4 smart paste of the T13 text shows the bar; Fill fields populates 4 fields; Undo restores. Q5 Save and add another keeps the topic and clears the sentence fields. Q6 draft is restored after close and reopen. Q7 prefill sets `source_paragraph_id` and `note_type`.

### Task C2: Review (brief §24–27, §6 Principle 6, §45 priority 2)

**Owns:** `src/features/review/**`

- Full-screen route `/review`, no shell. Query `?mode=speaking|writing` limits the session.
- On mount: read notes and settings once, build the queue with `buildSessionQueue(notes, {now, size: settings.session_size, mode})`. The queue is a snapshot; live data changes do not reshuffle it.
- Top bar (quiet): left "End review" (IconButton X + text on ≥640px, Esc); center "3 of 12" in text-small graphite with a 1px progress hairline under the bar; right: mode label.
- Card, state 1 (brief §24): eyebrow `ModeMark` + topic in text-meta graphite; promptLabel as a section title (serif, text-section); `promptHint` small label ("What I said"); prompt in text-recall. For upgrade cards, the prompt is the learner's own sentence in ink (it is the cue, not an error display), with a thin crimson left rule as the only mistake signal. Large empty space below (min 30vh on desktop). Optional "Type your answer" (ghost link) expands a TextArea. **Reveal** primary button, Space or Enter.
- State 2: the answer fades in (180ms opacity + 4px translate; none with reduced motion). answerLabel ("Better English") + answer in text-recall, upgrade color. Then "Context" + example (Markdown, text-body-lg). Pattern (if any) with slots. "Why" collapsed under a small toggle. If the user typed an answer: "Your answer" with `compareAnswer` marks (added = underline in upgrade color, removed = crimson dotted underline; plus text labels for screen readers).
- Ratings: one compact row: Again · Hard · Good · Easy, each a secondary button with the label, the key (1–4) and the next gap in text-meta (`formatInterval(previewIntervals(note)[r])`). Good is the default focus. Keys 1–4.
- After rating: `rateNote(id, rating, card.type)`. Again → append the note to the end of the queue once per session, and show "Review again soon." in text-small for 1.5s. When the note reaches mastered for the first time, show "✦ Marked as mastered." (fade). Then the next card.
- End: serif "Session complete", "12 notes reviewed." "2 to see again soon." (if any), "N days of consistent study." (if streak ≥ 2), buttons "Back to Today" and "Review more" (only if more are due).
- Empty queue: EmptyState "Nothing is waiting for review." body: next due from `useDueCounts` ("Next review tomorrow · 3 notes") or "Add notes and they will appear here."; actions "Back to Today", "Add a note".
- Small "Open note" link (text-meta) opens `/notes/:id` in the same tab after confirming nothing is lost (progress is saved per card).
- Mobile: ratings are a 4-column grid, 48px tall, fixed near the bottom with safe area.

**Tests (`ReviewScreen.test.tsx`):** V1 empty queue shows the empty state. V2 Reveal by Space shows "Better English" and the answer. V3 pressing 3 (Good) writes a review row and advances. V4 Again re-queues the note once (it appears again at the end, then not a third time). V5 mode filter. V6 fill_blank card shows "_____" and the answer on reveal.

### Task C3: Note Detail (brief §18, §33, §41, §45 priority 3)

**Owns:** `src/features/note-detail/**`

- Route `/notes/:id`. Two columns at ≥1024px: main (max 680px) and a 240px meta column with a left hairline. Below 1024px the meta column moves under the main content.
- Header: back link (to `location.state.from` or `/notes`), eyebrow "Speaking · Travel" / "Writing · Academic Task 1 · Increase" (`ModeMark`), actions: FavoriteStar toggle, Edit (E), Menu (Duplicate, Archive or Restore, "I made this mistake again", Delete).
- Main column, brief §18 order: label + original (crimson, text-body-lg, Quote); label + upgrade (text-section or larger, upgrade color, Quote); Ornament; Why (Markdown); In context (Markdown, bold kept); Reusable pattern (slots); Model paragraph (serif, if any); "From paragraph: <title>" link if `source_paragraph_id`.
- Empty sections are hidden, not shown blank.
- Meta column (text-small): Topic, Subtopic, Task (type · genre), Note type, Error type, Pattern ("visitors of + place → visitors to + place"), Tags, Mastery (MasteryMark + Menu to change: calls `setMastery`, toast "Marked as mastered." / "Marked as familiar."…), Next review (`formatDue`), Reviewed N times, Seen N times (only when > 1), Created (`formatShortDate(date_created)`), Must remember.
- Review history (below main): list of date · rating · review type; "No reviews yet." when empty.
- Edit mode: the main column turns into the same fields as Quick Add (all fields visible), plus topic, task, error, tags, date. Save (Ctrl/Cmd+Enter) → `updateNote` → toast "Changes saved." Cancel (Esc) asks to discard when dirty. Editing never changes review data.
- Delete: `useConfirm({title: 'Delete this note?', body: 'Its review history will be deleted too. This cannot be undone.', confirmLabel: 'Delete note', tone: 'danger'})` → `deleteNote` → navigate back → toast "Note deleted."
- Archive: toast "Note archived." with Undo. Archived note shows a top line "This note is archived. It is hidden from review." [Restore].
- Duplicate: navigate to the copy, toast "Note duplicated."
- "I made this mistake again": `markSeenAgain`, toast "Logged. It will come back in today's review."
- Prev/next: when `location.state.ids` is an array, show ‹ › controls and bind `[` and `]`.
- Not found: EmptyState "This note does not exist." with a link to All Notes.
- On open: `setLastStudied({mode, task_type, topic})`.

**Tests (`NoteDetailScreen.test.tsx`):** ND1 shows mistake before upgrade and hides empty sections. ND2 edit + save keeps review_stage, next_review_at and review rows. ND3 delete asks for confirmation; cancel keeps the note. ND4 archive then restore. ND5 mastery change calls setMastery and shows the toast. ND6 note with only upgraded_text renders cleanly.

### Task C4: Today and Calendar (brief §5, §34, §44, §45 priority 4)

**Owns:** `src/features/today/**`, `src/features/calendar/**`

Today (single reading column, max 760px; generous spacing):
- `formatLongDate(now)` as the serif page title. Secondary line: "Your notebook has 12 items waiting for review." (1 → "1 item"; 0 → "Nothing is waiting for review today.").
- **Begin Review**: the strongest element on the page (primary lg button) → `/review`. When 0 are due, replace it with "Next review tomorrow · 3 notes" (or "No reviews scheduled.") and a secondary "Add a note".
- Review summary: two quiet columns "Speaking / 8 due" and "Writing / 4 due" with ModeMark; each links to `/review?mode=…`; hairline separators, no cards.
- Continue studying: from `useLastStudied`: line 1 task label or mode ("Academic Task 1" / "Speaking"), line 2 topic in serif ("Trend Language"), line 3 "Last studied yesterday" (`formatRelativeDay`). Links to `/writing?tab=task1&topic=…` or `/speaking?topic=…`. Hidden when null.
- Recent notes: 5 newest, `NoteRow` compact, "All notes →".
- Personal pattern: `mostRepeatedIssue` → "Most repeated issue this week" (text-small graphite), the error type in serif text-section, "4 notes" → link `/mistakes#<slug>`. Hidden when null.
- Backup line (design §11): "Last backup 21 days ago. Export a copy." (or "No backup yet. Export a copy.") → `/settings#data`. Only when ≥10 notes and last export >14 days or never.
- Streak: "10 days of consistent study." in text-small, only when ≥2.
- First run (0 notes, brief §44): under the date, three short numbered lines with thin icons: "1. Save what you said." "2. Save the better version." "3. Review it until it sticks." Then **Add first note** (primary, `N` hint) and "Load example notes" (ghost, calls `loadExampleData`, toast "Example notes added. Remove them in Settings.").

Calendar (route `/calendar`, max 760px):
- PageHeader "Calendar". Month grid (Monday first), prev/next month IconButtons, "Today" button. Days are buttons with the date number; studied days (≥1 review) get a small indigo dot; days with notes added get a tiny gold ✦; today has a hairline ring. `aria-label` "7 October: 12 reviews, 3 notes added".
- Month summary line: "Studied 14 days · 46 notes added · 210 reviews".
- Selected day panel below: "Wednesday, 7 October", "12 reviews completed · 3 notes added", list of notes added that day (NoteRow compact), empty: "Nothing recorded on this day."
- Arrow keys move the selected day; Enter selects.
- Pure aggregation in `calendar/aggregate.ts`: `aggregateMonth(year, month, notes, reviews): Map<DayKey, { reviews: number; notesAdded: number }>`.

**Tests:** T-1 Today copy for 0, 1, 12 due. T-2 first-run view shows the three lines and both actions. T-3 Begin Review links to /review. K-1 `aggregateMonth` counts by local day. K-2 calendar aria-label text.

### Task C5: Notebooks: All Notes, Speaking, Writing, Must Remember (brief §4, §16–17, §21–22, §29, §31–32, §35)

**Owns:** `src/features/all-notes/**`, `src/features/speaking/**`, `src/features/writing/**`, `src/features/must-remember/**`

All Notes (`/notes`):
- PageHeader "All Notes" with count. Toolbar on one line: a filter-in-list text input (uses `searchAll` over the filtered notes), **Filter** button with active count (Popover; on mobile a Dialog sheet) containing: Mode, Topic (multi), Task type, Error type (multi), Note type (multi), Mastery (multi), Review status, Must remember, Date from/to; "Clear all". Sort Select. SegmentedControl Compact · Reading (remembered in localStorage). Link "Archived".
- Filters live in the URL (`filterFromSearchParams` / `filterToSearchParams`). Active filters show as removable Tags under the toolbar.
- Compact view ≥1024px: a table with columns Topic, Mistake, Upgrade, Type, Next Review, Mastery. Mistake in crimson text-small truncated, upgrade in ink text-body truncated; hairline rows, hover bg-stone/60; the whole row is one link (`/notes/:id`, state `{ids, from}`). Keyboard: ↑↓ / J K move focus, Enter opens.
- Below 1024px and in Reading view: NoteRow list (reading view shows NotePair reading + example).
- Show 100 rows, then "Show 100 more".
- Archived view (`?archived=1`): header "Archived notes", each row has a Restore button.
- Empty: no notes → EmptyState (quill) "No notes yet" / "Save the phrases you wish you had used." / Add first note. No matches → "No notes match these filters." + Clear filters.

Speaking (`/speaking`):
- PageHeader "Speaking", eyebrow "What I said → Native upgrade", ModeTabs under the title. Action "New Speaking note" (opens Quick Add with mode speaking and the selected topic).
- ≥1024px: left topic index (sticky, 200px): "All topics" + topics that have notes with counts, then other default topics muted. <1024px: a horizontal scroll list of topic links.
- Main: notes grouped by topic, each group a serif text-section heading + hairline, NoteRow reading view. `?topic=` selects one topic.
- Empty (brief §35): "No Speaking notes yet" / "Save the phrases you wish you had used." / Add first note.

Writing (`/writing`):
- PageHeader "Writing", eyebrow "My sentence → Band 7+ upgrade", ModeTabs. Sub-tabs (UnderlineTabs, `?tab=`): Academic Task 1 · Task 2 · Model Paragraphs.
- Task tabs: topic index from `useTopics('writing', task)`, genre filter (chart or essay type) as small Tags, notes grouped by language topic. Action "New Writing note" (mode writing, task type and topic preset).
- Model Paragraphs tab renders `<ParagraphList taskType={…} />` from `@/features/paragraphs/ParagraphList`.
- Empty: "No Writing notes yet" / "Save the sentences you want to write better next time." / Add first note.

Must Remember (`/must-remember`):
- PageHeader "Must Remember", eyebrow "Essential Notes" (italic serif). UnderlineTabs All · Speaking · Writing.
- Favorite notes in reading layout, each with a gold ✦ (FavoriteStar toggle to remove; toast "Removed from Must Remember." with Undo). Favorite paragraphs listed after notes under "Model paragraphs".
- Empty: "Nothing marked yet" / "Mark ✦ the phrases you never want to forget."

**Tests:** AN1 filter change updates the URL and the rows. AN2 view toggle switches table → reading list. AN3 archived view shows Restore and restoring removes the row. SP1 speaking groups by topic and `?topic=` filters. WR1 writing tabs switch between Task 1, Task 2, Model Paragraphs. MR1 must-remember shows only favorites; unstar removes.

### Task C6: My Mistakes and Model Paragraphs (brief §23, §28, §45 priorities 6–7)

**Owns:** `src/features/mistakes/**`, `src/features/paragraphs/**`

My Mistakes (`/mistakes`):
- PageHeader "My Mistakes", eyebrow "Error Ledger", description "Your repeated habits, grouped. Fix the most frequent first."
- Index of error types with counts (anchor links, `id = errorTypeSlug`), sticky on ≥1024px.
- For each `LedgerGroup`: section heading (serif) + "N notes". For each pattern: the habit in crimson (`visitors of + place`), "Seen 4 times" in graphite, "Use instead:" + the fix in upgrade color (bold weight allowed here), "Related notes →" toggles an inline list of NoteRow compact (or links to `/notes?error=…`). Loose notes listed compactly after patterns.
- Patterns seen ≥3 times get a small gold ✦ marker with the label "Frequent" (not color alone).
- Empty: EmptyState (constellation) "No mistakes logged yet" / "When you save a correction, add its error type. Repeated habits appear here."

Model Paragraphs:
- `ParagraphList` (used in Writing's tab): rows with serif title, "Academic Task 1 · Line Graph · Overview", first line preview (graphite), "3 notes" count from linked notes. Button "New model paragraph" → `createParagraph({title: 'Untitled paragraph', body: ''})` → navigate to `/writing/paragraphs/:id?edit=1`. Empty: "No model paragraphs yet" / "Save full paragraphs you want to learn from."
- `ParagraphScreen` (`/writing/paragraphs/:id`), reading mode: back link to Writing › Model Paragraphs, serif title (text-title), meta line, body in serif at 19–20px (`text-[1.1875rem] leading-[1.7]` is allowed here), max 680px. Phrases already saved as notes from this paragraph are marked with a gold dotted underline and a title tooltip; clicking opens the note.
- Selection to note (brief §23, "extremely easy"): when the user selects text inside the body (mouse, touch or keyboard), a small floating menu appears above the selection (below on mobile, or as a bottom sheet under 640px): "Create note from selection" heading and the five `SELECTION_NOTE_TYPES` as `NOTE_TYPES[].saveAs` buttons. Choosing one calls `useQuickAdd().open({ mode: 'writing', title: 'New note from paragraph', sourceParagraphId, prefill: { upgraded_text: selection, example_sentence: extractSentence(body, start, end), note_type, task_type, task_genre, topic } })`. Also a toolbar button "Create note from selection" (disabled until a selection exists) for keyboard users. Esc dismisses the menu.
- Edit / focus mode (`?edit=1` or Edit button): distraction-free full-viewport editor over the shell (`fixed inset-0 bg-paper`): title input (serif text-title, bare), a single quiet meta row (Task type Select, Chart/Essay type Select, Topic Combobox), body TextArea `variant="bare"` in serif 19–20px, max 720px centered. Autosave 500ms after typing stops (`updateParagraph`), status "Saved" / "Saving…" in text-meta. Done (Esc or Ctrl/Cmd+Enter) returns to reading mode. Paste keeps paragraphs and bold.
- Actions (reading mode): Edit, FavoriteStar, Menu (Archive, Delete with confirm "Delete this paragraph? Notes made from it are kept.").
- "Notes from this paragraph" section at the bottom (NoteRow compact).
- Not found: EmptyState.

**Tests:** MS1 ledger renders "visitors of + place", "Seen 4 times", "visitors to + place". MS2 related notes toggle. PG1 selecting "experienced a steady decline" (set the Selection range in jsdom) and choosing Save as Collocation calls quickAdd.open with the T16 sentence, note_type collocation and the paragraph id. PG2 editor autosaves after typing. PG3 delete asks for confirmation.

### Task C7: Search and Settings (brief §30, §41, design §6, §11)

**Owns:** `src/features/search/**`, `src/features/settings/**`

SearchPalette:
- Dialog `placement="top"` size lg, no title bar (hideTitle, accessible name "Search notes"). Large input with a search icon, placeholder "Search mistakes, upgrades, patterns, topics…".
- Results update as you type (80ms debounce) using `searchAll(query, notes, paragraphs, 30)`. Groups: "Notes" and "Model paragraphs". Note result: snippet with highlights (`Markdown highlight` or `matchRanges`), and a meta line (ModeMark · topic · MasteryMark). Paragraph result: title + snippet.
- ↑↓ moves, Enter opens (`/notes/:id` or `/writing/paragraphs/:id`), Esc closes. Mouse hover moves the active row. `aria-activedescendant` listbox pattern.
- Empty query: "Recent notes" (5 newest) and a hint line "Try: stable · visitors to · Travel".
- No results: "No notes match “x”." + button "Save “x” as a new note" → quick add prefill `upgraded_text: x`.
- Footer: Kbd hints ↑↓ Enter Esc.

Settings (`/settings`, max 760px, sections separated by hairlines, `id`s for anchors):
- Appearance (`#appearance`): Theme radio (System · Light · Dark) via `useTheme`.
- Review (`#review`): Session size Select (10, 20, 30, 50). Review style: "Mixed review types" / "Always Mistake → Upgrade".
- Topics (`#topics`): three lists (Speaking topics, Task 1 language topics, Task 2 language categories) showing defaults (muted, not removable) and custom ones (removable) with an add input each. Custom error types the same way.
- Your data (`#data`): "Your notes stay in this browser. Export a copy to keep them safe." Last backup line. Buttons Export JSON (backup), Export CSV, Export Markdown → `exportBundle` / `toCSV` / `toMarkdown` → `downloadText(exportFileName(...))` → `markExported` (JSON only counts as a backup) → toast "Backup exported." Import: file input (accept .json) → `parseImport` → confirm dialog with counts ("Import 42 notes, 120 reviews and 2 paragraphs? Existing notes are kept; newer copies win.") → `importBundle` → toast with the summary. Errors show the `ImportError` message inline. Storage line: "Browser storage is protected." if `navigator.storage.persisted()` is true, else "The browser may clear this data when space is low." with a button "Protect storage" (`requestPersistentStorage`).
- Archived notes link (`/notes?archived=1`) with count.
- Example notes: "Load example notes" / "Remove example notes" (confirm, toast with count).
- Danger zone: "Delete all data" → confirm with `requireText: 'DELETE'` → `deleteAllData` → toast "All data deleted."
- Keyboard shortcuts (`#shortcuts`): the table from design §9.
- About: "IELTS Upgrade Notebook · version 0.1.0 · Works offline. No account. No tracking."

**Tests:** SE1 search palette shows highlighted results for "stable" and opens a note on Enter. SE2 no-result action opens quick add with prefill. ST1 theme radio sets the theme. ST2 export JSON calls `downloadText` with a `.json` name and records the export. ST3 import of an invalid file shows the error. ST4 delete all requires typing DELETE.

### Task F2: Screens integration (after C1–C7)

- [ ] `npm run typecheck`, `npm test`, `npm run build` all pass.
- [ ] Promote any feature-local primitives that other screens also need into `src/components`.
- [ ] Remove the temporary example-data button from `/design`.
- [ ] Playwright smoke: visit every route with example data, no console errors, no horizontal scroll at 390px.

---

## Workflow 3: QA (authored after Workflow 2)

Reviewers by dimension, each with fresh context: (1) visual design vs brief (screenshots, 3 viewports × 2 themes), (2) core flows as Playwright E2E tests (the list in design §12), (3) data integrity and logic, (4) accessibility and keyboard, (5) clarity and microcopy (brief §36, §44). Every finding is checked by an independent skeptic before it is fixed. Fix agents own disjoint file sets. Final gate: typecheck, unit tests, build, E2E, and a last screenshot pass.
