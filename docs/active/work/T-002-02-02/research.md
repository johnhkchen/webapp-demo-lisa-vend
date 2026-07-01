# Research — T-002-02-02: spawn-and-horizontal-soft-move

Descriptive map of the codebase as it bears on this ticket. What exists, where, how it
connects. No solutions here — those are for `design.md`.

## Ticket in one line

Spawn the next bag piece at the top of the field, then move it left / right / soft-drop, with
every move gated by collision. Acceptance: a test drives spawn → left/right/down and asserts
position updates on legal moves and is a no-op when a move would collide.

_Advances: P1, E-002:move-spawn._

## Dependencies (both landed)

- **T-002-02-01 — collision-detection** (`phase: done`, commit `c037339`). Delivered
  `lib/collision.ts`: `collides(board, type, pos, rot): boolean` — the gate this ticket calls
  before committing any move — and `pieceCells(type, pos, rot): Point[]`.
- **T-002-01-03 — seeded 7-bag** (`lib/bag.ts`). Delivered `createSevenBag(seed): SevenBag`
  with `next(): TetrominoType`. This is the *source* of the piece id we spawn. Note: the bag
  yields ids only — "turning an id into a spawned `Piece` (position, rotation) is a later
  ticket" (bag.ts header). **That later ticket is this one.**

## The substrate: `lib/` modules relevant here

### `lib/types.ts`
- `Point { x, y }` — grid coord, `x` column (0=left), `y` row (0=top).
- `TetrominoType` — `"I"|"O"|"T"|"S"|"Z"|"J"|"L"`.
- `RotationState` — `0|1|2|3` (SRS spawn/R/180/L).
- `Cell = TetrominoType | null`; `Board = Cell[][]`, row-major, `board[y][x]`.
- `Piece { type, rotation, position }` — the active falling piece. **Occupied cells are
  *derived*, never stored** (normalized state). This is exactly the object this ticket
  produces (spawn) and transforms (moves).

### `lib/tetrominoes.ts`
- `TETROMINO_TYPES: readonly TetrominoType[]` — canonical order `[I,O,T,S,Z,J,L]`.
- `BOUNDING_BOX: Record<TetrominoType, number>` — box side length: `I:4, O:2, rest:3`.
  Directly usable to center a spawn horizontally.
- `TETROMINO_CELLS[type][rotation]` and `cellsFor(type, rotation): readonly Point[]` — the
  four offsets within the bounding box. Header explicitly scopes out "spawn board-column /
  initial position" as a *later ticket* — again, this one.
- Offset convention: `x` right, `y` down, origin top-left; box coords. Rotation-0 tables:
  I occupies row `y=1` (cells `(0..3,1)`); O occupies `(0..1, 0..1)`; T/S/Z/J/L span
  `x∈0..2`, `y∈0..2` but with the top row partly filled.

### `lib/collision.ts`
- `collides(board, type, pos, rot)` — true iff any derived cell is out of bounds (`x<0`,
  `x>=width`, `y<0`, `y>=height`) or overlaps a non-null cell. **Dimensions read from the
  board argument**, not from `COLS`/`ROWS`, so odd-sized fixtures behave. Never mutates,
  never throws on well-typed input (bounds test short-circuits before the index).
- `pieceCells(type, pos, rot): Point[]` — absolute cells, fresh `Point`s.
- Boundary note in the header: `y < 0` counts as out of bounds; "whether spawn tolerates a
  buffer above the visible field is a spawn-policy decision for a later ticket." **Relevant:**
  spawn here must place all cells at `y >= 0` (no hidden buffer rows in this pure model).

### `lib/board.ts`
- `emptyBoard(width, height): Board` — `(w, h)` arg order, row-major, independent rows. The
  fixture builder every test uses.

### `lib/constants.ts`
- `COLS = 10`, `ROWS = 20`. The default playfield size. Movement/spawn should not *hardcode*
  these internally (collision reads dims from the board) but the default field is 10×20.

## Established conventions (to match)

- **Purity**: `lib/**` is framework-free (eslint boundary). Types via `import type`.
- **Named exports only**; house doc-comment header on every module explaining role + scope
  boundary + coordinate convention + what is deliberately *out* of scope.
- **No mutation of shared data**; return fresh objects. `collides`/`pieceCells` never mutate
  the board or shape tables; `emptyBoard` allocates independent rows.
- **Dimensions from data, not constants** — `collides` reads `board.length`/`board[0].length`.
- **Testing**: Vitest, `describe`/`it`, table-driven `it.each(CASES)` with a `Case` interface
  and `$name`/`$expected` interpolation (see `collision.test.ts`). Set helpers `keyOf`/`asSet`
  compare cell lists order-independently. A `settle(board, cells, type)` fixture stamps cells.
  `npm test` (`vitest run`), `npm run lint` (`--max-warnings 0`) must pass.

## Scope boundaries with siblings (avoid overlap)

- **T-002-02-03 (rotation + wall kicks)** — owns `rotation` changes and SRS kick tables. This
  ticket does **not** rotate; it only translates (`dx`/`dy`) at a fixed rotation.
- **T-002-02-04 (gravity + lock)** — owns automatic gravity ticks and *locking* (merging cells
  into the board on landing). Soft-drop here is a *player-initiated single downward move*; it
  does **not** lock. Distinction matters: soft-drop returns the unchanged piece when the cell
  below is blocked; it does not merge/settle.

## What does not yet exist

- No `lib/movement.ts` (or spawn/move module) — this ticket creates it.
- No wiring from `SevenBag.next()` to a spawned `Piece` anywhere. No game-state/reducer module
  yet (that is a later epic); this ticket stays pure and stateless.
- No caller of `collides` yet — this is the first consumer.

## Constraints / assumptions surfaced

1. **Spawn y must keep all cells `y >= 0`** — no buffer rows above the field in this model, or
   `collides` would flag a legal spawn as out of bounds. Anchor `y = 0` satisfies every piece.
2. **Spawn x should center the piece** (classic Tetris). `BOUNDING_BOX` gives a clean, generic
   centering rule; the board width is the only external input needed.
3. **No-op semantics**: a blocked move must leave position "unchanged." The natural contract is
   to return the piece as-is (reference-equal) so callers can cheaply detect a no-op.
4. **Statelessness**: moves are pure `(board, piece) → piece`. No bag/queue coupling — the bag
   is the *source* of the id passed to spawn; movement never touches the bag.
5. **Game-over on blocked spawn** is out of scope (spawn-policy, later). Spawn constructs the
   piece; it does not decide top-out.
