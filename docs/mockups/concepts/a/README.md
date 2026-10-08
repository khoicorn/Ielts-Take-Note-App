# Concept A: Candlelit Library

The moderate step up. Layouts stay the same. Colors, type and small details change.

## Mood

A late-night study desk in an old university library, lit by one candle.
Warm parchment, oxblood ink, brass fittings; the notebook itself stays clean and modern.

## Files

- `concept.css`: imports `../../mockup.css`, then overrides tokens and adds the effects. CSS only.
- `today.html`, `review.html`, `quick-add.html`: same structure and content as `11-today`, `05-review-revealed` and `02-quick-add-speaking`.
- Renders in `../png/`: `a-today-light.png`, `a-today-dark.png`, `a-review-light.png`, `a-review-dark.png`, `a-quick-add-light.png`, `a-quick-add-dark.png`, `a-review-mobile-light.png`, `a-review-mobile-dark.png`.

## Palette

Contrast is measured against the darkest background the text can sit on.
Light: the page edge tone, because the glow only makes the page lighter.
Dark: the glow center (about `#2B2217`), because there the glow lowers contrast for light text.
I also checked every text element on the rendered pages, pixel by pixel, with glow, vignette and grain included. The lowest results: light 5.3:1 (mistake text in Today rows), dark 6.1:1 (labels on Review). All pass AA.

| Token | Light | Dark | Role | Contrast (light / dark) |
|---|---|---|---|---|
| `page` | `#EBE1CC` | `#191511` | Page background. The edge tone. | n/a |
| `glow` (new) | `rgba(255,248,230,.78)` | `rgba(255,176,85,.085)` | Candle light behind the reading column | n/a |
| `vignette` (new) | `rgba(74,46,18,.06)` | `rgba(0,0,0,.30)` | Far corners only | n/a |
| `paper` | `#F9F3E7` | `#221D18` | Inputs, dialog, rating buttons | n/a |
| `stone` | `#E2D6BF` | `#2B251F` | Hover, grouped areas | n/a |
| `ink` | `#231B1A` | `#EFE5D3` | Main text, upgrade in compact rows | 13.0 / 12.5 |
| `graphite` | `#5E544C` | `#B4A795` | Metadata, labels | 5.7 / 6.6 |
| `indigo` | `#2E2A4B` | `#B3ABD8` | Links, active icon, light focus ring | 10.4 / 7.2 |
| `indigo-fill` (new) | `#2E2A4B` | `#353057` | Primary button fill | cream text on it: 12.1 / 10.4 |
| `plum` | `#664A62` | `#BF9DB6` | Speaking mark | 5.9 / 6.5 |
| `crimson` | `#913D49` | `#DF9396` | The mistake | 5.5 / 6.5 |
| `upgrade` | `#3F5D45` | `#A3BE97` | The upgrade (green sage) | 5.7 / 7.7 |
| `garnet` (new) | `#782A31` | `#7D3039` | Light: title initial, eyebrows, ribbon. Dark: ribbon fill only, always with a gilt edge | 7.4 / fill 2.0, gilt edge 7.7 |
| `rubric` (new) | `#782A31` | `#D2B48A` | Small-caps eyebrows | 7.4 / 7.9 |
| `gold` (brass) | `#A27E3C` | `#C9A35E` | Rules, ornaments, ✦. Never text | 2.9 / 7.7 (decorative) |
| `brass-text` (new) | `#7F5F27` | `#D6B26E` | Numerals 24px and up, progress line, active nav bar, dark title initial | 4.5 / 7.8 |
| `sage` | `#69755C` | `#95A487` | Writing mark (icons only) | 3.8 / 5.9 |
| `focus` (new) | same as `indigo` | `#D9B877` | Focus ring | 10.4 / 9.6 |
| `line` | `rgba(60,40,20,.13)` | `rgba(255,230,190,.10)` | Hairlines | n/a |
| `line-strong` | `rgba(60,40,20,.22)` | `rgba(255,230,190,.18)` | Field and button borders | n/a |
| `scrim` | `rgba(40,26,12,.28)` | `rgba(6,4,2,.60)` | Behind dialogs (warm) | n/a |

Brass hairlines are `gold` at 55% (light) and 38% (dark). The button gilt is `gold` at 70% and 75%.
Lavender is not used. Constellation dots become brass.

## Typography

- Page title: 32px to 36px. The first letter is garnet by day and brass by night, 1.22 times larger. Scribes wrote first letters in red; this is one letter, nothing more.
- Section titles: 21px to 22px. Dialog title and Review heading: 21px to 24px.
- Review answer: Inter 28px becomes Instrument Serif 40px (32px on phones), in upgrade green. It reads like a correction written into the journal. The mistake stays Inter 16px.
- Eyebrows: italic small caps, 16px. Used for sidebar group labels (Notebooks, Library), the Today kicker (Academic Task 1), the "Mistake → Upgrade" key line and the Quick Add description.
- Today due counts: Instrument Serif 44px numerals in brass, with "due" in italic serif 18px.
- "How well did you recall it?": italic serif 18px.
- Form labels, buttons, metadata and the review labels (WHAT I SAID, BETTER ENGLISH) stay Inter. Learning clarity first.

