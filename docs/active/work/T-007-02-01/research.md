# Research — T-007-02-01 ghost-projection-core

## Ticket in one line

Add a pure ghost-projection function in `lib/` (mirroring `overlay.ts`) that computes the
active piece's landing position via the existing hard-drop path, so rendering never
re-derives shape/collision math. Advances P4 (feel) and P5 (engineering rigor).

## Where this sits in the epic

- Epic **E-007** (feel-pack-and-line-clear-juice) — the player-polish layer. Story
  **S-007-02** (ghost-piece) has two tickets:
  - **T-007-02-01** (this one) — the *pure core*: a landing-projection function in `lib/`.
  - **T-007-02-02** (depends on this) — the *render*: thread the projection through the
    view into `Board`/`Cell` as a translucent marker that tracks move/rotate.
- The dependency edge means this ticket must NOT touch the React layer. Its whole surface
  is one new pure module (`lib/ghost.ts`) plus its test file. The renderer ticket consumes
  whatever this ticket exports.

## The existing `lib/` core (pure, framework-free)

`lib/` is a layered, pure engine. The `lib/**` eslint boundary forbids React/Next imports,
and every op is copy-on-write (input board/piece never mutated). Relevant layers, bottom-up:

- **`types.ts`** — `Point {x,y}`, `TetrominoType`, `RotationState (0|1|2|3)`,
  `Cell = TetrominoType | null`, `Board = Cell[][]` (row-major `board[y][x]`, x→right,
  y→down from top-left), and `Piece { type, rotation, position }`. The active piece stores
  only anchor + rotation; occupied cells are *derived*, never stored.
- **`tetrominoes.ts`** — shape tables + `cellsFor(type, rot)`, `BOUNDING_BOX`.
- **`collision.ts`** —
  - `pieceCells(type, pos, rot): Point[]` — the single accessor that resolves a placement's
    four absolute cells (`pos + offset`). Returns fresh Points; never aliases shared data.
  - `collides(board, type, pos, rot): boolean` — true iff any resolved cell is out of bounds
    (wall/floor/above-top) or overlaps a settled (non-null) cell. Dimensions read from the
    board argument, not `COLS`/`ROWS`. Bounds test precedes the array index, so it never
    throws on an out-of-range pos.
- **`movement.ts`** — the placement/policy layer over `collides`:
  - `tryMove(board, piece, dx, dy)` — returns a fresh shifted `Piece` if legal, else the
    **input `piece` reference unchanged** (the "no-op contract": callers detect "did not
    move" with `next === prev`).
  - `softDrop` = `tryMove(…, 0, 1)`.
  - **`hardDrop(board, piece): Piece`** — repeats `softDrop` until it no longer moves, then
    returns the piece resting at the lowest legal position. Pure *placement* only: does NOT
    lock/merge. An already-resting piece returns the **input reference unchanged**. Bounded
    by board height. This is the exact "existing hard-drop path" the ticket names.
- **`gravity.ts`** — `lockPiece` (copy-on-write merge) + `applyGravity` (one step or lock).
- **`game.ts`** — the reducer. `GameState { board, active, bag, score, lines, level,
  gameOver }`. The `"hardDrop"` input composes `hardDrop(board, active)` then the lock
  pipeline (`descend`). Confirms `hardDrop` is the canonical landing computation.

## The sibling to mirror — `overlay.ts`

`overlay.ts` is the reference pattern the ticket explicitly points at. Its shape:

- **One pure function**, `overlayPiece(board, piece): Board` — copies the board and paints
  the piece's cells (from `pieceCells`) with `piece.type`.
- **Reuse, not reimplementation**: its module header states occupied cells come *only* from
  `pieceCells` — "no shape math lives here." Ghost must follow the same discipline: reuse
  `hardDrop` for the landing and `pieceCells` for the resolved squares; derive nothing.
- **Totality**: skips out-of-bounds cells, never throws.
- **Copy-on-write**: fresh matrix, fresh rows; input untouched.
- Consumed by `components/useGame.ts` (`view = overlayPiece(state.board, state.active)`),
  and by `GameContainer.test.tsx`. The renderer ticket (T-007-02-02) will consume the ghost
  export the same way — as a pure step producing render-ready data.

## The test convention to match — `overlay.test.ts`

Vitest (`vitest run`; config `vitest.config.ts`). Tests colocate as `lib/<name>.test.ts`.
`overlay.test.ts` establishes the house style this ticket's suite should mirror:

- Import `emptyBoard` (`board.ts`), `COLS`/`ROWS` (`constants.ts`), `pieceCells`, and the
  types. Build boards with `emptyBoard(COLS, ROWS)` and set settled cells directly.
- Assertions cross-check against `pieceCells` (never hard-code coordinates), count filled
  cells, assert non-mutation (`toEqual` snapshot; `not.toBe` for fresh refs), and cover the
  out-of-bounds path.
- `T_PIECE = { type: "T", rotation: 0, position: { x: 3, y: 0 } }` is the canonical fixture.

## Key facts / constraints for the acceptance criteria

The AC requires: a function returning the resting cells for any active piece; tests assert
the ghost (a) **coincides with `hardDrop`'s landing row** and (b) **never overlaps settled
cells**.

- (a) falls out for free if the function *delegates to* `hardDrop` rather than recomputing —
  by construction the landing equals `hardDrop(board, piece)`.
- (b) is guaranteed because `hardDrop`'s final position is legal (`collides` false there), so
  none of its resolved cells sit on a settled cell — a directly testable invariant.
- Edge case: a piece already resting (on floor or stack) → `hardDrop` returns the input
  reference; the ghost coincides exactly with the active piece. The pure function should
  return that landing faithfully; how the renderer avoids double-drawing is T-007-02-02's
  concern, out of scope here.
- Empty column: piece drops to the floor; landing row is the bottom-most legal placement.

## Boundaries / assumptions

- Scope is `lib/ghost.ts` + `lib/ghost.test.ts` only. No React, no `game.ts` change, no
  `GameState` field. The renderer ticket does the threading.
- No new dependency on `COLS`/`ROWS` at runtime — dimensions come from the board argument,
  matching `collides`/`overlayPiece`.
- Must keep the `lib/**` purity boundary and copy-on-write / no-op-reference conventions.
- Open question for Design: expose the landing as a `Piece`, as a `Point[]` of resting
  cells, or both? The AC says "resting cells"; the renderer needs cells, but a `Piece` is
  the more composable primitive and cells derive from it via `pieceCells`. Resolved in
  `design.md`.
