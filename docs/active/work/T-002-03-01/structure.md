# Structure — T-002-03-01 line-clear-detection

## Files

| File | Action | Purpose |
|---|---|---|
| `lib/line-clear.ts` | **create** | `clearLines` + `LineClearResult`; the pure line-clear op |
| `lib/line-clear.test.ts` | **create** | Vitest coverage incl. the 1/2/4-row AC case |
| `lib/gravity.ts` | untouched | boundary already documents line-clear as separate |
| `lib/types.ts` | untouched | reuses `Board`, `Cell`; result type lives with its function |

No modifications to existing files. Pure additive change — the DAG dependency on
T-002-02-04 is a *read* dependency (understanding the lock seam), not a shared-file write,
so there is no lock contention with the gravity ticket.

## `lib/line-clear.ts` — module shape

Module header comment in the house style (purpose, purity note, coordinate convention,
scope boundary — mirroring `gravity.ts`/`collision.ts` headers). Then:

```ts
import type { Board, Cell } from "./types";

export interface LineClearResult {
  cleared: number;   // number of full rows removed (0..height)
  board: Board;      // fresh, compacted board; same dimensions as input
}

export function clearLines(board: Board): LineClearResult { ... }
```

### Public interface

- `clearLines(board: Board): LineClearResult`
  - **Input:** any board (typically a post-`lockPiece` merged board).
  - **Output:** `{ cleared, board }` — see below.
  - **Contract:**
    - `cleared` = count of rows where every cell is non-null.
    - returned `board` has surviving rows in original relative order, restacked to the
      bottom, with `cleared` freshly-allocated empty rows prepended at the top.
    - returned board dimensions equal input dimensions (height and width preserved).
    - input board is **not mutated**; returned board is a new outer array; empty rows are
      independently allocated (no aliasing).

- `interface LineClearResult { cleared: number; board: Board }` — exported for call sites
  (a later game-loop ticket) and tests.

### Internal organization

Single function, no private helpers needed. Implementation shape (from Design option A):

1. `kept = board.filter(row => row.some(cell => cell === null))` — survivors, in order.
2. `cleared = board.length - kept.length`.
3. `width = board[0].length` — derived from the board, so no `constants` import.
4. `empties` = `cleared` fresh rows of `width` nulls each (`Array.from`, per `board.ts`).
5. return `{ cleared, board: [...empties, ...kept] }`.

Note the survivor predicate is stated positively as "row still contains an empty cell"
(`some(... === null)`); a full row is its negation, so no separate `isFull` helper is
introduced (kept inline for readability, matching the terse `lib/` style). If a future
ticket needs `isRowFull` publicly it can be extracted then — YAGNI now.

## `lib/line-clear.test.ts` — test shape

Colocated Vitest. Reuse helpers in the spirit of `gravity.test.ts`:

- local `fullRow(width, type)` → an all-non-null row.
- local `filled(board)` → count of non-null cells (as in `gravity.test.ts`).
- build fixtures with `emptyBoard(COLS, ROWS)` then stamp specific rows full / partial.

Test groups:

1. **counts** — 0, 1, 2, and 4 full rows → asserts `cleared` is 0/1/2/4.
2. **collapse** — rows above a cleared row fall by the right amount; a distinctive marker
   cell (e.g. a single settled cell high up) lands at the expected `y` after collapse.
3. **non-adjacent** — two non-contiguous full rows with a partial survivor between them
   collapse correctly and preserve survivor order.
4. **dimensions preserved** — output height === input height, every row length === width.
5. **all-full** — a completely full board clears to an all-empty board of same size.
6. **purity** — input board deep-unchanged (JSON snapshot); prepended empty rows are
   distinct objects (mutating one does not affect another).

## Ordering of changes

1. Write `lib/line-clear.ts` (function + type).
2. Write `lib/line-clear.test.ts`.
3. `npm run test` (full suite) → green.
4. `npm run lint` → clean (0 warnings; `--max-warnings 0`).

Steps 1–2 can land in one commit (function + its tests), consistent with the repo's
`feat(T-...)` commits that pair implementation with vitest.
