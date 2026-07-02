# T-008-01-01 — Review: candidate-placement-seam

## What changed

| File | Change | Notes |
|------|--------|-------|
| `lib/bot-placements.ts` | **created** (~110 lines) | Pure seam: `PlacementCandidate` + `enumeratePlacements(board, type)`. |
| `lib/bot-placements.test.ts` | **created** (~130 lines) | 9 unit tests, 5 describe blocks. |
| `docs/active/work/T-008-01-01/*` | **created** | research / design / structure / plan / progress / review. |

No existing source modified or deleted; no new dependencies. Single commit `23b4903`.

## What it does

`enumeratePlacements(board, type)` returns one `PlacementCandidate` per legal, distinct hard-drop
of `type` onto `board`. For each rotation `0..3` and each horizontally-legal anchor column, it
spawns the piece at the top, skips columns where the spawn already `collides` (unreachable —
stack reaches the top), `hardDrop`s it, and emits `{ rotation, column, piece, cells, board }`
where `board` is `lockPiece`'d (merged, **not** line-cleared). Results are deduplicated by the
landed piece's absolute cells, so redundant orientations collapse geometrically.

Design decisions (full rationale in `design.md`): built entirely from existing primitives
(`collides`/`hardDrop`/`lockPiece`/`pieceCells`/`cellsFor`) so a candidate can never disagree
with an actual drop; `(board, type)` signature keeps it structurally bag-free (no `GameState`);
lock-not-clear altitude preserves the "cells match a hardDrop" invariant and defers line-clear
credit to the evaluator.

## Acceptance criterion

> A new pure function returns one settled-board result per reachable rotation+column; a unit test
> asserts each result's occupied cells match a hardDrop of that piece at that rotation/column and
> that no input board/bag is mutated (suite green).

✅ Met. `lib/bot-placements.ts` `enumeratePlacements` is that function. The AC test
(`bot-placements.test.ts` → "acceptance") reconstructs the landing from each candidate's
`(rotation, column)` and asserts `c.piece`, `c.cells` (`toEqual` `pieceCells(hardDrop(...))`),
and `c.board` (`toEqual` `lockPiece(hardDrop(...))`) match — across T/L/S/I/O on a jagged board.
Input-board immutability is asserted via snapshot `toEqual`. No bag is an input, so bag
non-mutation is structural (noted in the test). Full suite green: **257 tests, 25 files**.

## Test coverage

- **AC / drop-agreement** — every candidate matches its `hardDrop`+`lockPiece` reconstruction.
- **Purity** — input board unmutated; fresh Points don't alias across calls.
- **Lock-only** — settled board has exactly 4 filled cells (guards against accidental
  `clearLines`), colored by piece type at the landing cells.
- **Dedup counts** — O → `COLS-1 = 9` (2-wide, 4 states collapse); I → `17` (10 vertical + 7
  horizontal, mirror rotations collapse). These pin the anchor-range bounds and the dedup.
- **Reachability** — no candidate spawns colliding at `y=0`; a fully-buried column yields nothing.
- **Shape** — every candidate board has `ROWS`×`COLS` dimensions.

Verification: `vitest run` (full suite green), `npm run lint` clean (`--max-warnings 0`),
`npm run build` succeeds (type-check passes).

### Gaps / not covered (intentional)
- Degenerate zero-width/zero-height boards: handled by `width = board[0]?.length ?? 0` (returns
  `[]`), but not unit-tested — outside the AC and not a real game state.
- Post-clear boards / cleared-line counts: deliberately out of scope (evaluator's concern).

## Open concerns / notes for the reviewer

1. **"Reachable" is spawn-column hard-drop, not full pathfinding.** Tucks, spins, and slides
   under overhangs are not enumerated. This matches the AC ("a hardDrop ... at that
   rotation/column") and is sufficient for a demo attract bot. The `rotation`/`column` fields
   leave room to swap in a BFS enumerator later without changing `PlacementCandidate`. Flagging
   so it is a conscious product choice, not an oversight.
2. **Lock-not-clear is a boundary the planner must know.** T-008-01-02 (heuristic) / T-008-01-03
   (planner) should apply `clearLines` themselves if they want line-clear credit in scoring. The
   docstring and design record this; worth confirming when those tickets are built.
3. **`column` semantics.** `column` is the box-local spawn anchor `x`, which can be negative
   (e.g. vertical I). It is the value to pass back into `spawnPiece`-style construction, not a
   "leftmost occupied cell." Documented on the interface field.

No known bugs or TODOs left in code.
