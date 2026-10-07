# BUILD: IELTS UPGRADE NOTEBOOK

> Source of truth for product, UX and visual design. Written by the owner. Do not edit.

Design and build a polished personal learning app called:

**IELTS Upgrade Notebook**

It is a private note-taking and spaced-repetition system for an IELTS learner improving from approximately Band 6.5 to Band 7.0+.

The user studies with external AI tools or teachers.

This app does **not** teach IELTS itself.

Its purpose is to capture the user's personal language mistakes and useful corrections, then help the user remember and reuse them.

The core learning loop is:

**Make a mistake → Get corrected → Save the correction → Review it → Reuse it naturally**

There are two main modes:

**Speaking**
**Writing**

For Speaking:

**What I Said → Native Upgrade → Context**

For Writing:

**My Sentence → Band 7+ Upgrade → Reusable Pattern → Context**

The most important information in the entire product is:

**My mistake → Better English → Example → Review**

Everything in the interface should support this loop.

---

# 1. PRODUCT POSITIONING

This app should feel like:

**A private language notebook belonging to a student in a modern arcane academy.**

The visual inspiration is:

- dark academia
- university libraries
- old linguistic journals
- observatory notebooks
- botanical reference books
- handwritten annotations
- quiet magical study rooms
- archival index systems

However:

**This is NOT a fantasy game.**

Do not create:

- cartoon witches
- broomsticks
- potions
- magic wands
- RPG interfaces
- glowing purple buttons
- excessive stars
- magical particle effects
- Halloween visuals
- fantasy illustrations everywhere

The witch-academy theme should be felt through:

- typography
- color
- small symbols
- subtle ornamentation
- academic layouts
- paper-like surfaces
- restrained visual details

The product should still look like a **high-end modern productivity app**.

Think:

**Notion × premium academic journal × subtle arcane library**

—not—

**mobile fantasy game × IELTS app**

---

# 2. UX PRINCIPLES

Follow these principles throughout the product.

## Principle 1 — Writing comes first

The user's notes are the hero.

Do not overwhelm notes with UI decoration.

When viewing a note, the user's sentence and improved sentence should receive more visual importance than metadata.

## Principle 2 — Reduce visual containers

Do not put every element inside a large rounded card.

Prefer:

- clean lists
- thin separators
- section headings
- subtle surface changes
- tables
- editorial layouts

Use cards only when they genuinely improve understanding.

## Principle 3 — Personal mistakes are more important than generic vocabulary

The product should encourage saving:

❌ What I said

✅ Better version

rather than building huge generic vocabulary lists.

## Principle 4 — Context is mandatory

Do not encourage isolated notes such as:

"scenery = landscape"

Encourage:

"The scenery along the coast was breathtaking."

Every useful phrase should ideally live inside a complete sentence.

## Principle 5 — Fast capture

The user will often finish a ChatGPT session and immediately save corrections.

Creating a note should take approximately **10–20 seconds**.

Do not force the user through a long form.

## Principle 6 — Calm review

Spaced repetition should feel like quiet study rather than gamification.

No:

- coins
- XP
- leaderboards
- confetti
- streak pressure
- cartoon achievements

A small streak indicator is acceptable.

---

# 3. INFORMATION ARCHITECTURE

Desktop navigation:

**Today**
**Review**
**Speaking**
**Writing**
**Mistakes**
**Must Remember**
**All Notes**
**Calendar**

At the bottom:

**Settings**

Use simple icons with thin strokes.

Do not use large navigation cards.

---

# 4. PRIMARY APP MODES

At the top of relevant screens, allow quick switching:

**Speaking / Writing**

Do not use oversized pill controls.

Use elegant tabs.

Example:

```
Speaking     Writing
────────
```

The active tab can use:

- deeper ink color
- a thin accent underline

---

# 5. TODAY DASHBOARD

The dashboard should answer only:

**What should I study today?**

Do not overload it with analytics.

Suggested hierarchy:

### Greeting / date

Example:

Wednesday, 7 October

Small secondary line:

"Your notebook has 12 items waiting for review."

### Primary action

**Begin Review**

This should be the strongest action on the screen.

### Review summary

Speaking
8 due

Writing
4 due

### Continue studying

Show the most recently used notebook/topic.

Example:

Academic Task 1
Trend Language

Last studied yesterday

### Recent notes

Show approximately 4–6 recent notes.

