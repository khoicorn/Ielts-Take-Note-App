# Concept B: Midnight Observatory

A study room under a night sky. Dark mode comes first: the page is deep indigo-black, with a faint, still star field in one corner.

Light mode is the same room at dawn: pale lavender-grey paper, indigo ink, brass details. The layouts do not change.

## Files

- `concept.css`: imports `../../mockup.css`, then changes tokens and adds the effects. CSS and inline SVG only.
- `today.html`, `review.html`, `quick-add.html`: same structure and content as `11-today`, `05-review-revealed` (plus the `m02` phone layout under 640px) and `02-quick-add-speaking`.
- `specimen.html`: shows the parts the three screens do not: all four moon phases, button states, the gold tab underline, the constellations and the palette.
- Renders in `../png/`: `b-today-*`, `b-review-*`, `b-quick-add-*`, `b-review-mobile-*`, `b-specimen-*` (light and dark).

Two content changes from the originals, both from the v1.1 decisions: the Must Remember mark is the gold ribbon, not ✦. The end-of-page ornament is a small constellation.

## Palette

Contrast is the WCAG ratio against the background named. Body text needs 4.5:1. Large text and UI graphics need 3:1.

| Token | Light | Dark | Role | Contrast light / dark |
|---|---|---|---|---|
| page | `#f2eef1` | `#0f0e1b` | Page background | (background) |
| paper | `#fcfafc` | `#171527` | Inputs, dialog, ratings | (background) |
| stone | `#e8e3ea` | `#211e35` | Hover, grouped areas | (background) |
| lens (new) | `#fefdfe` | `#1a1830` | Review answer surface | (background) |
| well (new) | `#fefdff` | `#120f21` | Text fields inside dialogs | (background) |
| ink | `#1d1a31` | `#ece8f3` | Main text | 14.7 / 15.8 on page |
| graphite | `#5d5870` | `#a9a4bf` | Labels, metadata | 5.9 / 8.0 on page; 5.4 / 6.7 on stone |
| indigo | `#3c346f` | `#a79fdd` | Links, focus ring, active icon | 9.6 / 7.9 on page |
| plum | `#6b4b70` | `#c39dc6` | Speaking icon, italic eyebrow | 6.4 / 8.2 on page |
| crimson | `#9c4452` | `#d98a94` | The learner's mistake | 5.4 / 7.3 on page; 6.2 / 6.6 on lens |
| upgrade | `#3a6847` | `#a8cba3` | The better version | 5.6 / 10.7 on page; 6.4 / 9.6 on lens |
| on-accent | `#f6f3fa` | `#f4f0fb` | Text on primary buttons | 12.3 / 10.3 on night |
| night (new) | `#2e2858` | `#3a3168` | Primary button fill | 11.7 / 1.7 vs page (dark relies on brass) |
| brass (new) | `#b8954e` | gold at 72% | Thin edge on primary buttons | 2.5 / 5.9 vs page |
| gold | `#a07d3b` | `#d6b56c` | ✦, Mastered moon, ribbon, active lines. Never text | 3.3 / 9.7 on page |
| sage | `#5c785c` | `#95ad91` | Writing icon. Never small text | 4.3 / 7.9 on page |
| lavender | `#a59cca` | `#776fab` | Constellation lines only. Never text | decorative |
| line / line-strong | ink 11% / 20% | lavender-white 10% / 20% | Hairlines | decorative |
| star (new) | `#3c346f` | `#f2eeff` | Star dots (masked) | see Stars below |
| sky-a, sky-b (new) | peach-gold 30%, lavender 20% | violet 26%, blue 12% | Corner tint | worst case graphite 6.2:1 on darkest tint |

Primary button boundary: in light mode the fill does the work (11.7:1). In dark mode the brass edge does (5.9:1). Both pass 3:1.

## Typography

- Same two fonts: Instrument Serif and Inter. I did not add a third. Every serif idea I tried read better in Instrument Serif. A third family would make the app feel less calm.
- Page title 32px → 36px. Section titles 21px → 22px.
- Today due counts: Inter 21px → Instrument Serif 36px numerals. They read like entries in an observatory log.
- Review answer: Inter 28px → Instrument Serif 38px (32px on phones), in the upgrade color. The mistake stays Inter 16px crimson. The gap between the two is now much bigger.
- Uppercase labels: letter spacing 0.08em → 0.11em, like the scale on a brass instrument.

## Static effects

- **Star field.** Two still layers of tiny dots (0.5 to 1.15px).
  - A dense layer sits in a 640 × 520px window at the top-right, where no text sits on desktop.
  - A sparse dust layer covers the top of the page and fades out by 1300px.
  - Limit: wherever text can sit, each layer is at most 0.12 alpha (dark) or 0.06 (light). At that level graphite text keeps 5.8:1 and crimson 5.3:1.
  - On phones there is no empty gutter, so the dense layer drops to the dust level.
