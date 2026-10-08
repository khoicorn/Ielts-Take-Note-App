/*
 * Shared class names for design v1.2 "Candlelit Library" (docs/mockups/concepts/a/README.md).
 * Feature screens import these so every brass rule, gilt edge and small-caps label looks the same.
 * `gold` is the decorative brass (rules, ornaments, gilt). `brass` is the readable brass (24px+ numerals,
 * thin bars, ✦ marks). Neither is used for small text.
 */

/** Brass hairline as a background, for 1px elements and pseudo lines: gold at 55% by day, 38% by night. */
export const BRASS_RULE = 'bg-gold/55 dark:bg-gold/38'

/** Brass hairline as a border color (section heads, the dialog bookplate frame). */
export const BRASS_BORDER = 'border-gold/55 dark:border-gold/38'

/** Double brass rule over a ledger (Today's due counts): 3px double line in the hairline color. */
export const BRASS_DOUBLE_RULE = 'border-t-[3px] border-double border-gold/55 dark:border-gold/38'

/**
 * Italic small-caps eyebrow, 16px (rule 3): sidebar group labels, Today's kicker, the "Mistake → Upgrade" key
 * line, Quick Add's description. Real small-cap glyphs from EB Garamond. Rubric is garnet by day, sand by night.
 */
export const SMALL_CAPS =
  'font-smallcaps text-body-lg leading-[1.4] font-medium tracking-[0.045em] text-rubric italic [font-variant-caps:small-caps]'

/** The same eyebrow in graphite, for a quieter label. */
export const SMALL_CAPS_QUIET =
  'font-smallcaps text-body-lg leading-[1.4] font-medium tracking-[0.045em] text-graphite italic [font-variant-caps:small-caps]'

/**
 * Filled control with text (rule 5): deep indigo fill, cream text. Never `bg-indigo` behind text:
 * in dark mode indigo is a light link color.
 */
export const FILL = 'bg-indigo-fill text-on-accent'

/**
 * Gilt hairline 3px inside the edge of a filled control, like tooling on a book cover (gold 70% by day,
 * 75% by night). A ::before frame, so it does not change when the fill changes on hover. The element needs
 * `relative` (included) and a 6px radius (`rounded-sm`). No glow, no outer shadow.
 */
export const GILT =
  'relative before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[3px] before:border before:border-gold/70 dark:before:border-gold/75'

/** The same gilt ring for a round control (the mobile Add button). */
export const GILT_ROUND =
  'relative before:pointer-events-none before:absolute before:inset-[3px] before:rounded-full before:border before:border-gold/70 dark:before:border-gold/75'

/** Hover and press shades of the indigo fill: darker by day, lighter by night (mixed with ink). */
export const FILL_HOVER =
  'hover:bg-[color-mix(in_srgb,var(--indigo-fill)_87%,var(--ink))] active:bg-[color-mix(in_srgb,var(--indigo-fill)_80%,var(--ink))]'

/**
 * Title initial (rule 2): the first letter of a page title in garnet by day, brass by night, 1.22 times larger.
 * Add to a block element (h1). PageHeader already uses it.
 */
export const TITLE_INITIAL =
  'first-letter:text-[1.22em] first-letter:leading-[0] first-letter:text-garnet dark:first-letter:text-brass'

/** Italic serif aside ("How well did you recall it?", "due"), 18px. */
export const SERIF_ASIDE = 'font-serif text-note italic text-graphite'

/** Large brass serif numerals (Today's due counts). 44px, so brass is readable. */
export const NUMERAL = 'font-serif text-numeral font-normal text-brass tabular-nums lining-nums'
