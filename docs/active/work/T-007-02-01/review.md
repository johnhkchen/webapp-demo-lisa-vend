# Review — T-007-02-01 ghost-projection-core

## Summary

Added a pure ghost-projection core to `lib/`, mirroring `overlay.ts`. The ghost (the
translucent "where will it land" marker) is computed by delegating to the existing hard-drop
path, so rendering never re-derives shape or collision math and the ghost can never disagree
with an actual drop. Commit `f7bd75d`.

## Files changed

### Created

- **`lib/ghost.ts`** (~50 lines) — two pure, framework-free functions:
  - `ghostPiece(board, piece): Piece` = `hardDrop(board, piece)` — the resting placement.
  - `ghostCells(board, piece): Point[]` = `pieceCells` of that landing — the resting cells.
  - Both delegate; no shape/collision math is reimplemented. Copy-on-write and the
    already-resting no-op-reference contract are inherited from `hardDrop`/`pieceCells`.
- **`lib/ghost.test.ts`** (~95 lines) — 8 vitest cases (see coverage below).

### Modified / deleted

None. `game.ts`, `overlay.ts`, `movement.ts`, the components, and all config are untouched —
the render threading is the sibling ticket T-007-02-02, whose DAG edge stays clean.

## Acceptance criteria

> A new lib/ghost.ts returns the resting cells for any active piece; unit tests assert the
> ghost coincides with hardDrop's landing row and never overlaps settled cells.

- ✅ `lib/ghost.ts` created; `ghostCells` returns the resting cells for any active piece.
- ✅ **Coincides with hardDrop's landing** — `ghostPiece` *is* `hardDrop`, asserted directly
  (`toEqual(hardDrop(...))`), so equality holds by construction, not coincidence.
- ✅ **Never overlaps settled cells** — asserted against a board with a filled floor: all four
  returned cells are `null`-on-board, and the piece rests one row above the stack.
- ✅ Ghost test suite green (8/8).

## Test coverage

| Concern | Test |
|---|---|
| AC invariant 1: coincides with hardDrop | `ghostPiece` › coincides exactly with hardDrop's landing |
| Empty-board floor landing | `ghostPiece` › lands on the floor of an empty board |
| Landing atop a stack (no overlap) | `ghostPiece` › lands on top of a settled stack |
| Already-resting no-op reference | `ghostPiece` › returns the input reference … |
| Non-mutation of board + piece | `ghostPiece` › does not mutate … |
| AC invariant 2: never overlaps settled | `ghostCells` › returns four cells, none overlapping |
| Reuse (no hard-coded coords) | `ghostCells` › equals pieceCells of the ghost landing |
| Fresh Points / no aliasing | `ghostCells` › returns fresh Points … |

- Full suite: **177 passed / 19 files** — no regression.
- Lint clean (`--max-warnings 0`); vinext production build green.
- Positional assertions cross-check against `hardDrop`/`pieceCells` rather than hard-coding
  coordinates, so they survive shape/spawn-column changes (matches `overlay.test.ts` style).

## Open concerns / limitations

- **None blocking.** The module is a thin, fully-tested delegation.
- **Renderer's responsibility, not this ticket's:** when the active piece is already resting,
  the ghost coincides exactly with it. `ghostPiece` faithfully returns that landing (returning
  the input reference, per the no-op contract). Suppressing a redundant ghost draw — and
  styling the translucent variant — is explicitly T-007-02-02's scope; the pure core stays
  correct and total either way. A test documents this reference-return behavior so a future
  change to `hardDrop`'s contract would surface here.
- **Coupling by design:** ghost is deliberately welded to `hardDrop`. If `hardDrop`'s landing
  semantics ever change, the ghost follows automatically and the coincidence test flags any
  contract break — the intended coupling, not a fragility.

## Handoff to T-007-02-02

The render ticket should import `ghostCells` (to mark the translucent landing cells) and, if
it needs the tetromino identity/rotation for coloring, `ghostPiece`. No further `lib/` change
is anticipated for the render.
