# Review — T-001-01-01: scaffold-nextjs-approuter-typescript-project

Handoff document. What changed, how it was verified, and what a human reviewer should know
without reading every diff.

## Outcome

The empty repo is now a runnable Next.js (App Router) + TypeScript app. From a clean state,
`npm run dev` serves http://localhost:3000 (HTTP 200), `npm run build` produces a passing
production build, and `npm run lint` exits 0. **All acceptance criteria met.**

## What changed

### New application code
- `app/layout.tsx` — root layout (Server Component). `metadata.title = "Tetris"`, imports
  `globals.css`, dark full-height `body`. Generator's Google-font imports removed (see
  Concerns #1).
- `app/page.tsx` — `/` route. Neon-gradient `TETRIS` heading + `<Board/>`. No client
  interactivity (no `"use client"`) — correct for a scaffold.
- `app/globals.css` — Tailwind v4 entry (`@import "tailwindcss"`) + a dark
  (`#0a0a0f`) full-height base. Deliberately minimal; the neon/glass theme is a later epic.
- `components/Board.tsx` — static CSS-grid placeholder: `COLS × ROWS` (10×20 = 200) empty
  bordered cell divs, `aria-label="Tetris board (placeholder)"`. No props, no state, no
  hooks — a dumb presentational seed the playability epic replaces.
- `lib/constants.ts` — pure `COLS = 10`, `ROWS = 20`. No React import; proves the
  logic/render boundary and the `@/*` alias (`components/` imports `@/lib/constants`).

### Config / tooling (generator-provided, retained)
- `package.json` (name set to `webapp-demo-lisa-vend`; scripts `dev`/`build`/`start`/`lint`),
  `package-lock.json`, `tsconfig.json` (strict, `@/*` → root), `next.config.ts`,
  `postcss.config.mjs` (`@tailwindcss/postcss`), `eslint.config.mjs` (flat,
  `next/core-web-vitals` + `next/typescript`), `.gitignore`.

### Pruned
- All demo SVGs from `public/` (`next/vercel/file/globe/window.svg`); generator boilerplate
  in `page.tsx`/`globals.css`/`layout.tsx` fully replaced.

### Toolchain versions (as wired by the current generator)
Next.js **16.2.9**, React **19.2.4**, Tailwind **v4**, ESLint **9**, TypeScript **5**.

## Verification

| Check | Command | Result |
|---|---|---|
| Lint clean | `npm run lint` | exit 0, zero warnings |
| Production build | `npm run build` | exit 0, `/` + `/_not-found` prerendered static |
| Dev server boots | `npm run dev` + `curl :3000` | HTTP 200 |
| Board renders | grep served HTML | `TETRIS` heading + placeholder board + 200 cells present |
| Alias / lib→component | (covered by build type-check) | `@/lib/constants` resolves |

Verification was build/boot-level. **No unit tests were added** — see Test coverage.

## Test coverage

- **No automated tests, by design.** This ticket adds no application *logic*; the pure
  `lib/` game code that warrants unit tests (tetrominoes, collision, scoring, RNG) is a
  downstream epic. Adding a test runner now would be an un-asked dependency and scope creep.
- **Gap flagged for the first `lib/` logic epic:** stand up Vitest (or Jest) + a `test`
  script at that point. `lib/constants.ts` is trivial enough not to need coverage yet.
- The build's TypeScript pass acts as the current correctness gate.

## Open concerns / notes for the reviewer

1. **Google fonts dropped deliberately.** The generator's `layout.tsx` used
   `next/font/google` (Geist), which fetches from Google Fonts at build time — a network
   dependency that risks clean/offline builds. Replaced with a system-font stack. If a
   branded display font is wanted, the theme epic should **self-host** it, not reintroduce a
   build-time fetch.
2. **`lint` is `eslint`, not `next lint`.** Next 16 removed `next lint`; the generator wires
   `"lint": "eslint"`. Functionally equivalent and satisfies CLAUDE.md. Sibling ticket
   **T-001-01-02** (verify-lint-runs-clean) can verify against this as-is — it is already
   green.
3. **`next-env.d.ts` is gitignored** (Next 16 generator default), so it is absent on a fresh
   checkout until the first `dev`/`build` regenerates it. Reproducible, but reviewers cloning
   fresh should run `npm install && npm run build` before expecting types to resolve in an
   editor.
4. **`components/Board.tsx` will be replaced, not extended.** It is intentionally trivial to
   avoid colliding with the real stateful board. The DAG should route the playability epic to
   overwrite this file; do not build incremental game state on top of the placeholder.
5. **`public/` is empty** and thus untracked. If Vercel/asset work later needs it, recreate
   the dir with content.
6. **2 moderate npm-audit advisories** in the transitive dep tree from `create-next-app`
   (unchanged from a fresh scaffold). Not addressed here — no `audit fix --force` run, since
   forcing breaking changes on a just-scaffolded tree is riskier than the advisories. Worth a
   glance during the deploy epic.

## Not in scope (downstream epics)

Game loop, tetromino/collision/scoring/RNG logic, neon/glass theme tokens + animation,
hold/ghost/next-preview/scoreboard components, localStorage high-scores, and the Vercel
deploy itself. `components/` and `lib/` each hold exactly one placeholder file so those
tracks start clean.

## Bottom line

Scaffold is complete, verified, and committed (`516981b`). The keystone is in place — the
board can now be pulled for playability and visual work without scaffolding debt.
