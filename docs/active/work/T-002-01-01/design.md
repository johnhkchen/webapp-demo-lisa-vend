# Design — T-002-01-01: board-model-and-core-types

Decisions, with rejected alternatives, grounded in `research.md`. Scope: the pure data
substrate (`Board`, `Cell`, `Piece`, `Point`), `emptyBoard(w,h)`, one unit test, and the
test runner this ticket must stand up.

## D1 — Coordinate type: `Point = { x, y }`

**Decision.** `interface Point { x: number; y: number }` — `x` = column, `y` = row.

- Rejected `[number, number]` tuple: positional, easy to swap x/y, poor readability at call
  sites (`p.x` vs `p[0]`). Named fields are self-documenting and SRS offset math (added in
  T-002-01-02) reads clearly.
- Rejected a `class`: violates the "pure data" spirit; classes complicate structural
  equality and serialization the determinism harness (T-004) will want.

## D2 — Board orientation: row-major `Cell[][]`, indexed `board[y][x]`

**Decision.** `type Board = Cell[][]` where the **outer** array is rows (length = height) and
the **inner** array is columns (length = width). Access is `board[y][x]`.

- Matches `emptyBoard(width, height)` producing `height` rows of `width` cells — the natural
  reading order and what line-clear (a whole-**row** operation, S-004) will iterate.
- Rejected a **flat** `Cell[]` of length `w*h` with index math (`y*w + x`): the renderer
  (`components/Board.tsx`) uses a flat array, but that is a *rendering* convenience; the
  *model* benefits from 2D indexing for row operations (clear/collision). Keeping the model
  2D and letting the renderer flatten at the boundary is the cleaner split. Documented as a
  deliberate divergence from the placeholder renderer.
- Rejected column-major `board[x][y]`: unconventional for Tetris; row iteration for line
  clears would be a strided gather.

## D3 — Cell representation: `Cell = TetrominoType | null`

**Decision.** `type Cell = TetrominoType | null`, where `null` = empty and a non-null value
is the id of the tetromino occupying that square. Introduce
`type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L"`.

- A cell must remember **color/identity** for rendering settled blocks and is the natural
  unit line-fullness tests against (`cell !== null`). `TetrominoType | null` captures both
  "occupied?" and "which color" in one value with zero overhead.
- Rejected `boolean`: loses color; a settled board rendered from booleans is monochrome,
  forcing a parallel color grid later — throwaway.
- Rejected a tagged object `{ filled: boolean; color?: ... }`: heavier, more allocation,
  redundant (`filled` is derivable from a nullable id), and invites divergent states
  (`filled:true, color:undefined`).
- `TetrominoType` is the fixed 7-id alphabet the whole engine keys on (T-002-01-02/03 both
  reference "all 7 ids"). Defining it here — as the *type*, not the shape data — gives those
  tickets a shared vocabulary without stepping on their data. This is a string-literal union,
  not a shape table, so it stays inside this ticket's boundary.

## D4 — `Piece`: active-piece identity, not resolved cells

**Decision.**
```ts
type RotationState = 0 | 1 | 2 | 3;
interface Piece { type: TetrominoType; rotation: RotationState; position: Point }
```
`Piece` models the **falling** piece as *identity + orientation + anchor position*. The
concrete occupied cells for a given `(type, rotation)` are resolved from the shape tables
**T-002-01-02 owns** — not stored on `Piece`.

- This is the crisp boundary with the sibling ticket: this ticket types *what a piece is*;
  the next ticket supplies *what each type/rotation looks like*. `Piece` needs a `rotation`
  field, so `RotationState = 0|1|2|3` (the 4 SRS states) is defined here as the minimal type
  to make `Piece` well-formed — a 4-value union, again a type not a data table.
