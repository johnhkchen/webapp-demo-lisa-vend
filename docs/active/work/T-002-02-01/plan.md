# Plan — T-002-02-01: collision-detection

Ordered, independently verifiable steps. Testing strategy and the concrete case table. Sized so
implementation is a single atomic commit (impl + tests are the AC — they land together).

## Testing strategy

- **Unit, pure, Vitest** — co-located `lib/collision.test.ts`, run by `npm test` (`vitest run`).
- **Table-driven** (AC requirement): one `CASES` array feeding `it.each`, each row a fully
  specified `(board, type, pos, rot) → expected` scenario, so adding coverage = adding a row.
- **Independent fixtures** — build boards with `emptyBoard(w, h)` and stamp settled cells
  directly (`board[y][x] = type`), the `board.test.ts` idiom. No dependence on `COLS`/`ROWS` so
  small boards keep cases legible.
- **Helper `pieceCells` pinned separately** — set-based comparison of absolute cells + a
  no-mutation assertion, so the predicate and the resolver each have their own safety net.
- **Verification criteria:** all suites green, `npm run lint` clean (`--max-warnings 0`), and
  every AC clause has ≥1 passing row (true for OOB, true for overlap, false for legal).

## Steps

### Step 1 — `lib/collision.ts`
Write the module doc header (purity, row-major convention, derived-cells relationship, the
`piece = TetrominoType` and above-top-is-OOB decisions). Implement:
- `pieceCells(type, pos, rot)` → `cellsFor(type, rot).map(o => ({ x: pos.x+o.x, y: pos.y+o.y }))`.
- `collides(board, type, pos, rot)` → derive `height`/`width` from the board; `pieceCells(...)
  .some(c => outOfBounds || board[c.y][c.x] !== null)` with the bounds test **before** the
  index. Return that boolean.

*Verify:* `npx tsc --noEmit` (via `npm run lint`/build typecheck) — compiles, no `any`.

### Step 2 — `lib/collision.test.ts`
Add imports, the `settle`/set helpers, the `pieceCells` describe block, and the `collides`
`CASES` table (below). Drive with `it.each`.

*Verify:* `npm test` — all suites pass, new cases included.

### Step 3 — lint + full suite
`npm run lint` and `npm test`. Fix anything. Confirm existing `board`/`tetrominoes` suites still
green (no regression — we only added files).

*Verify:* both commands exit 0.

### Step 4 — commit
One commit: `feat(T-002-02-01): add collision detection (bounds + overlap) with table-driven vitest`.
Record in `progress.md`. Then write `review.md`.

## The `collides` case table (concrete)

Boards below use a compact fixture; `W`/`H` chosen per case for legibility. `type`/`rot` pick
shapes whose offsets make the clip obvious.

| # | name | fixture | type | pos | rot | expected |
|---|------|---------|------|-----|-----|----------|
| 1 | legal placement, empty board | `emptyBoard(10,20)` | `T` | `{x:4,y:0}` | 0 | `false` |
| 2 | legal, flush against left wall | `emptyBoard(10,20)` | `O` | `{x:0,y:0}` | 0 | `false` |
| 3 | legal, flush against right wall | `emptyBoard(10,20)` | `O` | `{x:8,y:0}` | 0 | `false` |
| 4 | legal, resting on floor | `emptyBoard(10,20)` | `O` | `{x:0,y:18}` | 0 | `false` |
| 5 | off left wall (x<0) | `emptyBoard(10,20)` | `O` | `{x:-1,y:0}` | 0 | `true` |
| 6 | off right wall (x≥width) | `emptyBoard(10,20)` | `O` | `{x:9,y:0}` | 0 | `true` |
| 7 | below floor (y≥height) | `emptyBoard(10,20)` | `O` | `{x:0,y:19}` | 0 | `true` |
| 8 | above the top (y<0) | `emptyBoard(10,20)` | `O` | `{x:0,y:-1}` | 0 | `true` |
| 9 | overlaps a settled cell | settle `(1,1)`=`I` | `O` | `{x:0,y:0}` | 0 | `true` |
| 10 | adjacent to settled, no overlap | settle `(2,0)`=`I` | `O` | `{x:0,y:0}` | 0 | `false` |
| 11 | rotation changes clip: I vertical off right | `emptyBoard(10,20)` | `I` | `{x:7,y:0}` | 1 | `true` |
| 12 | same I, horizontal, legal | `emptyBoard(10,20)` | `I` | `{x:3,y:0}` | 0 | `false` |
| 13 | small board, exact fit | `emptyBoard(2,2)` | `O` | `{x:0,y:0}` | 0 | `false` |
| 14 | small board, one past floor | `emptyBoard(2,2)` | `O` | `{x:0,y:1}` | 0 | `true` |
| 15 | per-type: I flush on floor | `emptyBoard(10,20)` | `I` | `{x:0,y:18}` | 0 | `false` (I row-1 offset → cells at y=19) |
| 16 | per-type: L legal mid-board | `emptyBoard(10,20)` | `L` | `{x:3,y:5}` | 0 | `false` |

Notes on tricky rows:
- **#6** `O` at `x:9`: O occupies columns `x` and `x+1` = 9,10; 10 ≥ width(10) → out. #3 `x:8`
  gives 8,9 — legal. Pins the right-wall arithmetic.
- **#7 vs #4** `O` at `y:18` occupies rows 18,19 (legal, floor=19); at `y:19` occupies 19,20 →
  20 ≥ height(20) → out. Pins the floor arithmetic and the inclusive-top/exclusive-bottom bound.
- **#11/#12** exercise that `rot` really feeds `cellsFor`: I in state 1 is a vertical bar in
  column `x+2`; at `x:7` that column is 9 (legal) but the bar spans rows 0..3 — wait, that is in
  bounds. Adjust during impl: choose a `pos`/`rot` where the vertical I actually clips a wall
  (e.g. `rot:1` column offset 2 → at `x:8` gives column 10 → out). The row's *intent* is fixed
  (rotation changes which side clips); exact coords finalized against the real offset table.
- **#15** relies on I's spawn offsets sitting on row 1 of its 4×4 box, so `pos.y:18` → cells at
  y=19 (floor), legal. Confirms per-type offset handling, not just O.

If any row's expected value disagrees with the actual `TETROMINO_CELLS` offsets during
implementation, the **offset table is authoritative** — the row's coordinates get corrected to
preserve the row's *stated intent* (legal vs the specific OOB/overlap mode), and the correction
is noted in `progress.md`.

## Risks / mitigations

- **Miscomputed expected values** (esp. I's row-1 spawn offset, O's 2-wide span) → cross-check
  each row against `TETROMINO_CELLS` while writing; the helper test + set comparison catches
  resolution errors early.
- **Off-by-one at the exclusive bottom/right bound** → rows #3/#6 and #4/#7 bracket each boundary
  from both sides (last-legal vs first-illegal).
- **Silent regression in sibling suites** → Step 3 runs the full suite, not just the new file.