- **Nebula / dawn.** One soft radial tint in the top-right corner. Violet at night, peach-gold at dawn.
- **Star chart.** One faint Lyra constellation in the empty top-right gutter of Today. Hidden under 1320px.
- **Constellation section rule.** Each section hairline starts at a small gold ✦ and runs through two lavender stars before it becomes the plain line.
- **Constellation ornament.** Cassiopeia closes the Today page (above the backup line). Use the same for empty and completion states.
- **Moon phases for mastery.** 14px SVG, always with the word. New = outline. Learning = waxing crescent. Familiar = half moon. Mastered = full gold moon with a tiny ✦. The dark side is a faint disc, so the phase reads at small size.
- **Review lens.** The revealed answer, context and Why sit on one lifted surface. It has a hairline edge and a faint light from the top. No shadow, no blur.
- **Gold marks where you are.** Active nav bar, active tab underline and the review progress line are gold. The active nav item also gets a faint fill.
- **Primary button.** Deep violet-indigo, a 1px brass edge, light text. No glow.
- **Dialog.** A 1px brass line along the top edge.

## Motion

No looping, twinkling or moving sky. All motion is off when the system asks for reduced motion.

| What | Duration | When |
|---|---|---|
| Lens surface fades in | 160ms | Review: Reveal pressed |
| Answer "ink settles": opacity 0 → 1, blur 2px → 0, 2px rise | 220ms, starts 60ms after the lens | Review: Reveal pressed |
| Gold underline draws in from the left (scaleX 0 → 1) | 200ms | A tab becomes active |
| Moon gains one phase: the lit part sweeps in | 300ms, once | Mastery goes up after a rating |

The keyframes are in `concept.css`, section 13.

## What would change in the real app

**`src/styles/index.css`**
- Change the values of all existing color tokens (table above).
- Add tokens: `night`, `night-hover`, `brass`, `lens`, `lens-edge`, `well`, `star`, plus the sky tints. Adding Tailwind color names changes the locked theme, so the lead must approve it.
- Add keyframes `lens-in`, `draw-in` and `moon-wax`. `ink-settle` changes from a 4px rise to a 2px rise.

**Components**
- `components/ui/Button.tsx`: primary = `bg-night border border-brass text-on-accent`.
- `components/ui/MasteryMark.tsx`: new moon-phase paths in `MasteryGlyph`.
- `components/ui/Section.tsx`: constellation start on the section rule. This replaces the v1.1 `mark` prop on sections, because every rule now starts with a ✦.
- `components/ui/Ornament.tsx`: the `constellation` variant becomes the Cassiopeia drawing.
- `components/ui/Tabs.tsx`: gold underline with draw-in.
- `components/ui/Dialog.tsx`: brass top line; fields use `bg-well`.
- `app/AppShell.tsx`: replace the paper grain with the sky layers; darker sidebar in dark mode.
- `app/Sidebar.tsx` and `BottomNav.tsx`: gold active bar; Add button in night + brass.
- `features/review/ReviewScreen.tsx`: lens wrapper, serif answer, gold progress line.
- `features/today/TodayScreen.tsx`: serif due counts, star chart.
- `features/quick-add/*`: no layout change. The ✦ label and the upgrade color already match v1.1.

**Rules in CLAUDE.md**
- Gold also marks the current position (nav, tab, progress).
- The review answer uses `font-serif`.

## Risks and trade-offs

- **Stars on other screens.** Today and Review have an empty top-right corner. All Notes and other wide pages put buttons near it. The star window needs a check on each screen, or it should start below the page header.
- **Lavender-grey light mode.** It is cooler than the brief's warm parchment (§7). It fits the dawn idea, but it moves away from "warm academic".
- **Serif answer.** Instrument Serif is narrow. Very long answers (two or more lines) may read slower than Inter. Fallback: use the serif for one-line answers only, or keep Inter at 30px.
- **Dark primary button.** The fill is close to the page (1.7:1). The brass edge must stay; without it the button loses its shape.
- **More gold.** Gold now marks position as well as ornaments and Mastered. It stays as thin lines and small icons, never text or fills. It is still more gold than v1.1.
- **Section rules.** The gold ✦ at the start of every section rule repeats 4 times on Today. If it feels busy, keep it only on the first section of a page.
- **Rendering.** Star masks need CSS `mask-composite` (Chrome 120+, Safari 15.4+, Firefox 53+). Older browsers show no stars, which is acceptable.
