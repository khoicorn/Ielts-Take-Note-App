# IELTS Upgrade Notebook: Technical Design

Status: draft for owner approval · 2026-10-07
Product brief (source of truth for UX and visuals): [docs/product-brief.md](../../product-brief.md)

This document adds the technical decisions the brief leaves open. Where this file and the brief disagree on UX or visuals, the brief wins.

## 1. Owner decisions

- Notes live in the browser only (IndexedDB). No server. No login.
- React web app. Installable as an app (PWA). Works offline.
- Data leaves the device only when the owner exports it.

## 2. Stack

| Part | Choice | Reason |
|---|---|---|
| Build | Vite 8, React 19, TypeScript strict | Fast, standard |
| Routing | React Router 8, `BrowserRouter` | Standard |
| Storage | Dexie 4 + `dexie-react-hooks` (`useLiveQuery`) | IndexedDB with live queries: screens update when data changes |
| Styling | Tailwind CSS 4 with a locked theme | Default colors, radii and shadows are removed. Only brief tokens exist, so off-brand classes like `bg-blue-500` or `rounded-2xl` do not compile |
| Icons | `lucide-react`, stroke width 1.5 | Thin outline icons (brief §15) |
| Fonts | `@fontsource/instrument-serif`, `@fontsource-variable/inter` | Self-hosted, so they work offline |
| PWA | `vite-plugin-pwa` | Manifest, offline cache, "new version" prompt |
| Tests | Vitest + `fake-indexeddb` (logic), Playwright (flows and screenshots) | |

No UI kit. No rich-text editor library (see §7).

## 3. Data model

Database name `ielts-notebook`, Dexie version 1. IDs from `crypto.randomUUID()`. Timestamps are ISO 8601 strings. Day keys are local `YYYY-MM-DD`.

### 3.1 `notes`

All brief §40 fields, plus the additions marked ➕.

| Field | Type | Notes |
|---|---|---|
| id | string | |
| mode | `'speaking' \| 'writing'` | |
| date_created | day key | Study date. Editable. Defaults to today |
| topic | string | Speaking topic (e.g. Travel) or Writing language topic (e.g. Increase, Thesis) |
| subtopic | string | Free text (e.g. "Nha Trang trip") |
| task_type | `'' \| 'task1' \| 'task2'` | Writing only |
| ➕ task_genre | string | Chart type (Line Graph…) or essay type (Opinion…). Writing only |
| original_text | string | What I Said / My Sentence. Can be empty for phrase notes |
| upgraded_text | string | Native Upgrade / Band 7+ Upgrade. Required |
| explanation | string | Why |
| example_sentence | string | In context / Model sentence |
| reusable_pattern | string | `___` marks a slot |
| model_paragraph | string | Optional paragraph attached to this note |
| note_type | NoteType | See §3.4 |
| error_type | ErrorType or custom string | See §3.4 |
| ➕ error_pattern | string | The habit, e.g. "visitors of + place". Groups notes in My Mistakes |
| ➕ fix_pattern | string | The fix, e.g. "visitors to + place" |
| ➕ recall_prompt | string | Prompt for Pattern Recall, e.g. "Describe a stable trend." |
| tags | string[] | Lowercase |
| difficulty | `0 \| 1 \| 2 \| 3` | 0 = not set |
| is_favorite | boolean | Must Remember |
| mastery_status | `'new' \| 'learning' \| 'familiar' \| 'mastered'` | |
| review_stage | 0–7 | See §4 |
| last_reviewed_at | ISO or null | |
| next_review_at | ISO or null | null = not scheduled |
| times_reviewed | number | |
| ➕ times_seen | number | Starts at 1. "I made this mistake again" adds 1 |
| ➕ source_paragraph_id | string or null | Set when created from a model paragraph selection |
| ➕ is_archived | boolean | Archived notes are hidden everywhere except the Archived view, and never reviewed |
| ➕ archived_at | ISO or null | |
| created_at, updated_at | ISO | |

