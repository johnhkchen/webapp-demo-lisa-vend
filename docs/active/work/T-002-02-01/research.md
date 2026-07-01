# Research — T-002-02-01: collision-detection

Descriptive map of the codebase as it bears on collision detection. What exists, where it
lives, how it connects, and the constraints a `collides(...)` gate must respect. No solutions
proposed here — that is Design's job.

## Ticket in one line

Decide whether a piece at a given position/rotation collides with walls, floor, or settled
cells. This is the gate every move (left/right, soft/hard drop, rotate, spawn) will consult
before committing. _Advances: P1, E-002:collision._

**Acceptance criterion:** `collides(board, piece, pos, rot)` returns `true` for out-of-bounds
and overlap cases and `false` for legal placements, verified by a table-driven test.

## The data substrate (`lib/types.ts`)

The whole engine keys off a small set of pure, compiler-erased types (zero runtime output):

- `Point { x: number; y: number }` — grid coordinate. `x` = column (0 = leftmost), `y` = row
  (0 = topmost). Axes grow right and **down**.
- `TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L"` — the seven-piece alphabet.
- `RotationState = 0 | 1 | 2 | 3` — SRS spawn/R/180/L. Only enumerates valid orientations;
  the concrete offsets live in `tetrominoes.ts`.
- `Cell = TetrominoType | null` — one stored square: `null` = empty, else the settled piece id.
- `Board = Cell[][]` — **row-major**: outer array = rows (length = height), inner = columns
  (length = width). A square is addressed `board[y][x]`. This is the fact collision leans on
  hardest: bounds are `0 <= x < width` and `0 <= y < height`, occupancy is `board[y][x] != null`.
- `Piece { type, rotation, position }` — the active falling piece. Crucially, its occupied
  cells are **derived, not stored**: `position + cellsFor(type, rotation)`. Collision inherits
  this normalization — it must resolve absolute cells itself.

## Shape data (`lib/tetrominoes.ts`)

Supplies the offsets `types.ts` promises but does not store. Relevant exports:

- `TETROMINO_CELLS[type][rotation]` — the four occupied cell offsets (`readonly Point[]`) for a
  piece in a given SRS orientation. Offsets are **within the piece's bounding box**, same axes
  as the board (x right, y down, origin top-left), so "a resolved piece stamps onto the board
  with no axis flip." This is the key adjacency: `boardCell = piece.position + offset`.
- `cellsFor(type, rotation): readonly Point[]` — ergonomic accessor, `= TETROMINO_CELLS[type][rotation]`.
  This is the natural input to collision: resolve cells for the *candidate* rotation.
- `BOUNDING_BOX[type]` — box side length (I:4, O:2, rest:3). Not needed for point-wise collision
  (we test resolved cells directly), but relevant background for why offsets can range 0..3.
- `TETROMINO_TYPES` — canonical ordered alphabet; handy for enumerating pieces in tests.

Offset ranges observed in the table: `x, y ∈ 0..3` (I spans a 4×4 box; others 0..2). No
negative offsets — every offset is measured from the box's top-left. Collision therefore only
sees negative absolute coordinates when `position` itself is negative (e.g. a piece nudged past
the left wall or spawned partly above the top).

## Board dimensions (`lib/constants.ts`)

`COLS = 10`, `ROWS = 20`. Classic Tetris. Constructors take `(width, height)` = `(COLS, ROWS)`.
Collision must **not** hard-code these — it reads width/height from the board it is handed
(`board.length` = height, `board[0].length` = width) so odd-sized test boards work.

## Board construction (`lib/board.ts`)

`emptyBoard(width, height): Board` — row-major grid, every cell `null`, rows independently
allocated (no aliasing). Argument order `(width, height)` mirrors `COLS, ROWS`. Tests build
fixtures with this and then poke individual `board[y][x] = "I"` cells to simulate settled
stacks (see `board.test.ts`). Collision tests will do the same.

## Testing conventions (`lib/*.test.ts`)

- Vitest, `import { describe, it, expect } from "vitest"`. Run via `npm test` (`vitest run`).
- Co-located `*.test.ts` next to the module. Relative imports (`./board`, `./types`).
- Style leans **table-driven**: `tetrominoes.test.ts` enumerates all 28 states with an
  independent oracle (`rotateCW`) rather than restating the data; `board.test.ts` uses small
  explicit fixtures. Helpers like `keyOf`/`asSet` build set-based comparisons.
- The AC here explicitly asks for a **table-driven test** — the existing suite sets the pattern
  to follow: a case table of `(fixture, type, pos, rot) → expected boolean`.

## Boundaries and constraints

- **Purity.** Everything in `lib/` is framework-free (no React/Next), enforced by a `lib/**`
  eslint boundary (see the type-module header). Collision is pure logic — a fixture-and-assert
  natural fit. It must not import from `components/` or `app/`.
- **No mutation.** Collision is a *predicate*. It must read the board and piece data without
  writing to either. `TETROMINO_CELLS` is exposed `readonly` precisely to guard the shared
  arrays; collision only reads them.
- **Derived cells, again.** Because occupied cells are never stored, collision must resolve
  `pos + cellsFor(type, rot)` for the *candidate* pos/rot — the whole point is to test a
  hypothetical placement (a proposed move/rotation) *before* committing it to a `Piece`.
- **Signature nuance.** The AC writes `collides(board, piece, pos, rot)`. Only the piece's
  *type* determines its shape; `pos` and `rot` are supplied separately precisely so a
  hypothetical can be tested without mutating a `Piece`. Design must resolve what `piece` means
  here (the `TetrominoType`, or a full `Piece` whose own pos/rot are overridden) — passing both
  a `Piece` and a separate pos/rot invites ambiguity about which wins.

## What does NOT exist yet (scope edges)

- No movement, rotation, wall-kick, spawn, lock/merge, line-clear, or scoring code. Collision is
  the **first consumer** of the shape+board substrate and the gate those later features call.
- No wall-kick offset tables — SRS kicks are a separate later ticket. Collision only answers
  "does this exact placement fit"; the *kick search* that retries offsets lives above it.
- No existing `collision.ts` or partial implementation. This is a greenfield module in `lib/`.

## Dependency status

`depends_on: [T-002-01-02]` (tetromino shape data) — **present and complete** (`lib/tetrominoes.ts`,
committed `5a9fc0e`). `lib/types.ts`, `lib/board.ts`, `lib/constants.ts` all present. No blockers.
