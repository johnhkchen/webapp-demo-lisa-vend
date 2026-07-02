# T-008-01-01 — Research: candidate-placement-seam

## Ticket in one line

Expose a pure `lib/` helper that enumerates every legal (rotation, column) placement of the
active piece, hard-drops each, and returns the settled board per candidate — so the bot
(S-008-01) can evaluate options without advancing the bag/score or mutating state.

## Where this sits

Per the E-008 decomposition ([[e-008-decomposition]]), the game core already exposes a
driveable API (`step`, the `Input` alphabet, `createInitialState`). The *only* missing core
seam for the bot is a pure "enumerate + settle" evaluator input. This ticket is that seam.
The heuristic (T-008-01-02) scores boards; the planner (T-008-01-03) will call *this* to get
candidate boards and *that* to rank them. So this module's output shape is the planner's input
contract — worth getting right.

## The relevant `lib/` modules (all pure, framework-free)

The `lib/**` eslint boundary forbids React/Next imports here. Every existing op is
copy-on-write and never mutates its inputs or the shared shape tables. The seam must match.

### `lib/types.ts`
- `Point { x, y }` — grid coord, `x` col, `y` row.
- `TetrominoType` = `"I"|"O"|"T"|"S"|"Z"|"J"|"L"`.
- `RotationState` = `0|1|2|3` (SRS spawn/R/180/L).
- `Cell` = `TetrominoType | null` (stored board square).
- `Board` = `Cell[][]`, row-major `board[y][x]`, outer=rows, inner=cols.
- `Piece { type, rotation, position }` — occupied cells are *derived*, never stored.

### `lib/tetrominoes.ts`
- `TETROMINO_TYPES` — the 7 ids in canonical order.
- `BOUNDING_BOX[type]` — box side (I=4, O=2, rest=3).
- `TETROMINO_CELLS[type][rotation]` — 4 offset `Point`s per orientation; state N+1 is N
  rotated 90° CW; **O is rotation-invariant** (all 4 states identical 2×2).
- `cellsFor(type, rotation)` — accessor, returns the `readonly Point[]` offsets.

### `lib/collision.ts`
- `pieceCells(type, pos, rot)` → absolute cells = `pos + cellsFor(...)`, **fresh Points**
  (no aliasing the shape tables). Cell order not part of the contract.
- `collides(board, type, pos, rot)` → `true` iff any occupied cell is OOB (wall/floor/above
  top `y<0`) or overlaps a settled (non-null) cell. Reads dims from the board arg, not
  `COLS`/`ROWS`. Bounds test precedes the index, so it never throws on well-typed input.

### `lib/movement.ts`
- `spawnPiece(type, width)` → piece at rotation 0, `y=0`, centered via `BOUNDING_BOX`.
- `hardDrop(board, piece)` → translate straight down until the cell below is blocked; returns
  the piece resting at the lowest legal position. **Pure placement only — does NOT lock/merge.**
  Already-resting piece returns the **input reference unchanged** (no-op contract). Bounded by
  board height.
- `softDrop`/`tryMove` — the one-row primitives `hardDrop` folds over.

### `lib/gravity.ts`
- `lockPiece(board, piece)` → **fresh** board copy with the piece's 4 cells merged in, colored
  by `piece.type`. Copy-on-write (`board.map(row => row.slice())`). Assumes the piece is legally
  in-bounds. **Does NOT clear lines** (deliberate boundary).
- `applyGravity` — one gravity step; not needed here (we drop-to-rest, not step).

### `lib/line-clear.ts`
- `clearLines(board)` → `{ cleared, board }`; removes full rows, collapses survivors down.
  **Not applied by this seam** (see the occupied-cells invariant in Design).

### `lib/ghost.ts` — the closest sibling / template
- `ghostPiece(board, piece)` = `hardDrop(board, piece)`; `ghostCells` = `pieceCells` of the
  landing. It is a pure "view-prep" step that composes `hardDrop` + `pieceCells` and adds **no**
  new shape/collision math, so "the ghost can never disagree with an actual drop." This seam is
  the same idea generalized: enumerate spawns, `hardDrop` each, `lockPiece` each. **Reuse, not
  reimplementation** is the house style.

### `lib/game.ts` — the consumer's world (context only)
- `GameState` holds settled `board` + separate `active` piece + a **live** seeded 7-bag whose
  `next()` mutates closure state. `step(state, input)` advances the bag when it spawns — that
  is the one intentional side effect. **This seam must not touch a bag**: it takes `(board,
  pieceType)`, never a `GameState` or `SevenBag`, so bag advancement is structurally impossible.

## Test conventions (from `ghost.test.ts`, `overlay.test.ts`)

- `vitest`; `import { describe, expect, it } from "vitest"`.
- Fixtures: `emptyBoard(COLS, ROWS)`; a named piece const near the top.
- Mutation guard pattern: snapshot via `board.map(r => r.slice())` and
  `JSON.parse(JSON.stringify(piece))`, run the op, assert `toEqual` the snapshot.
- Aliasing guard: mutate a returned Point, call again, assert the fresh call is unaffected.
- Invariant-by-reuse: assert the op equals a composition of the primitives (e.g. ghost cells
  `toEqual` `pieceCells(hardDrop(...))`) rather than hard-coding coordinates.
- Files live beside source: `lib/bot-placements.test.ts`.

## Constraints & assumptions surfaced

1. **"Reachable" = spawn-and-drop, not full pathfinding.** The AC ties each result to "a
   hardDrop of that piece at that rotation/column", i.e. the piece dropped straight down from
   the top at a given rotation+anchor column. True kick/tuck/spin reachability (sliding under
   overhangs) is out of scope and not implied by the AC. A column is *reachable* iff the piece
   does not `collide` at spawn (`y=0`) — i.e. the stack does not already reach the top there.
2. **Settled board = lock only, NO line clear.** The AC requires each result's occupied cells to
   match `pieceCells` of the hard-dropped piece. `clearLines` would remove any completed row,
   breaking that invariant. So the seam returns `lockPiece` output; applying `clearLines` is the
   evaluator's call (Design records this).
3. **Distinct placements.** O has 1 distinct orientation, I/S/Z have 2, T/J/L have 4. Iterating
   all 4 rotation states then deduping by the *landed absolute cells* collapses redundant
   orientations exactly (e.g. horizontal-I rot0 and rot2 land on identical floor cells) — a
   clean canonicalization with no per-type special-casing.
4. **Anchor column range.** Offsets are box-local (all `>= 0`), so valid anchors can be negative
   (e.g. I rot1 offsets are all `x=2`, so anchor `-2` puts cells at `x=0`). Range must be derived
   from the rotation's offset min/max, not hard-coded `0..width-1`.
5. **Purity.** No mutation of the input board or shape tables; fresh Points/boards out.
   Board dims read from the arg (like `collides`), so odd-sized boards work.
