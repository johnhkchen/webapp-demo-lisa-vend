# Research — T-002-03-01 line-clear-detection

## Ticket in one line

Detect full rows, remove them, and collapse the rows above so the board shrinks
correctly after a lock. `clearLines(board)` returns the cleared-row **count** and a
**compacted** board.

_Advances: P1, E-002:line-clear. Depends on T-002-02-04 (gravity + lock-on-landing)._

## Where this sits in the `lib/` stack

The game core is a layered stack of pure, framework-free modules under `lib/`
(CLAUDE.md forbids React/Next imports here; a `lib/**` eslint boundary enforces it).
The relevant layers, bottom-up:

- `constants.ts` — `COLS = 10`, `ROWS = 20`.
- `types.ts` — the data substrate. Key types for this ticket:
  - `Cell = TetrominoType | null` — one square; `null` = empty, else the settled
    piece's id (kept so line-clear can test fullness *and* the renderer can color).
  - `Board = Cell[][]` — **row-major**, `board[y][x]`; outer array = rows (length =
    height), inner = columns (length = width). `y` grows down from a top-left origin.
- `board.ts` — `emptyBoard(width, height)`: `Array.from` per row so **rows are
  independent** (no aliasing). Argument order is `(width, height)`.
- `collision.ts` — `pieceCells`, `collides`. Not called by line-clear, but the source
  of the "derive cells, never mutate shared data" idiom.
- `movement.ts` — `spawnPiece`, `softDrop`, left/right. `softDrop` returns the **same
  reference** when blocked — the no-op-as-identity contract.
- `gravity.ts` — **the direct upstream** (T-002-02-04). `applyGravity` delegates the
  down-step to `softDrop`; when the piece can fall no further it calls `lockPiece`,
  which merges the piece's four cells into a **fresh copy** of the board and returns
  `{ locked: true, board, piece: null }`. **`lockPiece` explicitly does NOT clear
  lines** — its docstring names line-clear as "a separate ticket." That separate
  ticket is this one.

## The seam this ticket plugs into

`gravity.ts` header comment (lines 15–19) states the scope boundary precisely:

> Scope boundary: one gravity step + the merge, nothing more. Detecting and clearing
> full rows after a lock is a separate ticket — `lockPiece` does NOT clear lines.

So the integration contract is already designed: after a higher layer (a later game-loop
ticket) observes `locked: true` from `applyGravity`, it will pass the merged
`Locked.board` through `clearLines` to get the shrunk board and the cleared count (the
count later feeds scoring, a different story). This ticket delivers that function; it does
**not** wire it into `applyGravity` (that would blur the gravity boundary and couple two
tickets to the same file — a DAG edge the workflow warns against).

## Board mechanics relevant to compaction

- A row is **full** when every cell is non-null: `row.every(cell => cell !== null)`.
- "Collapse the rows above" = classic Tetris gravity-after-clear: removing a full row
  makes every row *above* it fall by one. With multiple cleared rows the surviving rows
  keep their relative order and stack to the bottom; the vacated top rows become empty.
- Because `Board` is row-major with `y` growing **down**, "the bottom" is the **end** of
  the outer array (`board[height - 1]`), and "collapse downward" means surviving rows
  settle toward higher indices. New empty rows are prepended at low indices (the top).
- Board width must be preserved: new empty rows need exactly `width` null cells, where
  `width = board[0].length` (derivable from the board itself — no need to import `COLS`).
- Height must be preserved: `clearedCount` rows removed ⇒ `clearedCount` empty rows added
  back, so the returned board has the same dimensions. This is what "the board shrinks
  correctly" means operationally — the *stack* shrinks, the *grid* keeps its shape.

## Purity / immutability constraints (house style)

Every `lib/` op is copy-on-write and never mutates its input:
- `emptyBoard` allocates fresh independent rows.
- `lockPiece` does `board.map(row => row.slice())`.
- `pieceCells` returns fresh `Point`s so callers never alias shared shape data.

`clearLines` must follow suit: return a **fresh** board, leave the input untouched. A
subtle aliasing trap to avoid — surviving rows can be carried by reference (they are not
mutated downstream in the pure layer), but the **new empty rows must each be freshly
allocated** (the `Array(h).fill(Array(w))` shared-row trap that `emptyBoard`'s docstring
and `board.test.ts` "does not alias rows" both guard against).

## Testing conventions observed

- Vitest, colocated `lib/<name>.test.ts`, `describe`/`it`/`expect`. Run via
  `npm run test` (`vitest run`).
- `gravity.test.ts` establishes reusable helpers: `settle(board, cells, type)` to stamp
  settled cells, `filled(board)` to count non-null cells, set-based cell comparison.
  A line-clear test will want a "fill an entire row" helper (`settle` a full row) and to
  assert on both the returned count and the post-collapse cell positions.
- The acceptance criterion dictates the headline test: pre-fill **1 / 2 / 4** full rows
  and assert (a) the right cleared count and (b) correct downward collapse. Four rows is
  the "Tetris" (max simultaneous clear) case.

## Open questions / assumptions (resolved in Design)

1. **Return shape.** AC says "returns the cleared-row count and a compacted board" —
   two values. Options: tuple `[count, board]`, or an object `{ cleared, board }`.
   `gravity.ts` favors named result objects (`GravityResult`); leaning that way.
2. **File name.** No existing `line-clear.ts`. Candidates: `line-clear.ts`,
   `lineClear.ts`, `clear.ts`. Existing files are lowercase single words
   (`gravity.ts`, `collision.ts`) or lowercase (`board.ts`). Design will pick.
3. **Non-adjacent full rows.** Collapse must handle full rows that are *not* contiguous
   (e.g. rows 17 and 19 full, 18 not). The "keep survivors in order, restack to bottom"
   formulation handles this for free — worth an explicit test.
4. **Zero full rows.** Must return `count: 0` and an equivalent board (fresh copy, input
   untouched). No-op correctness is a test case.
