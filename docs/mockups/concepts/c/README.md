# Concept C: Herbarium Grimoire

The boldest of the three concepts. Same layouts, new visual language.

## Mood

A bound grimoire: a deep aubergine leather cover with gold-foil tooling, and light parchment pages inside.
Pressed plants and a moth drawn in thin lines, used sparingly. At night the same book has aubergine-black pages, gold foil and moss.

## Files

| File | What it shows |
| --- | --- |
| `today.html` | Today dashboard |
| `review.html` | Review, answer revealed, four ratings. The same file is the phone layout under 640px. |
| `quick-add.html` | Quick Add, Speaking, over a dimmed Today |
| `concept.css` | Imports `../../mockup.css`, then changes tokens and adds the effects. CSS and inline SVG only. |
| `../png/c-*.png` | Renders: 1440x900 full page and 390x844, light and dark |

To see dark mode, set `data-theme="dark"` on `<html>`. To preview the motion, also set `data-motion="on"`.

## Palette

Contrast is measured against page and paper (light / dark). Text needs 4.5:1. Lines, icons and large text need 3:1.

| Token | Light | Dark | Role | Contrast (page / paper) |
| --- | --- | --- | --- | --- |
| `page` | `#F4EEE2` | `#131016` | Parchment page / aubergine-black page | |
| `paper` | `#FBF8F1` | `#1C1620` | Cards, dialogs, fields | |
| `stone` | `#EAE2D3` | `#271F2D` | Hover, unselected ribbon. Ink text only. | ink 12.9 / 12.7 |
| `ink` | `#231C27` | `#EEE5D4` | Main text | L 14.4 / 15.6. D 15.1 / 14.2 |
| `graphite` | `#655B69` | `#ACA1B0` | Secondary text | L 5.6 / 6.1. D 7.6 / 7.2 |
| `indigo` (name kept) | `#4A2C57` | `#CDAAD3` | Brand: links, focus ring, selected | L 10.2 / 11.1. D 9.2 / 8.7 |
| `primary` (new) | `#4A2C57` | `#ECE2CF` | Primary button fill. Dark is a parchment label. | text on it: L 10.9. D 12.4 |
| `on-primary` (new) | `#FBF6EA` | `#2A1D33` | Text on the primary button | see above |
| `plum` | `#7A4479` | `#C99CC9` | Speaking, selected ribbon tab, Today initial | L 6.2 / 6.8. D 8.2 / 7.7 |
| `on-accent` | `#FBF6EA` | `#1A1220` | Text on plum and moss fills | on plum L 6.6, D 7.9. On moss L 4.9, D 7.2 |
| `crimson` | `#9C4350` | `#DB8C94` | Rosehip: the learner's mistake | L 5.5 / 5.9. D 7.4 / 6.9 |
| `upgrade` | `#3B5E40` | `#A9C79B` | Deep moss: the better English | L 6.4 / 6.9. D 10.2 / 9.6 |
| `upgrade-wash` (new) | `#EBEFE3` | `#1F2A21` | Panel behind the upgrade | upgrade on it: L 6.3. D 8.0 |
| `sage` | `#5D7150` | `#97A983` | Moss: Writing icons and headband. Never small text. | L 4.6. D 7.5 (graphics) |
| `gold` | `#A2803C` | `#C9A962` | Foil on the page: ribbons, flourishes, ✦. Never text. | L 3.2 / 3.5. D 8.4 / 7.9 (graphics) |
| `cover` (new) | `#2A2033` | `#2B1F35` | Sidebar, Review top bar | |
| `cover-raised` (new) | `#382B42` | `#3A2B45` | Hover on the cover | cover-ink on it: L 10.8. D 10.4 |
| `cover-ink` (new) | `#F1E8D6` | `#EEE5D4` | Text on the cover | L 12.8. D 12.4 |
| `cover-muted` (new) | `#BCAFC2` | `#B9ABBF` | Secondary text on the cover | L 7.4. D 7.1 |
| `foil` (new) | `#C9A75E` | `#C9A962` | Brand mark, emblem, progress line on the cover. Never text. | L 6.8. D 6.9 (graphics) |
| `foil-line` (new) | `rgba(201,167,94,.42)` | `rgba(201,169,98,.40)` | Tooled hairlines on the cover. Decorative. | |

Other numbers: focus ring on paper is 11.1 (light) and 8.7 (dark). The gold tip of the active tab is 3.2 (light) and 8.4 (dark). Gold is 3.2:1 on the light page, so it stays a line or glyph and is never text.

## Typography

- No new font. Instrument Serif and Inter already give the bookish voice. A third face, such as an inscription or blackletter font, starts to look like a fantasy game and adds load time.
- Page title: 32px to 38px serif.
- Section titles and dialog titles: 21px to 24px serif.
- Today's title starts with a raised plum initial (the "W" at 1.68x). It is the real first letter, so the word still reads "Wednesday".
- Due counts on Today: 36px serif numbers.
- The review answer: 28px to 30px, deep moss.
- Body text, labels and forms do not change.

## Static effects