- Rejected embedding `cells: Point[]` on `Piece`: would force this ticket to know shapes
  (T-002-01-02's job) and denormalizes state (cells must stay in sync with type+rotation).
  Keeping `Piece` normalized (id+rotation+position) and deriving cells in a pure function
  later is the standard SRS model.
- Rejected omitting `Piece` until movement lands: the AC explicitly lists `Piece` among the
  exported types, and downstream spawn/move code needs a stable shape to target now.

## D5 — `emptyBoard(width, height): Board` — fresh rows, no aliasing

**Decision.**
```ts
function emptyBoard(width: number, height: number): Board {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null),
  );
}
```
Arg order `(width, height)` mirrors the AC's `emptyBoard(w,h)` and the `COLS,ROWS` ordering.

- `Array.from` with a factory per row guarantees **each row is a distinct array** — avoids the
  classic `Array(h).fill(Array(w).fill(null))` aliasing bug where every row is the *same*
  reference and writing one cell writes the whole column. The unit test will guard this.
- Rejected defaulting `width`/`height` to `COLS`/`ROWS`: AC wants the explicit `(w,h)`
  constructor; keeping params required makes it general and keeps the `constants` coupling out
  of the substrate. Callers pass `emptyBoard(COLS, ROWS)`.
- Returns `Cell[][]` of `null`s — "correctly-dimensioned all-empty grid" per AC.

## D6 — File layout: `lib/types.ts` + `lib/board.ts`

**Decision.** Types in `lib/types.ts` (pure `type`/`interface`, zero runtime); constructor in
`lib/board.ts` (imports its types from `./types`). Test in `lib/board.test.ts`.

- Separating **types** from **behavior** lets T-002-01-02 (shapes) and T-002-01-03 (RNG)
  import `@/lib/types` without pulling `board.ts`, and reduces cross-ticket file contention on
  the shared branch (the RDSPI concurrency note: same-file edits = missing DAG edge; distinct
  files reduce lock contention).
- Rejected one `lib/board.ts` holding both: workable but couples type imports to the module
  with runtime code; the split is cheap and forward-friendly.
- Rejected a barrel `lib/index.ts`: not mandated by CLAUDE.md; adds indirection now for no
  consumer. Downstream imports `@/lib/types` / `@/lib/board` directly.

## D7 — Test runner: Vitest, colocated test, `vitest run`

**Decision.** Add **Vitest** as a dev dependency and a `"test": "vitest run"` script. Test
file `lib/board.test.ts` imports `{ describe, it, expect } from "vitest"` (explicit imports,
no globals) and `emptyBoard` from `./board`.

- Vitest is the runner every prior review artifact named as the deferred choice; it is
  zero-config for pure TS, needs no jsdom (this is node-only logic), and resolves the
  `@/*`-free relative import without extra setup.
- **Explicit imports over globals**: avoids adding `globals: true` + tsconfig `types` wiring,
  and keeps the file lint-clean (no undeclared `describe`/`it`). Keeps `next build`'s
  whole-tree type-check happy since `vitest` ships its own types (installed as a dep).
- **Purity boundary interaction**: `lib/board.test.ts` is under `lib/**`, so the
  `no-restricted-imports` rule applies — importing `vitest` is allowed (not react/next), and
  the test being framework-free is itself a nice proof the substrate is pure.
- **`next build` interaction**: a `*.test.ts` file is type-checked by `tsc` but not bundled
  into the app (nothing imports it from `app/`). With `vitest` installed, its types resolve,
  so the build stays green. Verified as a plan step.
- Rejected Jest: heavier config, ts-jest/babel setup, slower — disproportionate and against
  the grain of the prior artifacts' stated intent.
- Rejected deferring the test/runner again: impossible — the AC mandates a unit test.

## Test coverage plan (what the one test asserts)

1. `emptyBoard(10, 20)` has `length === 20` (rows) and every row `length === 10` (cols).
2. Every cell is `null` (initial emptiness) — assert via `.flat().every(c => c === null)`.
3. **Non-aliasing**: mutating `board[0][0]` leaves `board[1][0]` untouched (guards the
   `fill`-aliasing bug from D5).
4. A non-square case (e.g. `emptyBoard(3, 5)`) to prove `(w,h)` order isn't accidentally
   transposed.

## Out of scope (guarded)

No shape tables (→ T-002-01-02), no RNG (→ T-002-01-03), no collision/move/gravity/clear/score
(→ S-003/S-004), no changes to `components/` or `app/`, no barrel, no default dimensions on
`emptyBoard`.
