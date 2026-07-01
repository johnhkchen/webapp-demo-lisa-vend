# Plan — T-002-01-01: board-model-and-core-types

Ordered, independently-verifiable steps. Each step names its verification. Commits are
atomic and scoped to code + this ticket's artifacts (never frontmatter, never sibling files).

## Testing strategy

- **Unit test only** (`lib/board.test.ts`), run via Vitest — the AC's explicit requirement.
  It asserts: (a) dimensions match `(width, height)`, (b) initial all-`null` emptiness,
  (c) rows are non-aliased, (d) `(w,h)` arg order is honored.
- **No integration/DOM test** — this is pure node logic with no rendering; jsdom would be
  dead weight (consistent with prior artifacts).
- **Three gates must stay green** after the change: `npm run test`, `npm run lint`
  (zero-warning + purity boundary), `npm run build` (whole-tree strict type-check).
- Types (`lib/types.ts`) are verified transitively: `board.ts` and the test import them and
  must type-check under `strict`; a wrong type surfaces at build/test.

## Step 1 — Stand up the Vitest runner

- `npm install -D vitest` → adds `vitest` to `devDependencies`, updates lockfile.
- Add `"test": "vitest run"` to `package.json` `scripts`.
- **Verify:** `npx vitest run` exits cleanly reporting "no test files" (or passing once tests
  exist); `npm run lint` still exit 0; `npm run build` still exit 0 (no new prod dep).
- **Commit:** `chore(T-002-01-01): stand up vitest runner for pure lib tests`
  (files: `package.json`, `package-lock.json`). Logically separable from the substrate, so
  its own commit; if the lockfile churn is noisy it may fold into Step 4 — noted in progress.

## Step 2 — Define core types (`lib/types.ts`)

- Create with `Point`, `TetrominoType`, `RotationState`, `Cell`, `Board`, `Piece` exactly as
  specified in `structure.md`, with the documented doc comments.
- Pure `type`/`interface` only — no runtime, no imports.
- **Verify:** `npx tsc --noEmit` (via `npm run build`) type-checks; `npm run lint` exit 0
  (purity rule: no framework import present).

## Step 3 — Implement `emptyBoard` (`lib/board.ts`)

- Create `board.ts` with `import type { Board, Cell } from "./types"` and the `emptyBoard`
  function using nested `Array.from` (fresh row per iteration, `null` cells).
- **Verify:** type-checks; `npm run lint` exit 0.

## Step 4 — Unit test (`lib/board.test.ts`)

- Create the test per `structure.md`: four `it` blocks (dimensions, emptiness, non-aliasing,
  arg order) under one `describe`, importing `{ describe, it, expect }` from `vitest` and
  `emptyBoard` from `./board`.
- **Verify:** `npm run test` → all assertions pass; `npm run lint` exit 0 (test is under
  `lib/**`, imports only `vitest`, purity rule satisfied); `npm run build` exit 0 (test file
  type-checks and is not bundled).
- **Commit:** `feat(T-002-01-01): add board model, core types, and emptyBoard with unit test`
  (files: `lib/types.ts`, `lib/board.ts`, `lib/board.test.ts`).

## Step 5 — Full green sweep + Review

- Run all three gates once more from a clean state:
  - `npm run test` → passing.
  - `npm run lint` → exit 0, zero warnings.
  - `npm run build` → exit 0, app still builds (`/` prerendered), no prod-dep change.
- Confirm no React/Next import anywhere under `lib/` (grep) — the AC's machine-checkable
  clause, doubly confirmed beyond the lint rule.
- Write `review.md` (handoff: changes, coverage, open concerns).

## Commit hygiene

- Two commits total (Step 1 runner; Step 4 substrate+test), each `T-002-01-01`-scoped.
- Stage only the files each step names. Never `git add -A`. Leave all other working-tree
  files (sibling tickets, other work dirs) and all frontmatter untouched for Lisa.
- Committing on shared `main` per the RDSPI concurrency model; artifacts under
  `docs/active/work/T-002-01-01/` may be committed alongside or left staged — keep them
  scoped to this ticket either way.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `Array(h).fill(Array(w).fill(null))` row-aliasing bug | Use nested `Array.from`; Step 4 test #3 guards it explicitly. |
| `(w,h)` vs `(h,w)` transpose | Step 4 test #4 asserts a non-square case. |
| `next build` fails on test file's `vitest` import | Install vitest first (Step 1) so its types resolve tree-wide; verify build in Step 4/5. |
| Vitest picks up `.next`/node_modules or watch-hangs CI | `vitest run` (non-watch); default include globs match `*.test.ts` only; no config needed. |
| Lint flags test globals | Explicit `import { describe, it, expect } from "vitest"` — no undeclared globals. |
| Accidental scope creep into shape/RNG data | Types only; no shape tables or randomness (guarded in design/structure). |
