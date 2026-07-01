# Research — T-002-02-04: gravity-and-lock-on-landing

Descriptive map of the codebase as it bears on "apply one gravity step and, when the piece can
fall no further, lock it by merging its cells into the settled board." No solutions proposed here.

## Ticket in one line

Advance the active piece down by one row per gravity tick; when the downward step is blocked,
*lock* the piece — stamp its four cells into the settled board and clear the active piece so a new
one can spawn. Depends on T-002-02-01 (collision), which is complete.

## The `lib/` substrate (all pure, framework-free)

The engine is a stack of pure modules under `lib/`, each with a house-style doc header, named
exports, and a co-located `*.test.ts` Vitest suite. No React/Next imports (enforced by the
`lib/**` eslint boundary described in CLAUDE.md). Relevant layers, bottom-up:

- **`types.ts`** — the data substrate. `Point {x,y}`, `TetrominoType`, `RotationState (0..3)`,
  `Cell = TetrominoType | null`, `Board = Cell[][]` (row-major, `board[y][x]`, top-left origin),
  and `Piece { type, rotation, position: Point }`. A piece's occupied cells are *derived*, never
  stored.
- **`constants.ts`** — `COLS = 10`, `ROWS = 20`. Board ops read dimensions from the board
  argument, not these constants, so odd-sized fixtures work.
- **`board.ts`** — `emptyBoard(width, height): Board`. Row-major grid, each row a *freshly
  allocated* array (no row aliasing), every cell `null`. Argument order `(w, h)`.
- **`tetrominoes.ts`** — shape data. `TETROMINO_TYPES`, `BOUNDING_BOX` (I=4, O=2, rest=3),
  `TETROMINO_CELLS[type][rotation]` (four `Point` offsets within the bounding box), and
  `cellsFor(type, rotation): readonly Point[]`. Offsets share the `board[y][x]` axes, so a
  resolved piece stamps on with no axis flip. The `readonly` view guards the shared arrays.
- **`collision.ts`** — the geometric gate.
  - `pieceCells(type, pos, rot): Point[]` — the absolute board cells a piece would occupy,
    `pos + offset`. Returns *fresh* `Point`s (no aliasing of `TETROMINO_CELLS`). Explicitly
    documented as "available to the renderer and **lock/merge in later tickets**" — i.e. this is
    the resolver this ticket's merge step is expected to use.
  - `collides(board, type, pos, rot): boolean` — true iff any occupied cell is out of bounds
    (`x<0 | x>=width | y<0 | y>=height`) or overlaps a non-null settled cell. Bounds test runs
    *before* the array index, so it never throws on an out-of-range pos. Reads dimensions from the
    board. Never mutates.
- **`movement.ts`** — the policy layer over `collides`. Key facts for this ticket:
  - `spawnPiece(type, width): Piece` — rotation 0, `y=0`, centered via `BOUNDING_BOX`.
  - `tryMove(board, piece, dx, dy): Piece` — proposes a shifted placement; if it `collides`,
    returns the **input `piece` reference unchanged** (the no-op contract); else a fresh
    `{ ...piece, position }`. Never mutates board or piece.
  - `softDrop(board, piece): Piece` — `tryMove(board, piece, 0, 1)`. A *player-initiated* one-row
    descent that **explicitly does NOT lock/merge** — its doc header names T-002-02-04 as the
    owner of landing/lock. Its module header states the no-op reference contract exists precisely
    "so gravity (02-04) [can] detect 'landed' via `softDrop(...) === piece`."

So the predecessor ticket deliberately left a seam: `softDrop` already computes "can the piece
fall one row?" and signals "no" by returning the same reference. This ticket owns what happens on
that "no": the merge/lock.

## Conventions every `lib/` module follows (constraints on this work)

1. **Purity / immutability.** No function mutates its `board` or `piece` argument. New state is a
   fresh object/array. `emptyBoard` and `pieceCells` are careful about row/point aliasing;
   `collision.test.ts` and `movement.test.ts` both assert no-mutation via `JSON.stringify`
   snapshots. A merge that writes into the settled board must therefore return a *new* board, not
   mutate the input — there is no in-place board writer anywhere in `lib/` today.
2. **No-op = same reference.** The established idiom for "nothing changed" is returning the input
   reference (`next === prev`), tested with `toBe`. This ticket's landing detection can lean on it.
3. **Derived cells.** Occupied squares are always resolved through `cellsFor` / `pieceCells`,
   never hand-listed in production code (tests do stamp literal cells via a `settle` helper).
4. **Dimensions from the board argument**, not `COLS`/`ROWS`.
5. **Doc-header house style.** Each module opens with a multi-paragraph comment: purpose, the
   pure/framework-free note, the coordinate convention, and an explicit scope boundary naming
   sibling/later tickets. New modules are expected to match.

## Test conventions (what a suite here looks like)

Co-located `lib/xxx.test.ts`, `import { describe, it, expect } from "vitest"`. Shared helpers
recur verbatim across suites: `keyOf`/`asSet` (compare cell lists as unordered `Set`s) and
`settle(board, cells, type)` (stamp literal settled cells into a fixture, mutating + returning
it). Table-driven cases via `it.each` where the space is enumerable (`collision.test.ts`,
`spawnPiece`); focused `it`s for scenario drives (the movement AC). No-mutation guards compare
`JSON.stringify` before/after. `npm test` runs `vitest run`; `npm run lint` is
`eslint --max-warnings 0`. Current baseline: 6 test files, 67 tests, all passing.

## The acceptance criterion, decomposed

> A test drops a piece to the floor and asserts a gravity step at the bottom locks it — the board
> gains the piece's 4 cells and the active piece is cleared for respawn.

Three observable post-conditions after the terminal gravity step:
1. **Fall then land.** Repeated gravity steps move the piece down until the row below is blocked
   (floor or settled cells).
2. **Board gains 4 cells.** The four resolved cells (`pieceCells(type, pos, rot)`) become non-null
   in the resulting board, colored by `piece.type`.
3. **Active piece cleared.** After lock, there is no active piece (a `null`/absent piece) — the
   signal a caller uses to respawn.

Implicit: a *non-terminal* gravity step (piece can still fall) must move the piece down and leave
the board untouched and the piece still active. The AC only pins the landing, but the "one gravity
step" language means the ordinary (still-falling) branch also exists.

## Boundaries / assumptions surfaced

- **No game-state reducer yet.** Nothing above `lib/` consumes these functions; there is no
  central `GameState`. This ticket produces a pure step function; wiring gravity to
  `requestAnimationFrame` and respawn-from-bag is a later concern (movement's review already
  frames this as feeding "the forthcoming game-state reducer").
- **No line-clear here.** Merging cells is this ticket; detecting/clearing full rows after a lock
  is a separate ticket (not in S-002-02's list). Lock must not clear lines.
- **No hard-drop, no rotation, no lock-delay.** Gravity is a single one-row step; lock fires
  immediately when the step is blocked (no lock-delay timer — that is a feel/timing concern, not
  pure logic).
- **"Cleared for respawn"** means the step function reports *no active piece*; it does not itself
  pull the next id from `bag.ts` (the module never touches the bag — cf. movement's boundary note).
- **`softDrop` is the natural down-step primitive** and already exists; re-deriving a bespoke
  "can fall" check would duplicate it. Whether to reuse it or the lower-level `collides` is a
  design question, not settled here.