Indexes: `id, mode, next_review_at, date_created, created_at, updated_at, *tags, source_paragraph_id`. Booleans are not valid IndexedDB keys, so favorite and archived are filtered in memory. Expected size is under 5,000 notes, so in-memory filtering is fast enough.

### 3.2 `reviews`

`id, note_id, review_date (day key), rating ('again'|'hard'|'good'|'easy'), review_type, previous_stage, new_stage, previous_interval (days), new_interval (days), created_at`. Indexes: `id, note_id, review_date, created_at`.

### 3.3 `paragraphs` (model paragraphs, brief §23)

`id, title, task_type, task_genre, topic, body, tags, is_favorite, is_archived, created_at, updated_at`. Indexes: `id, task_type, created_at, updated_at`.

### 3.4 `meta` (key-value)

Keys: `settings`, `last_export_at`, `last_studied` (mode + topic + time, for "Continue studying").

Settings: theme (`system|light|dark`, mirrored to `localStorage` so the page does not flash on load), session size (default 20), review style (`mixed|upgrade_only`, default `mixed`), custom speaking topics, custom writing topics per task type, custom error types.

Fixed lists (in `src/lib/taxonomy.ts`):

- Speaking topics: brief §21.
- Writing: task types, chart types, essay types, language topics: brief §22.
- Error types: brief §28.
- Note types: `correction` (default), `collocation`, `sentence_pattern`, `linking_phrase`, `grammar_pattern`, `useful_expression`.

## 4. Spaced repetition

Stage table: stage 0 = New, stages 1–7 = intervals of 1, 3, 7, 14, 30, 60, 120 days.

A new note is due at once (stage 0, `next_review_at` = created time). Quick Add "More details" can change this: Start today (default), Start tomorrow, or Do not review (`next_review_at` = null). Archived notes are never due. A note is due when `next_review_at` is on or before the end of today, local time.

| Rating | New stage | Next review |
|---|---|---|
| Again | 1 | Shown again later in the same session (once). Saved as due tomorrow |
| Hard | max(1, current stage) | Half that stage's interval, minimum 1 day |
| Good | current + 1 (max 7) | That stage's interval |
| Easy | current + 2 (max 7) | That stage's interval |

Next review dates land on the start of the local day (`today + N days`).

Mastery comes from the stage: 0 = New, 1–2 = Learning, 3–4 = Familiar, 5–7 = Mastered.

Rules:

- Editing text never changes review fields, mastery, or review history (brief §41).
- Manual "Mark as mastered" (or any manual mastery change) moves the note to the first stage of that level and reschedules it. It writes no review row. Toast: "Marked as mastered."
- "I made this mistake again": `times_seen + 1`, stage 1, due today.
- Rating buttons show a small hint of the next gap ("Tomorrow", "3 days", "1 week"). No formulas.

Session: due notes, oldest first, Speaking and Writing interleaved, capped at the session size. `/review?mode=speaking` limits to one mode.

## 5. Review types (brief §25)

`pickReviewType(note)` decides. Mixed style: the first 2 reviews use the default type, then the note rotates through the types it supports.

| Type | Needs | Prompt | Answer |
|---|---|---|---|
| Mistake → Upgrade (default) | original_text | "Recall the better version" + original | upgraded + context |
| Phrase → Sentence | no original_text | the upgraded phrase | example sentence |
| Fill in the blank | a blank target (below) | example or upgraded sentence with `_____` | the missing words |
| Pattern Recall | reusable_pattern | recall_prompt, or "Use your pattern for: {topic}" | pattern + example |

Blank target, first match wins:

1. Words wrapped in `**bold**` in the example sentence (owner controls the blank).
2. The upgraded phrase found inside the example sentence.
3. The words that changed between original and upgraded (word diff). "visitors **of** the City Zoo" → "visitors _____ the City Zoo".

The reviewer can type an answer (optional). On reveal, the app shows the typed answer next to the correct one, with matching words marked. Typing is never required.

