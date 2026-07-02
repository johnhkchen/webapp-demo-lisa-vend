# T-008-01-02 — Research: placement-heuristic

## Ticket in one line

Add a pure `evaluate(board)` to `lib/bot-heuristic.ts` that scores a settled board from four
weighted features — aggregate height, holes, bumpiness, completed lines — deterministically, with
a green `bot-heuristic.test.ts`. _Advances P5, P2._

## Where this sits in the bot story (S-008-01)

The CPU/attract bot (E-008) is decomposed into a **pure-bot** track of three seams, chained:

1. **T-008-01-01 candidate-placement-seam** — `lib/bot-placements.ts` (DONE, commit `23b4903`).
   `enumeratePlacements(board, type)` returns one `PlacementCandidate` per legal hard-drop:
   `{ rotation, column, piece, cells, board }`, where `board` is `lockPiece`'d — **merged, not
   line-cleared**.
2. **T-008-01-02 placement-heuristic** — *this ticket*. The scoring function over one settled
   board. Consumes the `board` field a candidate carries.
3. **T-008-01-03 planner** (downstream) — picks the argmax candidate by calling this evaluator
   over `enumeratePlacements(...)`.

So this ticket is the pure evaluator that turns "here are the options" into "this one is best."
It does **not** enumerate placements, drive the bag, or pick a move — those are its neighbors.

## The seam it consumes (critical boundary)

`lib/bot-placements.ts` (read in full) and its review (`docs/active/work/T-008-01-01/review.md`)
establish one boundary this ticket must honor:

- **Candidate boards are lock-only, NOT line-cleared.** From the seam docstring: "*Settle = lock
  only, NOT line clear.* ... Applying `clearLines` (and any cleared-line credit) is the
  evaluator's call." The review repeats it (open concern #2): "T-008-01-02 (heuristic) ... should
  apply `clearLines` themselves if they want line-clear credit."
- **Consequence for us:** a candidate's `board` still contains any full rows the drop completed.
  Our "completed lines" feature is therefore *countable directly on the board we're handed* — a
  full row is still present as a row with no `null`. We must **count** full rows, and (for the
  height/holes/bumpiness features) reason about the board *as given* (pre-collapse). We do not need
  to call `clearLines` to get the count; we count full rows ourselves. Whether to evaluate
  pre- or post-collapse is a Design decision (see design.md), but the count itself is available.

## Coordinate + data conventions (from `types.ts`, `board.ts`, `line-clear.ts`)

- `Board = Cell[][]`, row-major `board[y][x]`. Outer array = rows (length = height = `ROWS`),
  inner = columns (length = width = `COLS`). `x` grows right, `y` grows **down** from top-left.
- `Cell = TetrominoType | null`. `null` = empty; a type string = filled (colored) cell.
- "Bottom of the well" = the END of the outer array (highest `y`). The top is `y = 0`.
- A row is **full** when it has no `null` (this is exactly `clearLines`'s survive/clear test:
  `row.some(cell => cell === null)` ⇒ survives; else it's a completed line).
- `COLS = 10`, `ROWS = 20` (`lib/constants.ts`). Tests build boards via `emptyBoard(COLS, ROWS)`
  (`lib/board.ts`), which allocates each row independently (no aliasing).

## The four features (standard 4-feature Tetris heuristic)

The AC names exactly the four features of the widely-used Dellacherie-lineage 4-feature model
(aggregate height, complete lines, holes, bumpiness). Definitions in this coordinate system:

- **Column height** (helper, not itself a feature): for column `x`, the distance from the floor to
  the topmost filled cell — `ROWS - y_top` where `y_top` is the smallest `y` with `board[y][x] !=
  null`; `0` if the column is entirely empty.
- **Aggregate height**: sum of all column heights. Higher = worse.
- **Holes**: count of empty cells that have at least one filled cell somewhere above them in the
  same column (i.e. below the column's top surface). Higher = worse.
- **Bumpiness**: sum of `|height[x] - height[x+1]|` over adjacent columns. Higher = worse.
- **Completed lines**: number of full rows on the board. Higher = better.

The customary weight vector (Yiyuan Lee's GA-tuned set, the de-facto reference for this 4-feature
model): height `-0.510066`, lines `+0.760666`, holes `-0.35663`, bumpiness `-0.184483`. Score is
their weighted sum; **higher score = more desirable board**. These exact constants are a Design
choice, but any sign-correct set satisfies the AC (holes/tall < flat/clearing).

## Existing `lib/` patterns to match

- **Purity + framework-free.** Every `lib/` module is pure, no React/Next (enforced by the
  `lib/**` eslint boundary). This module is pure arithmetic over a board — trivially compliant.
- **Copy-on-write / read-only inputs.** `board.ts`, `line-clear.ts`, `bot-placements.ts` never
  mutate inputs. `evaluate` only *reads* the board, so this is automatic, but the test should
  still assert input-board immutability (matches the seam's test discipline).
- **Rich module docstring** explaining altitude/boundaries (see `bot-placements.ts`,
  `line-clear.ts` headers). Expected here.
- **Named exports, `interface` for result records** (cf. `PlacementCandidate`, `LineClearResult`).
- **Test style** (`bot-placements.test.ts`): `vitest`, `describe`/`it`, small board-builder
  helpers (`jaggedBoard`), `emptyBoard(COLS, ROWS)`, feature-by-feature assertions plus an
  `— acceptance` describe block that maps directly to the AC sentence.

## Constraints / assumptions

- **Signature is `evaluate(board)`** per AC — a single settled board in, a `number` out. No
  `GameState`, no bag, no piece type. Structurally bag-free, like the seam.
- **Determinism**: pure arithmetic, no RNG/time/iteration-order dependence → deterministic by
  construction. The test asserts it (same board → same score; bad < good).
- **No new dependencies**; no existing source modified. New files only: `lib/bot-heuristic.ts`,
  `lib/bot-heuristic.test.ts`.
- **Empty / degenerate boards**: an all-empty board scores `0` on every feature → score `0`. A
  zero-width board (`board[0]?.length ?? 0 === 0`) should not throw; guard like the seam does.
- **Weights are internal but worth exporting** (a `const` record) so the downstream planner and
  tests can reference them rather than hard-coding magic numbers. Design will confirm.

## Open questions for Design

1. Evaluate the board **as given (lock-only)** or **post-`clearLines`** for the height/holes
   features? (Count of completed lines is available either way.) Trade-off: realism vs. simplicity
   and the seam's stated altitude.
2. Export just `evaluate`, or also a `features(board)` breakdown + a `WEIGHTS` constant? (Testing
   and planner ergonomics vs. surface area.)
3. Exact weight constants — reference GA set vs. simpler hand-picked integers. Only sign matters
   for the AC; the reference set matters for eventual bot quality (P5 "plays well").
