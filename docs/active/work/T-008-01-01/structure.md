# T-008-01-01 — Structure: candidate-placement-seam

## Files

| File | Change | Purpose |
|------|--------|---------|
| `lib/bot-placements.ts` | **create** | The pure enumerate+settle seam. |
| `lib/bot-placements.test.ts` | **create** | Unit tests for the AC and purity invariants. |

No existing files are modified or deleted. No new dependencies. The new module lives under the
`lib/**` boundary (no React/Next imports) alongside its siblings.

## `lib/bot-placements.ts` — public interface

```ts
import type { Board, Piece, Point, RotationState, TetrominoType } from "./types";
import { collides, pieceCells } from "./collision";
import { hardDrop } from "./movement";
import { lockPiece } from "./gravity";
import { cellsFor } from "./tetrominoes";

/** One candidate: how the piece was dropped, where it landed, and the resulting settled board. */
export interface PlacementCandidate {
  rotation: RotationState;
  column: number;
  piece: Piece;
  cells: Point[];
  board: Board;
}

/** Enumerate every legal (rotation, column) hard-drop of `type` onto `board`, deduped by landed
 *  cells. Pure: never mutates `board` or the shape tables; returns fresh Points/boards. */
export function enumeratePlacements(
  board: Board,
  type: TetrominoType,
): PlacementCandidate[];
```

### Internal organization (single file, top-to-bottom)

1. Module docstring — same voice as `ghost.ts`/`gravity.ts`: pure/framework-free; composes
   `collides` + `hardDrop` + `lockPiece` + `pieceCells`/`cellsFor` and adds no new geometry;
   states the two boundaries (spawn-column reachability only; lock only, no `clearLines`; no bag).
2. `PlacementCandidate` interface (documented fields).
3. A small local helper `cellKey(cells: Point[]): string` — canonical sorted signature for dedup.
4. `enumeratePlacements` — the two nested loops from Design, guarded by `collides` at spawn and
   the `seen` set.

### Imports / reuse map

- `cellsFor` → per-rotation offset min/max to derive the anchor range.
- `collides` → skip buried-spawn columns (the reachability filter).
- `hardDrop` → resolve the landing (single source of drop truth, shared with the ghost).
- `pieceCells` → landing's absolute cells (fresh Points; feeds `cells` and the dedup key).
- `lockPiece` → the fresh settled board (copy-on-write, no line clear).

No import from `game.ts`, `bag.ts`, `line-clear.ts`, or anything React.

## `lib/bot-placements.test.ts` — planned cases

Fixtures: `emptyBoard(COLS, ROWS)`; construct settled cells directly by assigning `board[y][x]`.

1. **AC core — each result matches a hardDrop at its rotation/column.** For a constructed
   board + a chosen piece type, assert for *every* candidate that
   `candidate.cells` `toEqual` `pieceCells(hardDrop(board, {type, rotation, position:{x:column,y:0}}))`
   and that `candidate.board` `toEqual` `lockPiece(board, hardDrop(...))`. Reconstruct from
   `(rotation, column)` — no hard-coded coordinates.
2. **AC purity — no input mutation.** Snapshot board (`map(r=>r.slice())`); run; assert `toEqual`.
   (No bag is an input, so bag-immutability is structural — noted in a comment.)
3. **Settled board carries the piece's 4 cells (lock, not clear).** For each candidate, the four
   `cells` are non-null and equal to `piece.type` on `candidate.board`; count of that-type cells
   consistent (guards against an accidental `clearLines`).
4. **Distinct-orientation dedup.** `enumeratePlacements(empty, "O")` yields exactly `COLS`
   candidates (1 orientation × columns), and `"I"` yields the horizontal + vertical counts
   expected on an empty board (2 distinct orientations; horizontal rot0/rot2 collapse).
5. **Reachability filter.** On a board whose top rows are filled in some columns, no candidate
   spawns where `collides` at `y=0`; a fully-topped-out column contributes nothing.
6. **Fresh Points don't alias.** Mutate a returned `cells[0].x`; a fresh call is unaffected.
7. **Well-formed output.** Every `candidate.board` has `ROWS`×`COLS` dims; result is non-empty on
   an empty board.

## Ordering of changes

Source then test (test imports the source symbols). Both land in one commit — the seam is a
single cohesive unit and the test is its executable spec.