Keep them compact.

### Personal pattern

Example:

Most repeated issue this week:

**Prepositions**

4 notes

This is more useful than generic charts.

---

# 6. VISUAL DESIGN SYSTEM

The UI should feel premium, quiet, academic and mature.

## Overall mood

Keywords:

- restrained
- scholarly
- elegant
- warm
- mysterious
- focused
- editorial
- timeless

Avoid:

- overly rounded SaaS design
- bright startup colors
- gradients everywhere
- glassmorphism
- oversized typography
- excessive shadows

---

# 7. COLOR SYSTEM

Use a warm academic palette.

## LIGHT THEME

### Main background

**Parchment** `#F5F1E8`

Use for the page background. It should feel warmer than pure white without looking yellow.

### Primary surface

**Paper** `#FBF9F4`

Used for writing areas and important content.

### Secondary surface

**Stone** `#ECE7DE`

Used sparingly for grouped sections and hover states.

### Primary text

**Ink** `#211F24`

Almost black, slightly warm. Never use pure black.

### Secondary text

**Graphite** `#6D6870`

For metadata and descriptions.

### Primary brand accent

**Midnight Indigo** `#38334F`

Use for:

- active navigation
- important buttons
- selected states
- key labels

Do not cover large areas with purple.

### Secondary accent

**Dusty Plum** `#665466`

Use sparingly for:

- Speaking
- subtle category indicators
- secondary highlights

### Academic accent

**Antique Gold** `#AA8D50`

Use only for:

- favorites
- small mastery indicators
- ornamental separators
- important details

Never use gold for large backgrounds.

### Sage

`#747B69`

For:

- mastered states
- Writing categories
- subtle success states

### Error

**Muted Crimson** `#9A565C`

Used for the learner's incorrect language. Avoid bright red.

### Success / correction

**Deep Sage** `#596D59`

Used for improved language.

---

# 8. DARK THEME

The dark theme should feel like studying inside an old library at night.

- Background: `#141319`
- Surface: `#1C1A21`
- Elevated surface: `#242129`
- Primary text: `#EAE5DB`
- Secondary text: `#AAA4AC`
- Indigo accent: `#8A82AA`
- Muted gold: `#B69D66`
- Sage: `#89927E`
- Crimson: `#B66B73`

Avoid pure black backgrounds. Avoid neon purple.

---

# 9. COLOR USAGE RULE

Approximately:

- 70% neutral surfaces
- 20% typography / borders
- 10% accent colors

The theme should come from subtle details rather than large colored blocks.

---

# 10. TYPOGRAPHY

Use two font families.

## Editorial / academic font

Use: **Instrument Serif**. Alternative: **Libre Baskerville**.

Use for:

- page titles
- notebook titles
- occasional quotes
- model paragraph headings

Do not use it everywhere.

## UI font

Use: **Inter**. Alternative: **Manrope**.

Use for:

- body text
- forms
- navigation
- metadata
- buttons

## Typography philosophy

Avoid excessive bold.

Use hierarchy through:

- font family
- size
- spacing
- muted color

rather than constant font-weight changes.

Suggested hierarchy:

- Page title: 32px serif / regular
- Section title: 20–22px serif or sans / medium
- Primary note text: 17–18px
- Body text: 15–16px
- Metadata: 12–13px

---

# 11. SPACING SYSTEM

Use a consistent 4px base spacing system.

Primary increments: 4, 8, 12, 16, 24, 32, 48, 64

Use generous whitespace around reading content. Notes should feel comfortable to read. Avoid dense enterprise-dashboard spacing.

---

# 12. CORNER RADIUS

Do not create bubbly UI.

Recommended:

- Inputs: 6px
- Small controls: 6px
- Cards: 8px maximum
- Large containers: 8–10px maximum

Avoid 16px, 20px, 24px, fully rounded pill containers — unless used for very small tags.

---

# 13. SHADOWS

Use almost no shadows.

Prefer:

- thin borders
- surface contrast
- spacing

If elevation is necessary, use extremely soft shadows. Cards should not appear to float dramatically.

---

# 14. BORDERS

Use subtle borders:

- Light: `rgba(33,31,36,0.10)`
- Dark: `rgba(255,255,255,0.10)`

Use horizontal separators frequently. This supports the academic-journal feeling.

---

# 15. ICONOGRAPHY

