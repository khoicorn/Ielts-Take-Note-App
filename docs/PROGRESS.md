# Build progress

Last updated: 2026-10-08 (morning).

## Done

| Step | Result |
|---|---|
| Brief, design spec, plan | `docs/product-brief.md`, `docs/superpowers/specs/…-design.md`, `docs/superpowers/plans/…-notebook.md` |
| Scaffold | Vite 8 + React 19 + TS 7 + Dexie + Tailwind 4 + PWA. Tokens in `src/styles/index.css`. Contract in `src/lib/types.ts`, `src/lib/taxonomy.ts` |
| Workflow 1, Task A (data + logic) | 16 modules in `src/lib`, 32 example notes + 2 paragraphs in `seed.ts` |
| Workflow 1, Task B (design system + shell) | ~30 components in `src/components`, shell in `src/app`, `/design` preview page, PWA icons |
| Workflow 1, Task F1 (integration) | Typecheck clean. 180 of 180 tests pass |
| Git | Pushed to https://github.com/khoicorn/Ielts-Take-Note-App as `ngohoangkhoi05@gmail.com` |

## Done on 2026-10-08

| Step | Result |
|---|---|
| Workflow 1, reviews + fix | 23 issues found, 21 fixed + 1 extra bug. Typecheck clean, 203/203 tests, build OK (bundle-size warning at 508 kB, fixed in Workflow 2) |
| Design refinements v1.1 | Owner feedback applied: Must Remember ribbon, celestial dividers, lavender accent, ink reveal |
| Workflow 2 (screens) | All 12 screens built. 3 agents (Review, Today + Calendar, Search + Settings) lost connection; integration built Review and Settings from their tests. Typecheck clean, 327/327 tests, main chunk 292 kB. Smoke: 14 routes × 2 sizes × 2 themes, 5 flows |
| Hosting | GitHub Pages config: base path, router basename, PWA scope; tested under a Pages-like server (12/12 checks incl. offline). Vitest limited to 4 workers (21 workers on this 22-core laptop made tests flaky) |
| Workflow 3 (QA) | 5 reviewers, 3 fixers, 1 gate: 55 findings, 54 fixed + 1 by lead. 376/376 unit, 89/89 E2E, build OK |
| Witchier concepts | 3 directions in `docs/mockups/concepts/` (compare: `index.html`). Owner chose **A · Candlelit Library** |
| Mockups | 21 screens in `docs/mockups/`: `png/` (42 PNGs, light + dark), `standalone/` (21 self-contained HTML), `index.html` gallery, `PROMPT.md` for outside AI reviewers |

## Hosting (owner decision 2026-10-08)

GitHub Pages at https://khoicorn.github.io/Ielts-Take-Note-App/. Deploy script: `.github/workflows/deploy.yml` (typecheck + tests gate the deploy). Owner enables Settings → Pages → Source: GitHub Actions.

Done 2026-10-08: base path, basename, PWA scope, local Pages-like test. Owner set Source: GitHub Actions.

## Next steps

1. Apply Concept A (Candlelit Library) to the app: tokens, fonts, shared components, then every screen. Spec: `docs/mockups/concepts/a/README.md`. It changes refinement v1.1 rules 2 (ribbon → garnet) and 6 (dark button → deep indigo with gilt hairline); owner accepted by choosing A.
2. Visual check of every screen in light and dark, desktop and phone; contrast test; unit + E2E; push (auto-deploys).
