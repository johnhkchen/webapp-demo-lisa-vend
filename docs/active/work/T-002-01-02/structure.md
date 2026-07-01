# Structure — T-002-01-02: tetromino-set-and-rotation-states

The blueprint: file-level changes, module boundaries, public interfaces, internal
organization, and change ordering. Not code — the shape of the code. Grounded in `design.md`.

## Files

| File | Action | Purpose |
|---|---|---|
| `lib/tetrominoes.ts` | **create** | Pure shape data + accessors for the 7 pieces × 4 SRS states |
| `lib/tetrominoes.test.ts` | **create** | Vitest suite enumerating all 28 states |
| everything else | **untouched** | `types.ts` already exports all needed types; no config change |

No modifications, no deletions. Two new colocated files under `lib/`, mirroring
`board.ts` / `board.test.ts`.

## `lib/tetrominoes.ts` — internal organization

Top-to-bottom:

1. **Module doc comment.** Purpose, purity note (framework-free, `lib/**` boundary), the
   coordinate convention (`x` right, `y` down, offsets within a per-piece bounding box), and
   the sibling-boundary note (this is shape data; kicks/colors/bag live elsewhere).

2. **Imports.** `import type { Point, TetrominoType, RotationState } from "./types";` — type-only
   (no runtime coupling), relative path per precedent.

3. **`TETROMINO_TYPES`** — `readonly TetrominoType[]` = `["I","O","T","S","Z","J","L"]`, `as const`.
   The canonical iteration order. Commented as "type alphabet as data — bag sequencing is
   T-002-01-03".

4. **`BOUNDING_BOX`** — `Readonly<Record<TetrominoType, number>>`: `I:4, O:2,
   T/S/Z/J/L:3`. The `N×N` box each piece's offsets live in and rotate within.

5. **`TETROMINO_CELLS`** — the core table:
   `Readonly<Record<TetrominoType, readonly (readonly Point[])[]>>`. Outer key = piece id;
   inner array indexed by `RotationState` 0..3; each element = 4 `{x,y}` offsets. Authored as
   explicit literal data, one clearly-commented block per piece, each state on its own line so
   the four rotations read as a visual sequence. Declared `as const` (or via a typed helper)
   so the literals are immutable and the type stays narrow.

6. **`cellsFor(type, rotation)`** — accessor returning `TETROMINO_CELLS[type][rotation]`
   (`readonly Point[]`). The one obvious entry point for "give me this piece's current cells".
   Pure, total over the type domain.

### Public interface (exact signatures)

```ts
export const TETROMINO_TYPES: readonly TetrominoType[];
export const BOUNDING_BOX: Readonly<Record<TetrominoType, number>>;
export const TETROMINO_CELLS: Readonly<
  Record<TetrominoType, readonly (readonly Point[])[]>
>;
export function cellsFor(
  type: TetrominoType,
  rotation: RotationState,
): readonly Point[];
```

### The data (state 0 spawn shapes, for reference — `(x,y)`, `x` right, `y` down)

Box `N` in parentheses; states 1–3 are CW rotations `(x,y)→(N-1-y,x)` of state 0 (O excepted).

- **I** (4): `(0,1)(1,1)(2,1)(3,1)` — horizontal bar on row 1.
- **O** (2): `(1,0)(2,0)(1,1)(2,1)` — identical in all 4 states.
- **T** (3): `(1,0)(0,1)(1,1)(2,1)` — up-tab.
- **S** (3): `(1,0)(2,0)(0,1)(1,1)`.
- **Z** (3): `(0,0)(1,0)(1,1)(2,1)`.
- **J** (3): `(0,0)(0,1)(1,1)(2,1)`.
- **L** (3): `(2,0)(0,1)(1,1)(2,1)`.

Full states 1–3 for each are written literally in the file (verified during research to equal
the CW recomputation of the prior state), so `TETROMINO_CELLS` is the single source of truth
and the test independently re-derives to confirm.

## `lib/tetrominoes.test.ts` — internal organization

- **Imports.** `import { describe, it, expect } from "vitest";` (explicit, no globals) and
  `import { TETROMINO_TYPES, BOUNDING_BOX, TETROMINO_CELLS, cellsFor } from "./tetrominoes";`.
- **Local test helpers** (not exported from the module — kept in the test):
  - `keyOf(p: Point): string` → `` `${p.x},${p.y}` `` for set membership/compare.
  - `asSet(cells)` → `Set<string>` of keys.
  - `rotateCW(cells, n)` → new offsets `{ x: n-1-y, y: x }`. The independent SRS oracle.
- **`describe("tetrominoes", ...)`** with focused `it` blocks matching Design D6:
  1. completeness (7 types; each has 4 states)
  2. every state has exactly 4 cells
  3. every state's 4 cells are distinct
  4. every offset within `[0, N)²`
  5. rotation consistency: `state[k+1]` set == `rotateCW(state[k], N)` set, for non-O pieces,
     for `k = 0,1,2` (and wrap `3→0` optionally)
  6. O is rotation-invariant (all 4 states equal)
  7. spawn (state 0) spot-checks vs literal known SRS coordinates for all 7
  8. `cellsFor(t, r)` === `TETROMINO_CELLS[t][r]`

Tests 2–4 iterate `TETROMINO_TYPES × [0,1,2,3]` so all 28 states are walked in one loop, with
per-state assertion messages (include type + rotation) so a failure names the culprit.

## Ordering of changes

1. Write `lib/tetrominoes.ts` (data + accessor).
2. Write `lib/tetrominoes.test.ts`.
3. `npm run test` → expect the new suite green alongside `board.test.ts`.
4. `npm run lint` → expect exit 0 (purity boundary satisfied; `vitest` import allowed).
5. `npm run build` → expect exit 0 (strict `tsc` over the whole tree, test file included).
6. Commit both files + the six work artifacts in one atomic commit.

Single logical unit → **one commit** (no partial green states to worry about, unlike the
runner-bootstrap fold in T-002-01-01). See `plan.md` for the step sequence and verification.

## Boundaries preserved

- No `types.ts` edit — no new type is required.
- No `constants.ts`, eslint, tsconfig, `components/`, or `app/` change.
- No wall-kick table, no spawn position, no color map, no bag/RNG — each is another ticket.
- `TETROMINO_TYPES` is the only new exported *list*; framed as the type alphabet, not bag
  logic, to stay clear of sibling T-002-01-03.