## 6. Screens and routes

| Route | Screen | Brief |
|---|---|---|
| `/` | Today | §5 |
| `/review` | Review. Full screen, no navigation | §24–26 |
| `/speaking` | Speaking notebook, grouped by topic | §16, §21 |
| `/writing` | Writing notebook. Sub-tabs: Task 1 · Task 2 · Model Paragraphs | §17, §22 |
| `/writing/paragraphs/:id` | Model paragraph reader and editor | §23 |
| `/mistakes` | My Mistakes (Error Ledger) | §28 |
| `/must-remember` | Must Remember (Essential Notes) | §29 |
| `/notes` | All Notes. Filters live in the URL query. `?archived=1` shows the archive | §31–32 |
| `/notes/:id` | Note Detail | §33 |
| `/calendar` | Calendar | §34 |
| `/settings` | Settings | |

Overlays on every screen: Quick Add, Search, Keyboard shortcuts, Confirm dialog, Toasts.

Layout:

- 1024px and wider: sidebar 232px.
- 640–1023px: icon rail 64px with tooltips.
- Under 640px: bottom bar (Today, Speaking, Add, Writing, Review) with Add in the center. A top-bar menu opens the other pages.
- Reading columns max 760px. Tables may use the full width.

Settings contains: theme, review session size, review style, custom topics and error types, export (CSV, JSON, Markdown), import JSON backup, archived notes link, load or remove example notes, delete all data (typed confirmation), keyboard shortcuts.

