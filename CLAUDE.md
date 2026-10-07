# IELTS Upgrade Notebook

Private, browser-only notebook for IELTS corrections with spaced review. React 19 + TypeScript + Vite 8 + Dexie (IndexedDB) + Tailwind 4. Installable PWA.

- Product brief (source of truth for UX and visuals): `docs/product-brief.md`
- Technical design: `docs/superpowers/specs/2026-10-07-ielts-upgrade-notebook-design.md`
- Implementation plan and module contracts: `docs/superpowers/plans/2026-10-07-ielts-upgrade-notebook.md`

## Commands

- `npm run dev`: dev server
- `npm run typecheck`: TypeScript (tsc 7)
- `npm test`: Vitest (jsdom + fake-indexeddb)
- `npm run build`: typecheck + production build
- `npm run e2e`: Playwright (builds, then serves on port 4173)

## Rules

- Shared contract: `src/lib/types.ts` and `src/lib/taxonomy.ts`. Do not change them without a request to the lead.
- Import with the `@/` alias (`@/lib/repo`, `@/components/ui/Button`).
- The Tailwind theme is locked in `src/styles/index.css`. Only these exist:
  - Colors: `page paper stone ink graphite indigo plum gold sage crimson upgrade line line-strong on-accent scrim`
  - Text sizes: `text-meta text-small text-body text-body-lg text-note text-section text-recall text-title`
  - Radii: `rounded-xs rounded-sm rounded-md rounded-lg rounded-full` (full only for small tags)
  - Shadow: `shadow-float` (menus and dialogs only)
  - Fonts: `font-sans` (default UI), `font-serif` (page titles, notebook titles, quotes, model paragraphs)
  - Default Tailwind names like `text-sm`, `bg-white`, `rounded-xl`, `shadow-md` produce no CSS. Do not use them.
- Gold and sage are never used for small text. Graphite and crimson text never sit on `bg-stone`.
- Never use `dangerouslySetInnerHTML`. Render note text with `<Markdown>` from `@/lib/markdown`.
- Pass `now: Date` into date logic so it can be tested.
- Copy is calm and plain (brief §36). No exclamation marks. No emoji except the mastery symbols ○ ◔ ◑ ✦.
- No gamification, AI features or analytics charts (brief §42).
- Every interactive element: keyboard reachable, visible focus, `aria-label` on icon-only buttons, at least 44px tall under 640px wide.
- Do not add npm dependencies.
- Commits use the local git identity (ngohoangkhoi05@gmail.com). Do not change git config.
