# Structure — T-002-02-04: gravity-and-lock-on-landing

The blueprint: file-level changes, public interfaces, module organization. Not code.

## Files

| File | Action | Purpose |
|---|---|---|
| `lib/gravity.ts` | **create** | `lockPiece` (merge) + `applyGravity` (one-step policy) + `GravityResult` types |
| `lib/gravity.test.ts` | **create** | Vitest suite: merge, fall, land-on-floor, land-on-stack, AC drive, no-mutation |
| `docs/active/work/T-002-02-04/*.md` | **create** | RDSPI artifacts |

No existing files are modified. `movement.ts` already exports `softDrop` and documents that
gravity will consume it; `collision.ts` already exports `pieceCells` for lock/merge. Nothing else
needs to change.

## `lib/gravity.ts`

### Imports
```ts
import type { Board, Piece } from "./types";
import { pieceCells } from "./collision";
import { softDrop } from "./movement";
```
No React/Next (respects the `lib/**` boundary). Doc header in house style: purpose, pure/
framework-free note, coordinate convention, and a scope boundary naming what is *not* here
(line-clear, respawn/bag, lock-delay, hard-drop).

### Public types
```ts
/** Piece fell one row; board is unchanged (same ref), piece still active. */
export interface Fell {
  locked: false;
  board: Board;
  piece: Piece;
}
/** Piece landed and locked; board is a fresh merged copy, active piece cleared. */
export interface Locked {
  locked: true;
  board: Board;
  piece: null;
}
/** Outcome of one gravity step: still falling (`Fell`) or landed (`Locked`). */
export type GravityResult = Fell | Locked;
```
`locked` is the discriminant; it narrows `piece` to `Piece` vs `null` with no assertions.

### Public functions

```ts
/**
 * Merge `piece`'s four resolved cells into a FRESH copy of `board`, colored by `piece.type`.
 * Pure: deep-copies rows (row.slice()) and never mutates the input board or piece. Does not
 * clear full lines (separate ticket).
 */
export function lockPiece(board: Board, piece: Piece): Board;

/**
 * Apply one gravity step. If the piece can fall, returns { locked:false, board (unchanged ref),
 * piece: <fallen> }. If the row below is blocked (floor or settled cells), locks the piece:
 * returns { locked:true, board: lockPiece(...), piece: null } — the "cleared for respawn" signal.
 */
export function applyGravity(board: Board, piece: Piece): GravityResult;
```

### Internal organization / algorithm

- `lockPiece`:
  1. `const next = board.map((row) => row.slice());` — copy-on-write (rows are independent per
     `emptyBoard`'s guarantee), so the input board is untouched.
  2. `for (const { x, y } of pieceCells(piece.type, piece.position, piece.rotation)) next[y][x] = piece.type;`
  3. `return next;`
  Assumes the piece is in-bounds (an active, legally-placed piece always is; `applyGravity` only
  locks a piece that already sits on the board). No bounds re-check — consistent with the other
  pure ops trusting well-typed placement.

- `applyGravity`:
  1. `const dropped = softDrop(board, piece);`
  2. `if (dropped !== piece) return { locked: false, board, piece: dropped };` — no-op reference
     idiom: a *different* object means the drop was legal.
  3. `return { locked: true, board: lockPiece(board, piece), piece: null };`

  Reuses `softDrop`'s single definition of "can fall," so floor-landing and stack-landing are
  handled identically with no duplicated collision logic.

## `lib/gravity.test.ts`

Mirrors `movement.test.ts` / `collision.test.ts` conventions:
`import { describe, it, expect } from "vitest"`, plus the shared `keyOf`/`asSet` and `settle`
helpers (copied verbatim, as the other suites do). Imports `emptyBoard`, `spawnPiece`,
`pieceCells`, `cellsFor`.

Planned describe blocks:
- **`lockPiece`** — stamps exactly the 4 derived cells with `piece.type`; leaves all other cells
  `null`; returns a fresh board (input unchanged); does not alias/mutate input rows.
- **`applyGravity` — falling** — on an empty board a piece descends one row per call; `locked`
  false; `board` is the same reference; `piece` is a fresh fallen piece.
- **`applyGravity` — landing on the floor** — drive a piece down to the floor; the terminal step
  returns `locked: true`, `piece: null`, and a board whose 4 landed cells are non-null == type.
- **`applyGravity` — landing on the stack** — with settled cells one row below, a step locks even
  though the floor is further down (landing semantics come from `softDrop`/`collides`, not just
  the floor).
- **AC drive** — the literal acceptance test: spawn/place a piece, gravity-step until landed,
  assert (a) the board gained exactly the piece's 4 cells and (b) the active piece is `null`.
- **no-mutation guards** — `JSON.stringify` snapshots of board+piece before/after both a falling
  step and a locking step (the locking step must leave the *input* board unchanged, mutating only
  the returned copy).

## Ordering of changes

1. `lib/gravity.ts` (types → `lockPiece` → `applyGravity`).
2. `lib/gravity.test.ts`.
3. `npm test` + `npm run lint` green.
4. Commit `feat(T-002-02-04)`.
5. `progress.md`, then `review.md`.

## Interfaces unchanged elsewhere

`types.ts`, `board.ts`, `tetrominoes.ts`, `collision.ts`, `movement.ts`, `constants.ts`, `bag.ts`,
`rng.ts` — untouched. `components/`, `app/`, config, `package.json` — untouched. Ticket/story/epic
frontmatter left for Lisa.
