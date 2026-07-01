# Progress — T-002-02-02: spawn-and-horizontal-soft-move

## Completed

- **Step 1 — `lib/movement.ts`** ✓ (per `structure.md`, no deviations)
  - `spawnPiece(type, width)` — rotation 0, `y=0`, centered `x = floor((width - BOUNDING_BOX[type]) / 2)`.
  - `tryMove(board, piece, dx, dy)` — collide-then-commit; input ref on no-op, fresh piece on move.
  - `moveLeft` / `moveRight` / `softDrop` wrappers.
- **Step 2 — spawn suite** ✓ — per-type spawn columns (I→3, O→4, rest→3), in-bounds check via
  `pieceCells` + `collides`, narrow-board centering (O@width6→2).
- **Step 3 — movement + AC suite** ✓ — legal moves update + fresh object; blocked at
  left/right wall, floor, and settled cell → no-op returning the same reference; the AC drive
  (spawn → right/right/down/left legal, then blocked-right no-op); `tryMove` composition;
  no-mutation guards (legal + no-op); a shape-shift equivalence check.

## Verification

```
npm test      → Test Files 6 passed (6) · Tests 67 passed (67)   (was 5/42; +1 file, +25 tests)
npm run lint  → clean (--max-warnings 0)
```

No regression in pre-existing suites. Acceptance criterion exercised by the named AC test.

## Deviations from plan

None. Surface and behavior match `design.md`/`structure.md` exactly.

## Remaining

- Commit (Step 4), then Review artifact. Nothing else in scope.