Use thin outline icons. Recommended style: Lucide-style icons.

Thematic symbols may include:

- quill
- bookmark
- crescent moon
- small four-point star
- book
- feather
- archive
- search
- calendar

Keep magical symbols subtle. Never use fantasy clip art.

---

# 16. SPEAKING NOTE STRUCTURE

Each Speaking note can contain:

Date, Topic, Subtopic, What I Said, Native Upgrade, Explanation, Example Sentence, Note Type, Tags, Review Date, Mastery, Favorite

Example:

### Travel

**What I Said**

"We enjoyed the scenario."

**Native Upgrade**

"The scenery was beautiful."

**Why**

"Scenery" refers to the landscape or views. "Scenario" refers to a situation.

**In context**

"The scenery along the coast was beautiful."

Another example:

### Food & Drinks

**What I Said**

"I don't customize other factors."

**Native Upgrade**

"I'm pretty flexible about the rest."

**In context**

"I normally ask them to cut the sugar down to 30%, but I'm pretty flexible about the rest."

---

# 17. WRITING NOTE STRUCTURE

Each Writing note can contain:

Date, Task Type, Topic, My Sentence, Band 7+ Upgrade, Why It Is Better, Reusable Pattern, Model Sentence, Model Paragraph, Error Type, Tags, Review Date, Mastery, Favorite

Example:

### Academic Task 1 · Trends

**My Sentence**

"The number of visitors of the City Zoo increased steadily."

**Band 7+ Upgrade**

"The number of visitors to the City Zoo increased steadily."

**Why**

Use "visitors to + place" rather than "visitors of + place".

**Reusable pattern**

"The number of visitors to ___ increased steadily from ___ to ___."

**Example**

"The number of visitors to the City Zoo increased steadily from 35,000 to 68,000."

---

# 18. NOTE VISUAL HIERARCHY

When displaying a note, show information in this order:

1. Topic / category
2. Incorrect language
3. Correct language
4. Explanation
5. Example
6. Reusable pattern
7. Metadata

The improvement should visually stand out more than the mistake.

Use restrained colors:

- Incorrect: muted crimson
- Upgrade: deep sage or primary ink

Never make mistakes look aggressively red.

---

# 19. QUICK ADD EXPERIENCE

This is one of the most important flows.

Use a keyboard shortcut on desktop: **N** or **Cmd/Ctrl + N**

Mobile: prominent **+** button.

When clicked, first ask: Speaking or Writing

Then show only essential fields.

## Speaking Quick Add

Topic, What I Said, Native Upgrade, Example Sentence, Save

## Writing Quick Add

Task Type, My Sentence, Band 7+ Upgrade, Reusable Pattern, Example Sentence, Save

Below: **More details** reveals:

- explanation
- error type
- tags
- review settings
- favorite

Do not expose every database field initially.

---

# 20. PASTE-FRIENDLY EXPERIENCE

The user frequently copies corrections from ChatGPT. Make paste behavior excellent.

Support:

- multiline text
- smart quotes
- bold text
- paragraphs
- bullet lists

Do not destroy formatting unnecessarily.

Model paragraphs should use a distraction-free editor.

---

# 21. SPEAKING TOPICS

Default categories:

Work, Study, Hometown, Home, Family, Friends, Food, Drinks, Travel, Technology, Shopping, Health, Exercise, Music, Movies, Books, Environment, Transport, Weather, Clothes, Social Media, Education, Culture, Holidays, Daily Routine

Custom categories must be supported.

---

# 22. WRITING STRUCTURE

## Academic Task 1

Chart types: Line Graph, Bar Chart, Pie Chart, Table, Map, Process

Language topics: Increase, Decrease, Stability, Fluctuation, Peak, Low Point, Comparison, Approximation, Overview, Introduction

## Task 2

Essay types: Opinion, Discussion, Advantages / Disadvantages, Problem / Solution, Two-Part Question

Language categories: Introduction, Thesis, Topic Sentence, Explanation, Example, Cause and Effect, Comparison, Concession, Conclusion

---

# 23. MODEL PARAGRAPHS

Allow users to save full model paragraphs separately from normal notes.

Example:

### Task 1 — Opposite Trends

