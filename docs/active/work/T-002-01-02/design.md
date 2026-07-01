# Design — T-002-01-02: tetromino-set-and-rotation-states

Decisions with rejected alternatives, grounded in `research.md`. Scope: a pure shape-data
module under `lib/` encoding all 7 tetrominoes × 4 SRS rotation states, plus a Vitest suite
that enumerates all 28 states and checks cell count + SRS correctness.

## D1 — Cell representation: offset lists of `Point`, `board[y][x]` convention

**Decision.** A rotation state is a `readonly Point[]` of length 4 — the four occupied cells
as `{x, y}` offsets *within the piece's bounding box*, using the fixed `x`-right / `y`-down /
origin-top-left convention from `types.ts`.

- Reuses the existing `Point` type — no new coordinate primitive, and offsets compose directly
  with a piece's `position: Point` (a later `pieceCells` helper just adds anchor + offset).
- Matches the board's `board[y][x]` row-major convention, so a resolved piece stamps onto the
  board with no axis flip.
- Rejected a **matrix / string-art** representation (`["....","XXXX",...]` per state): pretty to
  read, but forces every consumer (collision, rendering) to re-parse strings into coordinates,
  and drags a bounding-box glyph grid into runtime data. Offsets are the form the engine
  actually consumes. (A string form *could* seed the data at authoring time, but the compiled
  artifact should be coordinates.)
- Rejected a **bitmask per row** (`0b0110` …): compact but opaque, couples to box width, and is
  hostile to the `Point`-based collision math the rest of `lib/` will use.

## D2 — Store all 4 states explicitly (not spawn + derive)

**Decision.** Hardcode all four rotation states for each piece as literal offset data — 28
states total — transcribed from the published SRS tables.

- **Auditable & matches the AC.** The AC says "matches *known* SRS spawn/rotation offsets."
  Literal data can be diffed cell-for-cell against a reference table; a reviewer sees exactly
  what each state is. Derivation hides the actual coordinates behind a formula.
- **No load-bearing runtime rotation logic.** If we stored only spawn and derived 1–3 with a
  rotate function, that function becomes correctness-critical and must itself be tested; a bug
  there silently corrupts every piece. Data has no logic to be wrong.
- **The consistency property still gets tested** (see D6): the *test* derives states 1–3 from
  state 0 by geometric rotation and asserts equality with the stored data. So we get the safety
  of derivation as an *independent check* without making production behavior depend on it. Best
  of both: explicit data, verified by an independent recomputation.
- Rejected **spawn-only + derive-at-runtime**: smaller source, but moves risk into code, and
  callers would pay a rotation cost (or need memoization) on every access. Pre-materialized
  data is simpler and faster.
- I pre-verified (during research) that the SRS coordinates chosen are self-consistent:
  `state[k+1] == rotateCW(state[k])` holds for I (4×4 box) and T/S/Z/J/L (3×3 box), and O is
  rotation-invariant. So the explicit table and the derivation agree by construction.

## D3 — Bounding boxes: I → 4×4, O → fixed, T/S/Z/J/L → 3×3

**Decision.** Record a per-piece bounding-box size and place offsets inside it per SRS: I in a
4×4 box, the T/S/Z/J/L family in a 3×3 box, O as its fixed 2×2 block sitting at cells
`(1,0),(2,0),(1,1),(2,1)`.

- The box size is genuine shape metadata (it defines the rotation center) and will be needed
  again by the wall-kick tables later, so exposing `BOUNDING_BOX` now is forward-friendly, not
  speculative.
- It is also what the **test** needs to recompute rotations: CW rotation within an `N×N` box is
  `(x, y) → (N-1-y, x)`. Exposing `N` lets the test derive-and-compare without hardcoding a
  second copy of the box sizes.
- **O is special.** All four of its states are identical; rotating it geometrically in a box
  would move it. We encode O's four states as the same four cells and the test treats O as
  rotation-invariant (assert all states equal) rather than applying the rotate check.

## D4 — Public API: `TETROMINOES` table + thin accessors

**Decision.** Export from `lib/tetrominoes.ts`:

```ts
export const TETROMINO_TYPES: readonly TetrominoType[];              // ["I","O","T","S","Z","J","L"]
export const BOUNDING_BOX: Readonly<Record<TetrominoType, number>>;  // I:4, O:2, others:3
export const TETROMINO_CELLS:                                        // [type][rotation] -> 4 cells
  Readonly<Record<TetrominoType, readonly (readonly Point[])[]>>;
export function cellsFor(type: TetrominoType, rotation: RotationState): readonly Point[];
```

