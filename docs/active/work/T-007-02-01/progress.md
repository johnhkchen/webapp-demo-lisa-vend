# Progress — T-007-02-01 ghost-projection-core

## Status: complete

All plan steps executed; committed atomically as `f7bd75d`.

## Completed

- **Step 1 — `lib/ghost.ts`** — created. Two delegating pure functions:
  - `ghostPiece(board, piece): Piece` → `hardDrop(board, piece)`.
  - `ghostCells(board, piece): Point[]` → `pieceCells` of the `ghostPiece` landing.
  - Module JSDoc header in `overlay.ts` style (purpose, reuse note, coordinate convention,
    scope boundary). No shape/collision math reimplemented.
- **Step 2 — `lib/ghost.test.ts`** — created. 8 tests, all green:
  - `ghostPiece`: coincides-with-hardDrop (AC invariant 1), lands-on-floor, lands-atop-stack
    (no overlap), already-resting no-op reference, non-mutation.
  - `ghostCells`: four cells none-overlapping-settled (AC invariant 2), equals-pieceCells-of-
    ghost (reuse check), fresh-Points (no aliasing).
- **Step 3 — verification** — all green:
  - `npx vitest run lib/ghost.test.ts` → 8 passed.
  - `npm test` → 19 files, **177 passed** (no regression in existing suites).
  - `npm run lint` → clean (`--max-warnings 0`).
  - `npm run build` → vinext production build complete.
  - Committed `f7bd75d`.

## Deviations from plan

None. Implemented exactly as designed.

## Notes

- Implementation matched the "trivial-logic" prediction (two one-liners); the substance is
  the invariant test suite, as planned.
- No files touched outside the two new ones — `game.ts`, components, and config are
  untouched, keeping the DAG edge to T-007-02-02 clean.