- **Bound cover.** The sidebar is aubergine leather with a faint grain and a double gold-foil fillet 8px inside the edge.
- **Thumb-index tab.** The active nav item is cut from the page itself. It is page-colored, crosses the fillet and joins the reading area. A 3px gold tip marks its left edge. So "you are here" is a shape, not only a color.
- **Foil-stamped moth.** One small line-drawn moth in the empty lower part of the cover.
- **Stamped primary button.** A 1px foil hairline sits 3px inside the button. No glow, no shadow.
- **Tooled section rules.** Each section hairline starts with a 48px gold segment.
- **Headbands.** On Today, the Speaking column has a 3px plum top rule and the Writing column a 3px moss top rule. The words "Speaking" and "Writing" stay.
- **Bookplate.** "Continue studying" is a paper card with the book's aubergine ribbon hanging from its top edge.
- **Folio.** The review card and the Quick Add dialog are paper with line-only corner flourishes in gold: a bracket, two scroll ends and one leaf. 56px on the review card, 26px on dialogs so they stay inside the padding.
- **Must Remember ribbon.** A gold-foil ribbon hangs from the top edge of the review folio. In meta lines a small ribbon glyph replaces the star (✦ means Mastered only, as in v1.1). The words "Must Remember" are always there.
- **Ribbon tabs.** Quick Add's Speaking and Writing tabs hang from the dialog's top edge. Selected: filled in the mode color and 6px longer. Unselected: stone with ink text.
- **Mistake and upgrade.** The mistake keeps a 2px rosehip rule. The upgrade sits on a moss panel with a 3px moss rule and larger text. In Quick Add the upgrade field has the moss panel and a moss leaf before its label, and "What I Said" has a thin rosehip rule inside the field.
- **Herbarium marks.** One pressed leaf replaces the ✦ marks before section titles. A fern frond replaces the constellation ornament above the backup line.
- **Review top bar.** A strip of the cover. A 2px foil line along its lower edge is the progress.

## Motion

All motion runs once. No loops. All of it is off with `prefers-reduced-motion`.

| What | Duration | When |
| --- | --- | --- |
| Answer "ink settles": opacity 0 to 1 and blur 2px to 0 | 220ms | On Reveal |
| Ribbon tab slides down 6px (gets longer) | 180ms | When a ribbon tab is selected |
| Corner flourishes draw in (stroke line) | 250ms, 60ms delay | Once when a dialog opens. Not on re-render. |
| Must Remember ribbon drops in from the top edge | 200ms | When Must Remember is turned on |
| Nav and button color changes | 150ms | Hover and selection |

The current `animate-ink` also rises 4px. This concept drops the rise, so the answer settles in place.

The brief for this concept suggested a 3px ribbon slide. I used 6px: at 3px the selected tab differs mostly by color, and state must never be color alone.

## What would change in the app

**`src/styles/index.css`**

- New values for `page paper stone ink graphite indigo plum gold sage crimson upgrade line line-strong on-accent scrim`.
- New tokens: `cover cover-raised cover-ink cover-muted foil foil-line primary on-primary upgrade-wash`.
- `--text-title` 2rem to 2.375rem. `--text-section` 1.3125rem to 1.5rem.
- `ink-settle` keyframes: remove the 4px rise. Add `flourish-draw` and `ribbon-drop`.
- `lavender` is no longer needed.

**Components**

- `src/app/Sidebar.tsx`: cover colors, foil fillet, index-tab active state, moth emblem, rule after group labels. The nav must not clip the tab sideways.
- `src/app/AppShell.tsx`: remove the hairline between sidebar and main.
- `src/components/ui/Button.tsx`: primary uses `bg-primary text-on-primary` plus the inner foil hairline.
- `src/components/ui/Tabs.tsx`: add a `RibbonTabs` variant. Use it for Quick Add mode and page-level section tabs (Writing Task 1 / Task 2, Mistakes, Must Remember). Keep underline tabs inside forms.
- `src/components/ui/Section.tsx` and `PageHeader.tsx`: gold lead on the rule; `mark` draws the leaf; optional `initial` for Today.
- `src/components/ui/Ornament.tsx`: add `variant="fern"`.
- `src/components/ui/Dialog.tsx`: folio frame and a new `Flourish` component in 4 corners.
- `src/components/ui/FavoriteStar.tsx`: keep `RibbonIcon`, filled in gold foil.
- `src/components/ui/EmptyState.tsx`: add leaf, fern and moth drawings.
- `src/features/review/ReviewScreen.tsx` and `ActionBar.tsx`: cover top bar with foil progress, folio card, Must Remember ribbon, moss answer panel.
- `src/features/today/TodayScreen.tsx`: headbands, serif counts, bookplate card, colored key line.
- `src/features/quick-add/QuickAddDialog.tsx`: show the mode ribbon tabs on desktop too, leaf before the upgrade label, moss panel on the upgrade field.

## Risks and trade-offs

- **Big color block.** The aubergine cover is about 16% of the desktop screen. Brief §9 asks for subtle details over large color blocks. This is the deliberate bold move of this concept.
- **Dark mode tab.** In dark mode the page and the cover are close in brightness (1.2:1). The active tab is carried by its foil edge and the gold tip (8.4:1), not by its fill.
- **Ornament budget.** Flourishes belong on the review card and dialogs only. On every card they would look busy and drift toward fantasy.
- **Small structure changes (about 5%).** The review content is now on a card. "Continue studying" is now a card. Quick Add shows the mode tabs on desktop, not only on mobile.
- **Dark primary button.** It is a parchment label, not lavender. This changes v1.1 rule 6, to avoid a large purple button.
- **Moss means two things.** Moss is the Writing accent and also the upgrade color. This overlap already exists today. Words always name both.
- **Short laptop screens.** The review card is about 670px tall. On a 1366x768 laptop it may scroll. Fix: reduce the card's minimum height and padding when the window is under 820px tall.
- **The moth.** Some people may read a moth as a Halloween motif. It is small, foil-colored and used once. It is easy to remove.
- **Not designed yet.** Phone top bar, bottom nav, tablet rail, menus, toasts and the other 14 screens.
