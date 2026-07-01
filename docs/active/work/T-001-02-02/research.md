# Research — T-001-02-02: establish-app-components-lib-layout

Descriptive map of the codebase as it bears on the app/ · components/ · lib/ track
boundary. What exists, where, how it connects. No solutions here.

## Ticket in one line

Lay (and make durable) the `app/` · `components/` · `lib/` track boundary so rendering and
pure, framework-free game logic stay on separable tracks that lisa can build in parallel
without file collisions.

## Acceptance criteria (verbatim)

> `app/`, `components/`, and `lib/` directories exist and are committed; `lib/` holds at
> least one pure, framework-free placeholder module imported by the app, and `npm run build`
> still passes.

## Current repository state (snapshot 2026-07-01)

Observed via `ls`, `git ls-files`, and file reads.

Tracked source files (all three tracks already exist and are committed):

```
app/favicon.ico
app/globals.css
app/layout.tsx        — root layout (Server Component); imports globals.css; bg/fg utilities
app/page.tsx          — "/" route; TETRIS heading + <Board/>
components/Board.tsx   — static CSS-grid placeholder; imports COLS/ROWS from @/lib/constants
lib/constants.ts       — pure COLS=10, ROWS=20; no React/Next import
```

Config (from the scaffold, committed): `package.json`, `package-lock.json`, `tsconfig.json`
(`@/*` → repo root), `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` (flat,
`next/core-web-vitals` + `next/typescript`), `.gitignore`.

Toolchain as wired: Next.js **16.2.9**, React **19.2.4**, Tailwind **v4**, ESLint **9**,
TypeScript **5**.

## The central finding

**Every clause of the acceptance criteria is already satisfied by the scaffold ticket
(T-001-01-01, commit `516981b`):**

- `app/`, `components/`, `lib/` all exist and are git-tracked (see snapshot above).
- `lib/constants.ts` is a pure, framework-free module (no `react`/`next` import, no side
  effects) and is imported by the app: `components/Board.tsx` → `import { COLS, ROWS } from
  "@/lib/constants"`, and `Board` is rendered by `app/page.tsx`. So the import chain
  app → components → lib is live.
- `npm run build` passes today; `npm run lint` exits 0 (verified this session).

This ticket therefore is **not** greenfield creation. The directories were materialized as a
side effect of scaffolding. What is *not* yet present is anything that makes the boundary
**durable** — the criteria check that the tracks *exist*, but nothing yet stops a future
parallel track from erasing the separation (e.g. importing React into `lib/`).

## How the boundary is currently held

- **By convention only.** CLAUDE.md states: "Keep game logic in `lib/` pure and
  framework-free so it's testable and so lisa tracks touching rendering vs. logic don't
  collide." This is prose, not an enforced constraint.
- **Direction of imports today:** `app/` imports `components/`; `components/` imports
  `lib/`. `lib/` imports nothing (only exports constants). The intended dependency arrow is
  app → components → lib, with `lib/` at the leaf, framework-free.
- **No machine check** currently prevents `import { useState } from "react"` inside a
  `lib/**` file. ESLint (`eslint.config.mjs`) applies `next/core-web-vitals` +
  `next/typescript` uniformly to every file; there is no path-scoped rule.

## Why the boundary matters (from the docs / DAG)

- **Concurrency model** (rdspi-workflow.md, "Concurrency"): lisa computes a DAG from ticket
  `depends_on` and spawns parallel threads on the same branch; file locking serializes
  commits but is "a safety net, not a substitute for correct dependency modeling." Two
  tickets touching the same file is a *missing dependency edge*. Keeping rendering
  (`components/`, `app/`) and logic (`lib/`) physically separated is what lets the game-loop
  epic and the theme epic run concurrently without colliding.
- **CLAUDE.md source layout** names the three tracks explicitly and assigns them roles:
  `app/` = App Router entry, `components/` = presentational, `lib/` = pure logic
  (tetrominoes, board ops, collision, scoring, RNG).

## Sibling / dependency landscape

- **`depends_on: [T-001-01-01]`** (scaffold) — satisfied; it created the tracks this ticket
  ratifies.
- **Sibling in story S-001-02: T-001-02-01** (wire-tailwind-styling, phase `implement`).
  Per its `structure.md`, it touches **only** `app/layout.tsx` and `app/globals.css` and
  explicitly states it "does not touch `components/` or `lib/` — no collision surface with
  sibling ticket T-001-02-02." So this ticket must avoid `app/layout.tsx` and
  `app/globals.css` to keep that promise mutual.
- **T-001-01-02** (verify-lint-runs-clean, committed `c2008c9`) set `lint` to
  `eslint --max-warnings 0` and deliberately left `eslint.config.mjs` untouched. Its
  review flags that unused *exports* are not caught — relevant if this ticket adds barrel
  exports.
- **Downstream:** the pure-game-core epic (E-002, decomposed into S-002/S-003/S-004 per
  memory) is the first real consumer of `lib/`; it will add tetromino/collision/scoring/RNG
  modules and (per prior reviews) stand up a test runner. Those modules are the ones that
  must stay pure — so the boundary this ticket sets is aimed squarely at them.

## Constraints surfaced

- **No collision with T-001-02-01:** avoid editing `app/layout.tsx` / `app/globals.css`.
- **Build + lint must stay green** (`npm run build`, `eslint --max-warnings 0`).
- **No scope creep:** the neon/glass theme, game loop, and pure logic modules are downstream
  epics. This ticket establishes the *boundary*, not the contents of the tracks.
- **Zero-new-dependency preference:** the scaffold reviews repeatedly chose the minimal path;
  any enforcement mechanism should avoid adding a plugin if core ESLint can express it.
- **`lib/` must remain leaf-pure:** the only current `lib/` file imports nothing; any
  enforcement must not false-positive on legitimate app → lib imports (those live in
  `components/`/`app/`, not `lib/`).

## Assumptions

- The `@/*` path alias (tsconfig) is the canonical cross-track import mechanism and stays.
- `lib/constants.ts` already discharges the "at least one pure module imported by the app"
  clause; no *new* placeholder module is required to meet acceptance.
- Flat ESLint config (ESLint 9) supports per-path `files:`-scoped config objects, so a
  `lib/**`-only rule is expressible without touching global rule severities.

## Open questions for Design

1. Is the honest deliverable "ratify + harden the already-existing boundary," or is a no-op
   (criteria already met) the correct RDSPI outcome?
2. If hardening: enforce `lib/` purity via a path-scoped ESLint `no-restricted-imports` rule
   (zero new deps) — or leave it as documented convention?
3. Do the tracks need explicit public interfaces (barrel `index.ts` per track) now, or is
   that premature API surface that the unused-export gap would let rot?
4. Where does the boundary contract get documented so humans and future tickets can see it —
   code comment, `lib/README`, or only the artifact set?