New font: EB Garamond, italic 400 and 500 only. Why: Instrument Serif has no small caps. Chrome fakes them by shrinking capitals, which gives thin, uneven strokes at 16px. EB Garamond has real small-cap letters. It is used for eyebrows only.

## Static effects

1. Candle glow: one very large, very soft radial light behind the reading column. Today: centered on the 760px column near the title. Review: behind the answer. It never moves.
2. Vignette: the far corners darken a little (6% warm brown in light, 30% black in dark).
3. Paper grain: same strength as now, tinted warm.
4. Brass rules: under section titles, a double rule over the due counts, a hairline after each sidebar group label, the line above the rating row.
5. Primary button: ink-indigo with a gilt hairline 3px inside the edge, like tooling on a book cover. No glow, no outer shadow.
6. Dialog: a bookplate. A brass hairline frame sits 6px inside the edge. The footer line stops at the frame.
7. Must Remember: a garnet silk ribbon (replaces the gold ribbon). On Review, a 16px garnet bookmark hangs from the top bar at the right edge of the column. The meta line always says "Must Remember" in words.
8. Active nav item: a faint lit surface and a 2px dark-brass bar.
9. Review progress: 2px brass line (was 1px indigo).
10. Dark focus ring: amber instead of lavender.

## Motion

No looping animation. The glow never breathes or flickers. With reduced motion, every change is instant.

| What | Duration | When |
|---|---|---|
| Answer "ink settles": opacity 0 to 1, blur 2px to 0, no movement | 220ms | Once, when the answer is revealed |
| Brass underline draws in from the left (scaleX 0 to 1) | 200ms | When a tab becomes active (All Notes tabs, Writing task type) |
| Ribbon drops 2px | 180ms | When a note is marked Must Remember. It moves back up when unmarked. Same for the Review bookmark |
| Dialog and menu fade (unchanged) | 180ms | On open |

## What would change in the real app

Tokens in `src/styles/index.css`:
- New values for `page paper stone ink graphite indigo plum gold sage crimson upgrade line line-strong on-accent scrim` and `shadow-float` (warm brown shadow).
- New colors: `indigo-fill garnet rubric brass-text focus glow vignette`. Remove `lavender`.
- Text sizes: `text-title` 36px, `text-section` 22px, new `text-numeral` 44px, new `text-answer` 40px.
- New font token `font-smallcaps` (EB Garamond italic). The app self-hosts fonts through `@fontsource`. New npm packages are not allowed, so add one woff2 file (variable italic, Latin) under `public/fonts/` with an `@font-face` rule. They are cached for offline use like the other assets.

These are changes to the locked theme and the shared contract. They need the lead's approval first (CLAUDE.md).

Components:
- `AppShell.tsx`: one fixed, pointer-events-none layer for the glow and the vignette. Keep the grain.
- `Sidebar.tsx`: small-caps group labels with a brass hairline; active bar in `brass-text`; lit surface.
- `Button.tsx`: primary uses `indigo-fill` and the inset gilt hairline. Same for the mobile Add button.
- `PageHeader.tsx`: 36px title with the initial (a `::first-letter` rule).
- `Section.tsx`: brass hairline; `mark` ✦ in brass.
- `Ornament.tsx`: brass gradient hairlines; constellation dots in brass.
- `Tabs.tsx`: 2px `brass-text` underline with the 200ms draw-in.
- `Dialog.tsx`: bookplate frame; 24px title.
- `Field.tsx`: focus ring uses the `focus` token.
- `FavoriteStar.tsx` and `RibbonIcon`: garnet fill; in dark, wine fill with a gilt stroke; the 2px drop.
- `MasteryMark.tsx`: ✦ in brass (value change only).
- `features/today`: brass numerals, double rule, small-caps kicker and key line.
- `features/review`: serif 40px answer, bookmark, 2px brass progress, italic question, `animate-ink` without the 4px rise.
- `features/quick-add`: small-caps description; upgrade text in `upgrade` green.

Two owner rules from "Design refinements v1.1" change:
- Rule 6 (keep the lavender primary button in dark mode) becomes the deep indigo button with a gilt hairline.
- Rule 2 (gold ribbon) becomes a garnet ribbon.

## Risks and trade-offs

- Red family. Garnet sits close to the mistake crimson. I kept them apart: garnet is darker and browner, and appears only as one title letter, small-caps labels and the ribbon. In dark mode garnet is never text. Watch this if garnet spreads to more places.
- Warmer page. The parchment is more tan than the brief's `#F5F1E8`. The glow brings the center back to about the old brightness. Some people may find the edges too yellow on cool screens.
- Serif answer. Instrument Serif is narrow. One-line answers look great at 40px. Very long Writing upgrades (3 or more lines) may read slower than Inter. Fallback: use serif only when the answer is under about 90 characters.
- Third font. EB Garamond italic adds one 48 KB file (Latin, variable 400 to 500) to the offline bundle.
- Field borders keep today's approach (hairline on paper). Paper is only 1.17:1 against the page, so labels and the border carry the field shape, as they do now.
- The glow and vignette are one fixed layer. It must not catch clicks or cover dialogs (pointer-events none, lowest layer).
- Dark-mode button. The deep indigo fill is only 1.5:1 against the page. The gilt hairline (7.7:1) and the cream text (10.4:1) make the button clear.
