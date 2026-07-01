# Structure — T-002-02-01: collision-detection

The shape of the code. Files, exports, signatures, internal organization, ordering. Not the code
itself — the blueprint the Plan executes.

## Files

| File | Change | Purpose |
|---|---|---|
| `lib/collision.ts` | **create** | Pure collision predicate + absolute-cell helper. |
| `lib/collision.test.ts` | **create** | Table-driven Vitest suite for both exports. |
| `docs/active/work/T-002-02-01/*.md` | **create** | RDSPI artifacts (this set). |

Nothing else is touched. No edits to `types.ts`, `tetrominoes.ts`, `board.ts`, `constants.ts`,
`components/`, `app/`, `eslint.config.mjs`, `tsconfig.json`, or `package.json`. No new deps.

## `lib/collision.ts` — public interface

```ts
import type { Board, Point, TetrominoType, RotationState } from "./types";
import { cellsFor } from "./tetrominoes";

// Absolute board cells a piece would occupy at pos/rot (offsets + anchor). Pure; input readonly.
export function pieceCells(
  type: TetrominoType,
  pos: Point,
  rot: RotationState,
): Point[];

// True iff any occupied cell is out of bounds OR overlaps a settled (non-null) cell.
export function collides(
  board: Board,
  type: TetrominoType,
  pos: Point,
  rot: RotationState,
): boolean;
```

### Internal organization

1. **Module doc comment** — matches the house style (see `tetrominoes.ts`/`board.ts` headers):
   states purity/framework-free boundary, the row-major `board[y][x]` convention, the
   derived-cells relationship (`pos + cellsFor`), and that this is the gate later movement/
   rotation/spawn/drop code consults. Notes the `piece = TetrominoType` signature decision and
   the "above-the-top counts as out of bounds" boundary semantics (from Design D1, D4).

2. **`pieceCells(type, pos, rot)`** — resolve offsets to absolute coordinates:
   `cellsFor(type, rot).map((o) => ({ x: pos.x + o.x, y: pos.y + o.y }))`. Returns a fresh array
   of fresh `Point`s (no aliasing of the shared `TETROMINO_CELLS` arrays; does not mutate input).

3. **`collides(board, type, pos, rot)`** — derive `height = board.length` and
   `width = height > 0 ? board[0].length : 0`; for each cell of `pieceCells(...)`:
   - bounds check **first**: `x < 0 || x >= width || y < 0 || y >= height` → return `true`.
   - overlap check: `board[y][x] !== null` → return `true`.
   Short-circuit on the first offender. If all pass, return `false`. Implemented with
   `Array.prototype.some` (returns `true` on first offending cell) for a clean short-circuit.

No default exports (consistent with the named-export house style). No side effects, no `console`,
no mutation of arguments.

## `lib/collision.test.ts` — structure

```ts
import { describe, it, expect } from "vitest";
import { collides, pieceCells } from "./collision";
import { emptyBoard } from "./board";
import type { Board, Point, TetrominoType, RotationState } from "./types";
```

- **Fixture helpers** (module-local):
  - a small `settle(board, cells, type)` that stamps settled cells into a fixture, mirroring the
    `board[y][x] = "I"` pattern in `board.test.ts`.
  - a `keyOf`/set helper reused from the tetrominoes-test idiom for comparing `pieceCells` output
    as an unordered set (order is not part of the contract).

- **`describe("pieceCells")`** — a couple of focused cases:
  - resolves offsets against a non-zero anchor (e.g. `O` at `{x:4,y:0}` → the expected four
    absolute cells, compared as a set).
  - does not mutate the shared shape table (re-read `cellsFor` after calling, assert unchanged).

- **`describe("collides")`** — the **table-driven** core. A `CASES` array of
  `{ name: string; board: Board; type: TetrominoType; pos: Point; rot: RotationState; expected: boolean }`
  driven by a single `it.each(CASES)` (or a `for…of` loop of `it`s). Rows enumerated in the Plan.

## Ordering of changes

1. Create `lib/collision.ts` with both functions (types compile against existing `types.ts`).
2. Create `lib/collision.test.ts` with the fixture helpers, `pieceCells` cases, and the `CASES`
   table for `collides`.
3. Run `npm test` (all suites) and `npm run lint`; fix any issues.
4. Commit as one atomic unit (implementation + tests together — the tests are the AC).

No inter-file ordering hazard: `collision.ts` only *reads* from `tetrominoes.ts`/`types.ts`,
which already exist and are unchanged. Per CLAUDE.md concurrency notes, touching only new files
means no lock contention with sibling tickets.

## Interface contracts (pinned for callers)

- `collides` **never throws** on in-range-typed input: bounds are checked before indexing, so an
  out-of-range `pos` returns `true` rather than reading `undefined`.
- `collides` is **pure**: no mutation of `board`, no mutation of the shape tables, no I/O.
- Dimensions come from the **board argument**, not `COLS`/`ROWS` — odd-sized boards behave.
- `pieceCells` output ordering is unspecified (follows `cellsFor` order today); callers must not
  depend on order. Tests compare as sets.
