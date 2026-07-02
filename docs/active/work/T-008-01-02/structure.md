# T-008-01-02 — Structure: placement-heuristic

## Files

| File | Change | Approx |
|------|--------|--------|
| `lib/bot-heuristic.ts` | **create** | ~95 lines incl. docstrings |
| `lib/bot-heuristic.test.ts` | **create** | ~110 lines |
| `docs/active/work/T-008-01-02/*` | **create** | R/D/S/P/progress/review |

No existing source modified or deleted. No new dependencies. Sits beside `lib/bot-placements.ts`.

## `lib/bot-heuristic.ts` — public interface

```ts
import type { Board } from "./types";

/** The four scored board features (all ≥ 0; higher height/holes/bumpiness worse, lines better). */
export interface BoardFeatures {
  aggregateHeight: number;   // Σ column heights
  holes: number;             // empty cells under a column's top surface
  bumpiness: number;         // Σ |adjacent column height diffs|
  completedLines: number;    // full rows present (board is lock-only / pre-collapse)
}

/** GA-tuned reference weights for the 4-feature model. Higher score = more desirable board. */
export const WEIGHTS: { readonly [K in keyof BoardFeatures]: number };

/** Extract the four features from a settled (lock-only, pre-collapse) board. Pure; reads only. */
export function boardFeatures(board: Board): BoardFeatures;

/** Weighted sum of boardFeatures. Higher = better. Deterministic; input never mutated. */
export function evaluate(board: Board): number;
```

### Internal organization

- **Module docstring** — mirrors `bot-placements.ts` altitude notes: pure/framework-free; scores a
  **lock-only** board (matches the seam boundary); completed-lines = full rows counted in place
  (Decision 1); higher score = better; coordinate convention.
- `WEIGHTS` const — the four GA constants, `as const`, cited in a comment.
- `boardFeatures(board)`:
  - `const height = board.length; const width = board[0]?.length ?? 0;` — zero-width guard returns
    all-zero features (no throw), matching the seam's `?? 0` guard.
  - Per column `x` in `0..width-1`: scan `y` top→bottom; capture `top` = first `y` with a non-null
    cell; once `top` seen, count subsequent `null`s as holes. `columnHeight = top === -1 ? 0 :
    height - top`. Accumulate `aggregateHeight`, push height into a `heights[]` array for bumpiness.
  - Bumpiness: `Σ |heights[x] - heights[x+1]|` for `x in 0..width-2`.
  - Completed lines: `board.filter(row => row.every(cell => cell !== null)).length`.
    (Equivalently `!row.some(cell => cell === null)` — the inverse of `clearLines`'s survive test,
    kept semantically aligned.)
  - Return the `BoardFeatures` record.
- `evaluate(board)`: `const f = boardFeatures(board); return WEIGHTS.aggregateHeight*f.aggregateHeight
  + WEIGHTS.completedLines*f.completedLines + WEIGHTS.holes*f.holes + WEIGHTS.bumpiness*f.bumpiness;`

No shared mutable state; both functions allocate their own locals. Reads `board` only.

## `lib/bot-heuristic.test.ts` — structure

Import `vitest`, `evaluate`, `boardFeatures`, `WEIGHTS`, `emptyBoard`, `COLS`, `ROWS`, `Board`.
Small board-builder helpers in the file (following `jaggedBoard` precedent):

- `flatClearingBoard()` — a board with the bottom row completely full and nothing above it
  (hole-free, one completed line, minimal height). The "good" board.
- `holeyTowerBoard()` — a tall, jagged stack with buried holes and no completed line. The "bad"
  board.
- helpers to set specific cells for per-feature tests.

Describe blocks:

1. **`— acceptance`** (maps to the AC sentence):
   - `evaluate(holeyTowerBoard())` **strictly less than** `evaluate(flatClearingBoard())`.
   - **deterministic**: two calls on the same board return the identical number; and holey < flat
     holds on a freshly rebuilt pair (no shared state).
2. **`boardFeatures` — per feature**:
   - empty board → all four features `0`; `evaluate` → `0`.
   - aggregate height: a single column filled `k` from the floor → `aggregateHeight === k`.
   - holes: one filled cell over one gap in a column → `holes === 1`; height counts from the top
     cell (so `aggregateHeight` reflects the top, not the gap).
   - bumpiness: two adjacent columns of heights `a` and `b` (rest empty) → `bumpiness === |a-b|`.
   - completed lines: N full rows → `completedLines === N` (uses lock-only board, rows still
     present).
3. **`evaluate` — weighting & purity**:
   - sign sanity: adding a hole to a board lowers its score; completing a line raises it.
   - input immutability: snapshot board, `evaluate`, assert deep-equal (matches seam discipline).
   - `WEIGHTS` shape: has the four keys; lines positive, other three negative (documents signs).

## Ordering of changes (for Plan)

1. `bot-heuristic.ts` (types + `WEIGHTS` + `boardFeatures` + `evaluate`).
2. `bot-heuristic.test.ts`.
3. `vitest run` (full suite), `npm run lint`, `npm run build`.
4. Single commit. Then `progress.md`, `review.md`.

## Boundaries preserved

- Pure `lib/` module, no framework imports → passes the `lib/**` eslint boundary.
- Reads the board only → copy-on-write invariant trivially held; asserted in test.
- Consumes the **lock-only** contract from `bot-placements.ts` without importing it (decoupled: the
  heuristic scores *any* board, not just candidate boards) — the planner wires the two together.