"From 2012 to 2022, the three attractions showed markedly different trends. The National Gallery experienced a steady decline in attendance from 75,000 to 42,000, losing its position as the most popular of the three attractions. In contrast, the number of visitors to the City Zoo increased steadily from 35,000 to 68,000, making it the most visited attraction in 2022. Meanwhile, visitor numbers at the Botanical Garden remained relatively stable, rising slightly by 2,000 to 30,000 in 2017 before falling to 29,000 in 2022."

Allow the user to highlight text and convert highlighted phrases into a new note.

Options:

- Save as Collocation
- Save as Sentence Pattern
- Save as Linking Phrase
- Save as Grammar Pattern
- Save as Useful Expression

Example: Highlight "experienced a steady decline" → Create note from selection.

This interaction should be extremely easy.

---

# 24. REVIEW EXPERIENCE

The Review screen should be distraction-free. Do not show navigation-heavy interfaces during review. Use one main review item at a time.

## STATE 1

Show:

### Recall the better version

"We enjoyed the scenario."

Large empty space.

Button: **Reveal**

## STATE 2

After reveal:

### Better English

"The scenery was beautiful."

Then: **Context**

"The scenery in Nha Trang was beautiful."

Then ratings: Again, Hard, Good, Easy

Keep ratings compact.

---

# 25. REVIEW TYPES

Support:

### Mistake → Upgrade

Default. Show: What I Said. Recall: Better Version.

### Phrase → Sentence

Show: "remained relatively stable". Recall a complete sentence.

### Fill in the blank

"The National Gallery _________ a steady decline." Answer: "experienced"

### Pattern Recall

Prompt: Describe a stable trend. Expected idea: "Visitor numbers remained relatively stable."

---

# 26. SPACED REPETITION

Start with a simple review schedule:

New, Day 1, Day 3, Day 7, Day 14, Day 30, Day 60, Day 120

Rating behavior:

- Again: Return quickly.
- Hard: Shorter interval.
- Good: Normal interval.
- Easy: Increase interval.

Do not expose complex spaced-repetition math to the user.

---

# 27. MASTERY

Use four simple stages:

- ○ New
- ◔ Learning
- ◑ Familiar
- ✦ Mastered

Keep this subtle. Do not use giant progress bars.

---

# 28. MY MISTAKES

Create a dedicated screen: **My Mistakes**. Secondary decorative label: *Error Ledger*

Organize recurring errors into:

Prepositions, Articles, Tenses, Word Forms, Collocations, Word Choice, Awkward Phrasing, Speaking Grammar, Writing Grammar, Academic Task 1, Task 2

Show patterns such as:

### visitors of + place

Seen 4 times

Use instead: **visitors to + place**

Related notes →

The purpose of this page is to expose personal language habits.

---

# 29. MUST REMEMBER

Favorites page: **Must Remember**. Secondary decorative label: *Essential Notes*

Use a small antique-gold star: ✦

Do not create a large yellow favorite button. Show only high-value phrases and patterns.

---

# 30. SEARCH

Create a fast global search.

Search through: Original mistake, Upgrade, Example sentence, Reusable pattern, Explanation, Topic, Tags, Model paragraph

Search should tolerate partial phrases.

Example search: "stable"

Results:

- remained relatively stable
- remained broadly unchanged
- maintained a stable level

---

# 31. FILTERING

Filters: Speaking / Writing, Topic, Task Type, Error Type, Note Type, Mastery, Review Status, Favorite, Date

Use compact controls. Do not place 10 filters permanently across the page. Use a small filter drawer/dropdown.

---

# 32. ALL NOTES SCREEN

On desktop, avoid giant cards. Use a refined list/table hybrid.

Example columns: Topic, Mistake, Upgrade, Type, Next Review, Mastery

Click a row to open the note.

Allow: Compact View, Reading View. Reading View can show larger note previews.

---

# 33. NOTE DETAIL SCREEN

Use an editorial layout.

Left/main column: Mistake, Upgrade, Explanation, Context, Pattern

Right narrow column: Topic, Tags, Mastery, Next review, Created, Favorite

Do not use multiple nested cards. Use whitespace and thin dividers.

---

# 34. CALENDAR

Keep calendar minimal.

Show: Days studied, Notes added, Reviews completed

Use small dots or tiny stars. No complex planner functionality.

---

# 35. EMPTY STATES

Empty screens should feel intentional.

Example:

### No Speaking notes yet

"Save the phrases you wish you had used."

Add first note

Possible subtle decoration: a thin-line quill or constellation. No cartoon illustrations.