- `TETROMINO_CELLS[type][rotation]` is the core datum; `cellsFor(type, rotation)` is the
  ergonomic accessor downstream code (and `Piece` resolution) will call — one obvious entry
  point rather than every caller reaching into the nested table.
- `BOUNDING_BOX` exposed for kicks + the test's rotation check (D3).
- `TETROMINO_TYPES` is the ordered list of the 7 ids — needed by the test to enumerate pieces,
  and a natural iteration constant. **Boundary note:** this is the *type alphabet as data*, not
  bag/RNG logic. The sibling ticket **T-002-01-03** owns 7-bag *sequencing*; exposing a plain
  ordered list of ids here does not encroach on that (the bag will consume this list, not
  redefine it). Framed and commented as such.
- Everything `readonly` / `as const`-flavored: shape data is immutable; a caller must never
  mutate a shared offset array. `readonly Point[]` prevents accidental in-place edits.
- Rejected a **`getRotations(type)` returning a 4-tuple** as the primary API: `cellsFor` at a
  specific `(type, rotation)` is what callers actually want (a piece has one current rotation);
  the full table remains reachable via `TETROMINO_CELLS` for the preview/test.
- Rejected folding shape data into **`lib/types.ts`**: that module is deliberately zero-runtime
  (pure types). Shape tables are runtime values → they belong in their own module, mirroring
  the `types.ts` (types) vs `board.ts` (behavior) split already established.

## D5 — File layout: `lib/tetrominoes.ts` + `lib/tetrominoes.test.ts`

**Decision.** New `lib/tetrominoes.ts` (data + accessor) and colocated `lib/tetrominoes.test.ts`
(Vitest). No changes to any existing file.

- Distinct new files → **zero contention** with the sibling RNG ticket on the shared branch
  (RDSPI concurrency note: same-file edits = missing DAG edge; separate files keep the lock
  uncontended). Nothing else needs to change: `types.ts` already declares everything we import.
- Matches the `board.ts` / `board.test.ts` precedent exactly.
- Rejected touching `types.ts` (no new type needed — `Point`/`TetrominoType`/`RotationState`
  suffice) and rejected a `lib/index.ts` barrel (not mandated; consumers import
  `@/lib/tetrominoes` directly, as with `@/lib/board`).

## D6 — Test strategy: enumerate 28, structural invariants + independent rotation recompute

**Decision.** `lib/tetrominoes.test.ts`, explicit Vitest imports, mirroring `board.test.ts`
structure. Assertions, each a focused `it`:

1. **Completeness.** `TETROMINO_TYPES` has all 7 ids; `TETROMINO_CELLS` has an entry for each,
   and each has exactly 4 rotation states.
2. **Exactly 4 cells** — for every one of the 28 (type × rotation) states, `length === 4`.
3. **Four *distinct* cells** — no duplicate coordinate within a state (a real tetromino covers
   4 separate squares); guards a transcription typo that repeats a cell.
4. **In-bounds** — every offset lies within the piece's `BOUNDING_BOX` (`0 ≤ x,y < N`).
5. **SRS rotation consistency** — for each non-O piece, `TETROMINO_CELLS[type][k+1]` (as a
   set) equals `rotateCW(TETROMINO_CELLS[type][k], N)` where `rotateCW((x,y)) = (N-1-y, x)`.
   This is the "matches known SRS rotation offsets" check, done by *independent recomputation*
   rather than restating the table — a transcription error in any state fails it.
6. **O is rotation-invariant** — all four O states are the same cell set.
7. **Known spawn shapes** — spot-check state 0 of each piece against the literal published SRS
   spawn coordinates (the "matches known SRS *spawn* offsets" clause), so the whole rotation
   chain is anchored to a correct state 0 (rotation-consistency alone can't catch a globally
   wrong-but-self-consistent orientation).
8. **`cellsFor` accessor** returns the same array as `TETROMINO_CELLS[type][rotation]`.

- Set-equality (sorted coordinate compare) is used for rotation checks because order within a
  state is not semantically meaningful. Helper `keyOf(p) = `${p.x},${p.y}`` for set compares.
- This split — data-independent invariants (2–6) **plus** anchored spawn checks (7) — is what
  makes the suite more than a mirror of the data: it would catch both local typos and a
  systematically rotated table.

## Out of scope (guarded)

Wall-kick offset tables, spawn board-column / initial `position`, piece **colors** (a rendering
concern), the **7-bag / RNG** (sibling T-002-01-03), a `pieceCells(piece: Piece)` board-space
resolver (later movement/collision ticket), and any change to `components/`, `app/`,
`types.ts`, `constants.ts`, eslint, or tsconfig.
