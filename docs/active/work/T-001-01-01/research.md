# Research — T-001-01-01: scaffold-nextjs-approuter-typescript-project

## Ticket in one line

Convert the empty repo into a runnable Next.js (App Router) + TypeScript project that
boots with `npm run dev` and passes `npm run build` — the substrate every other epic
depends on.

## Current repository state (snapshot)

Observed via `ls`, `git ls-files`, and doc reads on 2026-07-01.

- **Zero tracked files** — `git ls-files` returns nothing. This is a genuinely empty
  code repo; everything present is untracked working-tree content.
- Present but untracked: `CLAUDE.md`, `SEED.md`, `docs/`, plus lisa/vend tooling
  (`.lisa/`, `.lisa.toml`, `.lisa-layout.kdl`, `.vend/`, `.claude/`).
- **No application code exists yet**: no `package.json`, no `app/`, `components/`, or
  `lib/` directories, no `tsconfig.json`, no `next.config.*`, no lockfile, no
  `node_modules/`.
- Toolchain available on the host: Node `v26.4.0`, npm `11.17.0`. Modern enough for the
  current Next.js line; no version-manager pin file (`.nvmrc`) is present.

## What the docs mandate

Three knowledge docs and the epic/story constrain this ticket tightly.

**CLAUDE.md** (project instructions):
- Stack is fixed: Next.js App Router + React + TypeScript, client-side only, no backend.
- Target source layout is named explicitly:
  - `app/` — App Router entry (`page.tsx`, `layout.tsx`, `globals.css`)
  - `components/` — Board, Cell, NextPreview, Scoreboard, GameOverlay, …
  - `lib/` — pure, framework-free game logic (tetrominoes, board ops, collision, …)
- Commands the scaffold must make real: `npm run dev`, `npm run build`, `npm run lint`,
  `npm run start`.
- Deploy target is Vercel (CLI / Git integration) — not in scope for this ticket but the
  scaffold must be Vercel-compatible (standard Next.js output).

**Epic E-001** (`scaffold-runnable-app-skeleton`) pins two **human-assented forks** that
must be honored as settled decisions, not re-litigated:
1. **Tailwind** for styling (chosen over CSS Modules). The neon/glass theme itself is a
   *later* epic — this ticket only wires Tailwind so it applies.
2. **DOM / CSS-grid of cell `div`s** as the board renderer (chosen over `<canvas>`). This
   ticket renders a **placeholder board** as a CSS grid, not a live game.

Epic "Done looks like" also expects `npm run lint` to run clean and a placeholder board to
render as a CSS grid of cell divs.

**Story S-001-01** groups this ticket with `T-001-01-02` (verify-lint-runs-clean), which
`depends_on` this ticket.

## Acceptance criteria (verbatim intent)

From a clean checkout: `npm run dev` serves the app at http://localhost:3000 **and**
`npm run build` produces a passing production build; `package.json`, `tsconfig.json`, the
Next config, and `app/{layout,page}.tsx` + `globals.css` exist and are committed.

## Boundaries with sibling tickets

- **T-001-01-02 (verify-lint-runs-clean)** owns the *verification* that
  `npm run lint` exits 0 with zero warnings. It depends on this ticket. To avoid a missing
  DAG edge / file collision, **this** ticket must still produce a wired, working ESLint
  config (a standard `create-next-app` scaffold includes one) so the sibling ticket has
  something green to verify. This ticket should not, however, add extra lint tooling or
  custom rules — that stays minimal.
- Downstream epics (game loop, tetromino/collision/scoring logic, neon/glass theme,
  animations, Vercel deploy) are **out of scope**. The scaffold must leave `components/`
  and `lib/` as clean, near-empty tracks those epics can fill without collision.

## Patterns & conventions to respect

- Keep `lib/` pure and framework-free (CLAUDE.md) — so no React imports leak into it. For
  scaffolding this mostly means: don't put UI logic there; a tiny placeholder is fine.
- `app/` uses the App Router file conventions: `layout.tsx` (root layout, `<html>`/`<body>`,
  metadata), `page.tsx` (route `/`), `globals.css` (imported once in the layout).
- Rendering vs. logic must stay on separable tracks (CLAUDE.md, epic) — the board
  placeholder should be a dumb presentational grid, not wired to any game state.

## Assumptions & constraints surfaced

- **Assumption:** "the current Next.js line" = the latest stable Next.js (14/15-era) with
  the App Router as default. No doc pins a version, so use whatever `create-next-app`
  ships as stable. Node 26 is well ahead of Next's minimum, so no engine friction.
- **Assumption:** Tailwind version follows whatever the Next.js scaffold wires (v3 vs v4
  differ in config shape — v4 is CSS-first with `@import "tailwindcss"`, v3 uses
  `tailwind.config.js` + `@tailwind` directives). The design phase will decide which,
  grounded in what the current tooling installs.
- **Constraint:** Must run from a *clean checkout* — so `package-lock.json` must be
  committed and the build must not depend on any un-committed global state.
- **Constraint:** No backend, no accounts, no persistence beyond (future) localStorage.
  The scaffold stays client-only; a Server Component root layout is fine but there is no
  API route or data fetching.
- **Constraint:** "Ships in one sitting" — prefer the well-trodden `create-next-app`
  happy path over bespoke config to minimize risk.

## Open questions for Design

1. Scaffold via `create-next-app` then prune, or hand-author the minimal file set?
2. Tailwind v3 vs v4 — accept the scaffold default or pin deliberately?
3. Does the placeholder board live in `app/page.tsx` directly, or as a first
   `components/Board.tsx` (seeding the `components/` track)?
4. `src/` directory or root-level `app/` — CLAUDE.md names root-level `app/`,
   `components/`, `lib/`, so the `src/` option should be declined.