Example notes: the empty Today screen offers "Load example notes" (the brief's examples plus about 15 more). They carry the tag `example` and can be removed in one click.

## 7. Text, paste and capture

- Every text field is a plain string with a small Markdown subset: `**bold**`, `*italic*`, paragraphs, `- ` bullets, `1. ` lists, `___` slots. A small renderer turns it into React elements. No `dangerouslySetInnerHTML`.
- Paste: if the clipboard has HTML (ChatGPT does), convert bold, italic, paragraphs and lists to the subset and drop everything else. Smart quotes and line breaks are kept.
- Sentence fields drop one pair of wrapping quotes on save. The display adds typographic quotes.
- Smart split: when pasted text has labels such as `❌ / ✅`, `Original: / Better:`, `You said: / More natural:`, `Why:`, `Example:`, `Pattern:`, Quick Add offers "Fill fields from pasted text" (one click, undoable).
- Fields are auto-growing textareas. Ctrl/Cmd+B wraps the selection in bold.
- Quick Add keeps an unsent draft in `localStorage` and restores it.
- Model paragraph editor: focus mode, serif text, no side UI.
- Selection to note: select text in a paragraph. A small menu offers the five types (brief §23). Choosing one opens Quick Add pre-filled: phrase = selection, example = the sentence that contains it, task type and topic copied from the paragraph, link back to the paragraph.

## 8. Search (brief §30)

- Opens with Ctrl/Cmd+K or `/`. Also a search field in the sidebar.
- Text is normalized: lowercase, straight quotes, punctuation removed.
- Light stemming, so "stable" also finds "Stability" (topic) and "unchanged" notes filed under it.
- Every query word must match some field. Ranking weights: upgrade > original > pattern > example > explanation > topic and tags > paragraph body.
- Matches are highlighted. Results are grouped: Notes, Model paragraphs.

## 9. Keyboard

| Key | Action |
|---|---|
| N | New note (Ctrl/Cmd+N is also bound, but browsers keep Ctrl+N for "new window" in a normal tab; it works in the installed app) |
| Ctrl/Cmd+K or / | Search |
| ? | Shortcut list |
| Ctrl/Cmd+Enter | Save in Quick Add or edit mode |
| Space / Enter | Reveal (Review) |
| 1 2 3 4 | Again, Hard, Good, Easy (Review) |
| Esc | Close overlay or leave Review |
| ↑ ↓ or J K, Enter | Move through and open rows (All Notes) |
| G then T, R, S, W, M, F, A, C | Go to Today, Review, Speaking, Writing, Mistakes, Must Remember, All Notes, Calendar |

Single-letter keys never fire while typing in a field.

## 10. Design system

Tokens: brief §7–14, exposed as CSS variables and Tailwind theme values. Dark values from brief §8. Light and dark switch with `data-theme` on `<html>`; `system` follows `prefers-color-scheme`.

Contrast (WCAG AA, checked by a unit test over token pairs):

| Token | On parchment | Use |
|---|---|---|
| Ink | 14.5:1 | All text |
| Graphite | 4.8:1 | Metadata. Not on Stone (4.4:1) |
| Crimson | 5.2:1 | Mistake text |
| Deep Sage | 5.3:1 | Upgrade text |
| Plum | 6.2:1 | Speaking labels |
| Sage | 3.9:1 | Icons and large text only |
| Gold | 2.8:1 | Ornaments only. Never text. Favorite state is also shown by a filled star shape and a label |

Dark tokens that miss AA on the surface color get lightened by up to 5% until they pass (Crimson `#B66B73` is 4.4:1 on `#1C1A21`).

Other rules:

- Radii 4, 6, 8, 10px only. Tags may be fully rounded.
- One shadow token, very soft, used only for floating menus and dialogs.
- Motion 150–220ms fades and underline moves. `prefers-reduced-motion` turns them off.
- Focus ring: 2px indigo outline, 2px offset, on every interactive element.
- Touch targets at least 44px on touch screens.
- Mastery marks: ○ New, ◔ Learning, ◑ Familiar, ✦ Mastered, always with the word in text or `aria-label`.
- Mistake vs upgrade: the upgrade is larger and in ink or deep sage. The mistake is smaller, in crimson, with a "What I said" label. No strikethrough-heavy red styling.

## 11. Data safety (browser-only storage)

- Call `navigator.storage.persist()` on first save, so the browser does not evict data.
- Today shows one quiet line when the last export is more than 14 days old and there are 10 or more notes: "Last backup 21 days ago. Export a copy."
- JSON import merges by `id`. The newer `updated_at` wins. Reviews merge by `id`.
- Delete asks for confirmation. "Delete all data" needs the word DELETE typed.

## 12. Testing and done criteria

- Unit tests: scheduling, mastery, review-type choice, blank finding, word diff, smart split, HTML-to-subset paste, search ranking and stemming, filters, Error Ledger grouping, CSV escaping, export and import round trip, token contrast.
- Playwright: Quick Add (both modes, smart paste), full review session, edit note keeps history, archive and restore, delete with confirm, search, selection to note, export download, theme switch.
- Screenshots at 1440×900, 834×1112 and 390×844, light and dark, reviewed against brief §43–44.
- Done when `tsc --noEmit`, `vitest run`, `vite build` and `playwright test` all pass with zero errors.

## 13. Build plan

1. **Scaffold (me):** project, dependencies, tokens, types and taxonomy (the shared contract).
2. **Workflow 1, Foundation (2 agents in parallel, then 1 check):** (a) data layer, logic and unit tests; (b) design system, app shell, overlays, keyboard.
3. **Workflow 2, Screens (7 agents in parallel, each owns its folder, then 1 integration agent):** Quick Add · Review · Note Detail · Today + Calendar · All Notes + Speaking + Writing + Must Remember · My Mistakes + Model Paragraphs · Search + Settings.
4. **Workflow 3, QA:** visual, flow, data-integrity and accessibility reviewers. Each finding is checked by a second agent before it is fixed. Then a final full check.

I report to you after each step.

## 14. Out of scope

Everything in brief §42. Also: cloud sync, accounts, sharing, notifications.

## 15. Known limits

- Browser data can be lost if the owner clears site data. Mitigated by §11.
- Ctrl+N is reserved by browsers in normal tabs (see §9).
- Automatic blanks can pick weak words. Bold the key words in the example to control the blank.
