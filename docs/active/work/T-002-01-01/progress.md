# Progress — T-002-01-01: board-model-and-core-types

Execution log against `plan.md`. Deviations and their rationale are recorded inline.

## Status: implementation complete, all gates green

## Steps executed

- [x] **Step 1 — Vitest runner.** `npm install -D vitest` → `vitest@^4.1.9` in
  `devDependencies`; added `"test": "vitest run"` to `package.json` scripts. No prod dep.
- [x] **Step 2 — `lib/types.ts`.** Created `Point`, `TetrominoType`, `RotationState`, `Cell`,
  `Board`, `Piece` with doc comments. Pure types, zero runtime, no imports.
- [x] **Step 3 — `lib/board.ts`.** Created `emptyBoard(width, height)` using nested
  `Array.from` (fresh row per iteration, `null` cells); imports types via `import type`.
- [x] **Step 4 — `lib/board.test.ts`.** Four `it` blocks under `describe("emptyBoard")`:
  dimensions, all-null emptiness, non-aliasing, `(w,h)` arg order. Explicit `vitest` imports.
- [x] **Step 5 — Green sweep.** `npm run test`, `npm run lint`, `npm run build` all pass;
  grep confirms no react/react-dom/next import under `lib/`.

## Verification results

| Gate | Command | Result |
|---|---|---|
| Unit tests | `npm run test` | **4 passed** (1 file), 154ms |
| Lint (zero-warning + purity) | `npm run lint` | exit 0, no output |
| Production build (whole-tree tsc) | `npm run build` | exit 0; `/` + `/_not-found` static |
| No framework import in `lib/` | `grep -rE "from ['\"](react\|react-dom\|next)" lib/` | none found |

## Deviation from plan

- **Plan Step 1 was a standalone runner commit; folded into the single substrate commit
  instead.** Reason: `vitest run` exits code 1 with "No test files found", so a runner-only
  commit would leave the `test` gate *red* at that revision. Committing the runner setup
  (`package.json` + lockfile) together with `lib/types.ts` + `lib/board.ts` +
  `lib/board.test.ts` keeps **every committed state green**. The plan explicitly permitted
  this fold ("may fold into Step 4"). Net: **one code commit** instead of two.

## Commit

- `feat(T-002-01-01): add board model, core types, and emptyBoard with vitest`
  — files: `package.json`, `package-lock.json`, `lib/types.ts`, `lib/board.ts`,
  `lib/board.test.ts`. Scoped to this ticket; no frontmatter, no sibling files.
- Work artifacts under `docs/active/work/T-002-01-01/` committed alongside.

## Nothing outstanding

All acceptance-criteria clauses met (types exported, `emptyBoard` correct, unit test asserts
dimensions + emptiness, no React/Next import). See `review.md` for the handoff.
