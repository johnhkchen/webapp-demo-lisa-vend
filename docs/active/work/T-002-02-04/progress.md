# Progress — T-002-02-04: gravity-and-lock-on-landing

## Status: complete

All plan steps executed. Tests + lint green. No deviations from the plan.

## Steps

- [x] **Step 1 — `lib/gravity.ts`** — created in house style. Exports `Fell` / `Locked` /
  `GravityResult` (discriminated on `locked`), `lockPiece(board, piece): Board` (copy-on-write
  merge of the 4 resolved cells), and `applyGravity(board, piece): GravityResult` (one step via
  `softDrop`; lock on the no-op reference). Imports only `./types`, `./collision`, `./movement` —
  no React/Next.
- [x] **Step 2 — `lib/gravity.test.ts`** — Vitest suite mirroring `movement.test.ts` helpers
  (`keyOf`/`asSet`/`settle`, plus a local `filled` cell counter). Blocks: `lockPiece` (4-cell
  stamp, merge over settled cells, fresh-board/no-mutation), `applyGravity` falling (one row/step,
  board ref unchanged), `applyGravity` landing (floor, stack, no-mutation-on-lock), and the AC
  drive.
- [x] **Step 3 — lint** — `npm run lint` clean (`eslint --max-warnings 0`). No boundary violation.
- [x] **Step 4 — commit** — `feat(T-002-02-04): ...` (module + tests + artifacts).
- [x] **Step 5 — progress.md / review.md**.

## Verification

```
npm test      → Test Files 7 passed (7) · Tests 76 passed (76)
npm run lint  → clean
```

Baseline before this ticket: 6 files / 67 tests. After: +1 file (`gravity.test.ts`), +9 tests, no
regressions in the board/tetromino/collision/movement/bag/rng suites.

## Deviations

None. The design's reuse of `softDrop`'s no-op-reference contract worked exactly as the movement
ticket anticipated — landing detection needed no new collision logic. The one addition beyond the
plan's explicit list is a small `filled(board)` test helper (counts non-null cells) to assert
"exactly 4 cells gained" precisely; it lives only in the test file.

## Acceptance criterion

> A test drops a piece to the floor and asserts a gravity step at the bottom locks it — the board
> gains the piece's 4 cells and the active piece is cleared for respawn.

Covered by `applyGravity — acceptance drive`: steps gravity from spawn to the floor, then asserts
`locked === true`, `piece === null` (cleared for respawn), the board's non-null count is exactly 4,
those 4 cells equal the piece's type, and the piece's lowest cell rests on the last row. ✓