---

# 36. MICROCOPY

Tone should be calm, intelligent and supportive.

- Instead of "Awesome! You mastered this!" use "Marked as mastered."
- Instead of "Oops! Wrong!" use "Review again soon."
- Instead of "🔥 10-day streak!" use "10 days of consistent study."

Avoid gamified language.

---

# 37. MICRO-INTERACTIONS

Use restrained motion.

Recommended:

- 150–220ms transitions
- Subtle fade
- Small underline movement
- Gentle row hover
- Favorite star filling
- Reveal answer transition

When mastering a note: a small ✦ can fade in.

Do not use: confetti, bouncing buttons, particle effects, animated backgrounds, floating stars

---

# 38. RESPONSIVE DESIGN

## Desktop

- Sidebar: 220–240px
- Main reading content: approximately 720–900px maximum where appropriate

Avoid stretching paragraphs across the entire screen. Use wide space for tables where useful.

## Tablet

Collapse sidebar into icon rail or drawer. Maintain readable text width.

## Mobile

Bottom navigation: Today, Speaking, Add, Writing, Review

The Add control should be visually centered. Notes should use full-width reading layouts with minimal borders.

---

# 39. ACCESSIBILITY

- Maintain strong text contrast. Body text should meet WCAG AA contrast requirements.
- Do not communicate state through color alone. Example: use "✦ Mastered", not simply a green dot.
- Maintain touch targets of at least approximately 44px.
- Support keyboard navigation on desktop.
- Support visible focus states.
- Respect reduced-motion preferences.

---

# 40. DATA MODEL

## Notes

id, mode, date_created, topic, subtopic, task_type, original_text, upgraded_text, explanation, example_sentence, reusable_pattern, model_paragraph, note_type, error_type, tags, difficulty, is_favorite, mastery_status, review_stage, last_reviewed_at, next_review_at, times_reviewed, created_at, updated_at

## Reviews

id, note_id, review_date, rating, previous_interval, new_interval, created_at

---

# 41. IMPORTANT DATA BEHAVIOR

- Deleting a note should require confirmation.
- Editing a note should preserve its review history.
- Changing wording should not reset mastery automatically.

Users should be able to:

- duplicate a note
- archive a note
- restore archived notes
- export notes

Export options: CSV, JSON, Plain text / Markdown

The user owns their notes.

---

# 42. DO NOT BUILD

Do NOT add: AI chatbot, AI essay generator, automatic IELTS scoring, AI speaking simulator, social features, community, leaderboards, friends, coins, levels, XP, marketplace, generic vocabulary courses, complex analytics dashboard, unnecessary charts, habit-tracking features unrelated to language learning.

Keep the product focused.

---

# 43. HIGH-LEVEL VISUAL TEST

Before finalizing any screen, ask:

- Does this look like a generic SaaS dashboard? If yes: simplify it.
- Does this look like a fantasy game? If yes: remove decorative elements.
- Does this look like a serious academic notebook with subtle arcane personality? If yes: continue.

---

# 44. USER EXPERIENCE TEST

A first-time user should understand within approximately 10 seconds:

1. I save things I said incorrectly.
2. I save the better version.
3. The app brings these notes back for review.

If that is not immediately clear, simplify the interface.

---

# 45. MOST IMPORTANT SCREEN PRIORITY

Invest the most design attention in these screens, in this order:

1. Quick Add
2. Review
3. Note Detail
4. Today Dashboard
5. All Notes
6. My Mistakes
7. Model Paragraph
8. Search

Do not spend more effort on analytics than note capture and review.

---

# 46. FINAL ART DIRECTION

The final app should feel like:

**A beautifully designed private academic language journal with a subtle witch-academy atmosphere.**

Imagine: A student enters a quiet university library late at night. There are old books, handwritten notes, astronomy charts and small brass details. But the notebook and tools themselves are modern, clean and highly functional.

Translate that feeling into a digital interface.

Use: warm parchment, deep ink, midnight indigo, restrained plum, muted sage, tiny antique-gold accents, serif editorial titles, modern sans-serif UI text, thin borders, small radii, almost no shadows, generous whitespace, subtle arcane symbols

The interface should feel: **premium, quiet, intelligent, personal, mature, focused**

Never: **cute, cartoonish, busy, game-like, overly purple**

The final priority is always:

**Learning clarity first. Theme second.**
