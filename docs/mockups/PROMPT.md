# Prompt for an AI design reviewer

Copy everything below the line into the other AI. Attach the PNG files from `docs/mockups/png/` (start with the light versions of screens 01, 02, 04, 05, 08, 11). If the tool accepts files, also attach the matching HTML from `docs/mockups/standalone/`.

---

You are a senior product designer. Review the attached mockups of my app and propose concrete UI/UX improvements.

## The app

**IELTS Upgrade Notebook** is a private notebook for one IELTS learner moving from Band 6.5 to Band 7+. I practise with ChatGPT or a teacher. When I am corrected, I save the correction here and the app brings it back for spaced review.

The core loop: **make a mistake → get corrected → save the correction → review it → reuse it naturally.**

Two modes:
- **Speaking:** What I Said → Native Upgrade → Context sentence
- **Writing:** My Sentence → Band 7+ Upgrade → Reusable Pattern → Context sentence

The most important information is: **my mistake → better English → example → review.**

It runs in the browser, works offline, and has no account.

## Look and feel (keep this)

A private language notebook from a modern arcane academy: dark academia, old linguistic journals, observatory notebooks, quiet library at night. But it must still look like a high-end modern productivity app: "Notion × premium academic journal × subtle arcane library". Not a fantasy game, and not a generic SaaS dashboard.

Fixed design rules:
- Colors (light): Parchment `#F5F1E8` page, Paper `#FBF9F4` surface, Stone `#ECE7DE` hover, Ink `#211F24` text, Graphite `#6D6870` metadata, Midnight Indigo `#38334F` accent, Dusty Plum `#665466` (Speaking), Antique Gold `#AA8D50` (tiny accents only), Sage `#747B69` (Writing), Muted Crimson `#9A565C` (my mistake), Deep Sage `#596D59` (the upgrade). Dark theme: `#141319` / `#1C1A21` / `#242129`, text `#EAE5DB`.
- About 70% neutral surfaces, 20% text and borders, 10% accent.
- Fonts: Instrument Serif for page titles and quotes only. Inter for everything else. Little bold.
- Corner radius 6–10px. Almost no shadows. Thin hairline borders. Few cards.
- Icons: thin outline (Lucide). Subtle symbols only: crescent, four-point star ✦, quill.
- Mastery: ○ New, ◔ Learning, ◑ Familiar, ✦ Mastered (always with the word).
- Calm microcopy. No exclamation marks.

Do not suggest: AI chat, AI scoring, XP, coins, levels, streak pressure, confetti, leaderboards, social features, analytics charts, generic vocabulary courses, glowing purple, gradients, glassmorphism.

## Screens attached (in priority order)

1. **Quick Add** (01, 02, 03, m01): save a correction in 10–20 seconds, right after a ChatGPT session. Step 1 picks Speaking or Writing. "More details" hides the optional fields. A smart-paste bar fills fields from pasted ChatGPT text.
2. **Review** (04, 05, 06, 07, m02): one card at a time, no navigation. State 1 shows my sentence; I try to recall the better version, then press Reveal. State 2 shows the answer and four ratings: Again, Hard, Good, Easy.
3. **Note Detail** (08): one correction in an editorial layout, with a metadata column.
4. **Today** (11, 12, m03): answers only "what should I study today?". 12 is the first-run screen.
5. **All Notes** (14): a list/table hybrid with a compact filter popover.
6. **My Mistakes** (15): my repeated error habits, grouped by error type, with counts.
7. **Model Paragraph** (09, 10): a saved model paragraph. I highlight a phrase and save it as a new note. 10 is the distraction-free editor.
8. **Search** (13): global search that tolerates partial words.

Also attached: Speaking notebook (16), Must Remember favorites (17).

## What I want from you

Answer these, with specific changes (sizes in px, positions, wording, colors from the palette above):

1. **First 10 seconds.** Can a new user tell from Today and Quick Add that they (1) save what they said wrong, (2) save the better version, (3) get it back for review? What would make that clearer?
2. **Quick Add speed.** Count the clicks and keystrokes to save one Speaking correction. How can it be faster without hiding anything important? Is the smart-paste bar clear?
3. **Review.** Does recall feel calm and focused? Is the answer reveal satisfying without being game-like? Are the rating buttons clear and easy to hit on a phone?
4. **Hierarchy.** On every screen, does the upgrade stand out more than the mistake? Is metadata quiet enough?
5. **Theme.** Is the arcane-academy feeling present but subtle? Name 3 small details that would add character without decoration (typography, ornament, layout, motion). Name anything that feels like a fantasy game or a SaaS dashboard.
6. **Mobile.** Is the bottom bar with the centered Add right? Are touch targets at least 44px?
7. **Accessibility.** Any contrast, focus or "color-only" problems you can see?

## Output format

1. A numbered list of your top 15 changes, most impactful first. For each: screen number, the problem, the exact change, and why it helps the learning loop.
2. For your top 3 screens to improve: a short description of the improved layout, or revised HTML/CSS that keeps the same CSS variables (`--page`, `--paper`, `--stone`, `--ink`, `--graphite`, `--indigo`, `--plum`, `--gold`, `--sage`, `--crimson`, `--upgrade`, `--line`).
3. What to keep: the 5 things that already work best.

Keep the product focused. Learning clarity first, theme second.
