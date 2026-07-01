# Research — T-002-02-03: SRS rotation with wall kicks

## Ticket in one line

Rotate the active piece CW/CCW using the Super Rotation System (SRS) kick tables so that
rotations near walls/floor/stack succeed by testing a small ordered set of positional offsets,
and a fully-blocked rotation is rejected (no-op).

## The `lib/` substrate this builds on

The pure game core lives in `lib/` (framework-free, enforced by the `lib/**` eslint boundary).
The pieces relevant to rotation are already in place:

- **`lib/types.ts`** — `Point {x,y}`, `TetrominoType` (`I|O|T|S|Z|J|L`), `RotationState`
  (`0|1|2|3` = spawn, R, 180, L), `Board = Cell[][]` (row-major, `board[y][x]`), and
  `Piece { type, rotation, position }`. A piece's occupied cells are *derived*, never stored.
- **`lib/tetrominoes.ts`** — `TETROMINO_CELLS[type][rotation]`: the four cell offsets per piece
  per orientation, within an `N×N` bounding box (`BOUNDING_BOX`: I=4, O=2, others=3).
  `cellsFor(type, rotation)` is the accessor. Crucially, the doc + the test oracle guarantee that
  **each successive state is the previous one rotated 90° CW within the box** — exactly the
  assumption SRS kick tables are calibrated against.
- **`lib/collision.ts`** — `pieceCells(type, pos, rot)` resolves absolute cells (`position + offset`,
  fresh array), and `collides(board, type, pos, rot)` returns true iff any resolved cell is out of
  bounds (past a wall, below floor, `y<0` above top) or overlaps a settled (non-null) cell.
  Dimensions are read from the board argument, not from `COLS`/`ROWS`.
- **`lib/movement.ts`** — `spawnPiece`, `tryMove`, `moveLeft/Right`, `softDrop`. This is the
  **policy layer** rotation must mirror: propose a candidate placement, gate it through
  `collides`, and on success return a *fresh* `Piece`; on failure return the **input `Piece`
  reference unchanged** (the "no-op contract" — callers detect "did not move" via `next === prev`).
  Its own scope comment names this ticket: *"Rotation (with SRS wall kicks) is T-002-02-03."*
- **`lib/constants.ts`** — `COLS=10`, `ROWS=20`. Not needed directly; collision reads board dims.

## Coordinate convention (the single most important constraint)

The whole engine is **y-down**: `x` grows right, `y` grows down, origin top-left, `board[y][x]`.
The test oracle in `tetrominoes.test.ts` rotates CW via `(x,y) → (n-1-y, x)` in this y-down frame,
and confirms state 0→1→2→3 is that CW rotation.

**Published SRS kick tables are written in a y-UP frame** (the classic Tetris Guideline / Tetris
Wiki tables). Therefore every kick offset's **y component must be negated** to be used here. This
is the primary correctness risk of the ticket. Getting the sign wrong will still pass simple
"rotate in open space" tests (all zero-offset test 1 passes) but will fail every real wall/floor/
T-spin kick — hence the AC's insistence on canonical cases.

## What SRS wall kicks are

Rotating a piece by swapping its offset table (`cellsFor(type, newRot)`) may put cells out of
bounds or into the stack. SRS defines, per **rotation transition** (from-state → to-state), an
ordered list of **5 candidate translations** ("tests"). The engine tries the rotated shape at
`position + test[i]` in order; the first that does not collide wins. If all 5 fail, the rotation
is rejected. Test 1 is always `(0,0)` — the naive in-place rotation.

Two distinct tables exist because the piece geometry differs:

- **JLSTZ** (3×3 box): one shared table across J, L, S, T, Z.
- **I** (4×4 box): its own table (larger horizontal offsets, ±2).
- **O** (2×2): rotation-invariant; SRS gives it only the `(0,0)` test. Its four states are
  identical cells (see `TETROMINO_CELLS.O`), so a rotate only flips the `rotation` field.

The tables are indexed by the *pair* (from,to), and there are 8 transitions used in practice:
`0↔1, 1↔2, 2↔3, 3↔0` in both directions (CW advances `+1 mod 4`, CCW advances `+3 mod 4`).

### The canonical offsets (y-UP, as published — MUST be negated for this codebase)

JLSTZ:
```
0>>1: (0,0)(-1,0)(-1,+1)(0,-2)(-1,-2)      1>>0: (0,0)(+1,0)(+1,-1)(0,+2)(+1,+2)
1>>2: (0,0)(+1,0)(+1,-1)(0,+2)(+1,+2)      2>>1: (0,0)(-1,0)(-1,+1)(0,-2)(-1,-2)
2>>3: (0,0)(+1,0)(+1,+1)(0,-2)(+1,-2)      3>>2: (0,0)(-1,0)(-1,-1)(0,+2)(-1,+2)
3>>0: (0,0)(-1,0)(-1,-1)(0,+2)(-1,+2)      0>>3: (0,0)(+1,0)(+1,+1)(0,-2)(+1,-2)
```
I:
```
0>>1: (0,0)(-2,0)(+1,0)(-2,-1)(+1,+2)      1>>0: (0,0)(+2,0)(-1,0)(+2,+1)(-1,-2)
1>>2: (0,0)(-1,0)(+2,0)(-1,+2)(+2,-1)      2>>1: (0,0)(+1,0)(-2,0)(+1,-2)(-2,+1)
2>>3: (0,0)(+2,0)(-1,0)(+2,+1)(-1,-2)      3>>2: (0,0)(-2,0)(+1,0)(-2,-1)(+1,+2)
3>>0: (0,0)(+1,0)(-2,0)(+1,-2)(-2,+1)      0>>3: (0,0)(-1,0)(+2,0)(-1,+2)(+2,-1)
```

## Shape-table compatibility check

The kick tables are only valid if the stored spawn orientations and CW rotation match SRS.
Spot-checked against `TETROMINO_CELLS`:
- I state 0 = `(0,1)(1,1)(2,1)(3,1)` (2nd row of 4×4), state 1 = 3rd column — standard SRS I. ✓
- T state 0 = `(1,0)(0,1)(1,1)(2,1)` — standard SRS T (top tab). ✓
- The `tetrominoes.test.ts` oracle already proves the full CW chain, so all seven are SRS-correct.

Conclusion: the published tables apply directly, needing only the y-sign flip.

## Testing patterns in the repo

- `vitest` (`npm run test` → `vitest run`). Tests are co-located `*.test.ts`.
- Common helpers repeated per file: `keyOf`/`asSet` for order-independent cell-set comparison,
  and a `settle(board, cells, type)` fixture stamper. Table-driven `it.each(CASES)` is the norm
  (see `collision.test.ts`). `emptyBoard(width, height)` builds fixtures.
- Non-mutation is explicitly asserted (JSON snapshot before/after) — a repo-wide expectation.
- TypeScript is `strict`; `npm run lint` runs with `--max-warnings 0`.

## Constraints & assumptions carried into Design

1. **Mirror the movement policy**: fresh `Piece` on success, same reference on no-op.
2. **Pure & non-mutating**: never touch `board`, `piece`, or the shared shape tables.
3. **y-down**: negate published y offsets.
4. **Gate through `collides`** (do not re-implement bounds/overlap logic).
5. Scope is rotation only — no gravity, lock, or T-spin *scoring* (later tickets). "T-spin corner
   kicks" in the AC refers to the kick *geometry* that lets a T rotate into a slot (test 5), not
   to T-spin detection/scoring.
6. O rotation is a state-only flip with a single `(0,0)` test.
