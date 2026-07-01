# Research — T-002-01-02: tetromino-set-and-rotation-states

Descriptive map of the codebase as it bears on encoding the 7 standard tetrominoes with their
four SRS rotation states. What exists, where, and the boundaries this ticket must respect. No
solutions proposed here.

## The ask (from the ticket)

Encode the 7 standard tetrominoes (I, O, T, S, Z, J, L) with their four SRS rotation states as
**pure shape data**. One acceptance criterion:

> A test enumerates all 7 pieces × 4 rotation states, asserting each occupies exactly 4 cells
> and matches known SRS spawn/rotation offsets.

So the deliverable is (a) a shape-data module under `lib/`, and (b) a Vitest suite that walks
all 28 (type × rotation) states and checks cell count + SRS correctness.

## What already exists in `lib/`

Four files, all pure and framework-free (CLAUDE.md track boundary, lint-enforced):

- **`lib/types.ts`** — the data substrate this ticket builds on. Zero runtime output. Relevant
  declarations:
  - `interface Point { x: number; y: number }` — `x` = column (0 = leftmost), `y` = row
    (0 = topmost). This is the natural unit for a cell offset.
  - `type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L"` — the fixed 7-id alphabet
    the whole engine keys on. Our shape table must be keyed by exactly these ids.
  - `type RotationState = 0 | 1 | 2 | 3` — the four SRS orientations: 0 (spawn), 1 (R, CW),
    2 (180), 3 (L, CCW). Defined *specifically* as the index into the per-piece rotation
    table this ticket now supplies. The doc comment on `RotationState` literally says "The
    concrete cell offsets for each state are supplied by the shape data (T-002-01-02)."
  - `interface Piece { type; rotation; position }` — the active piece stores identity +
    orientation + anchor, **not** resolved cells. The comment says cells "are *derived* from
    the shape tables (T-002-01-02) for a given `type` + `rotation`." That derivation is what
    this ticket enables; performing it (a `pieceCells(piece)` helper) belongs to later
    movement/collision work, but the underlying table must land here.
  - `type Cell = TetrominoType | null` and `type Board = Cell[][]` (`board[y][x]`, row-major)
    — not directly used by shape data, but the `y`-down / `x`-right convention here is the
    one our offsets must match so a piece can later be stamped onto the board without an axis
    flip.

- **`lib/board.ts`** — `emptyBoard(width, height): Board`. The one behavioral precedent to
  match for module style: leading doc comment, `import type { ... } from "./types"`, a single
  focused pure function, nested `Array.from`. Not otherwise related.

- **`lib/board.test.ts`** — the test precedent. Vitest, **explicit** imports
  (`import { describe, it, expect } from "vitest"` — no globals), colocated `*.test.ts`,
  relative import of the module under test. Structure: one `describe`, several `it` blocks
  each asserting one property. Our test should mirror this shape.

- **`lib/constants.ts`** — `COLS = 10`, `ROWS = 20`. Board dimensions only; no piece data.
  Not a dependency of shape data, but shows the "one small pure constants module, richly
  commented" style.

## Tooling / build reality

- **Vitest `^4.1.9`** is installed (dev dep) with `"test": "vitest run"`; the runner was stood
  up by T-002-01-01. `node_modules/.bin/vitest` present. No config file — zero-config TS,
  node environment, no jsdom (our data is node-only, no DOM needed).
- **TypeScript** `strict: true`, `noEmit`, bundler resolution, path alias `@/* → ./*`
  (`tsconfig.json`). `next build` type-checks the whole tree including `*.test.ts`, so the
  test file must compile under strict mode; `vitest` ships its own types.
- **ESLint** flat config with a `lib/**/*.{ts,tsx}` block: `no-restricted-imports` forbids
  `react`, `react-dom`, `next`, and their subpaths. Our new module and its test live under
  `lib/`, so both must stay framework-free (importing `vitest` is allowed — not on the list).
  `npm run lint` runs `--max-warnings 0`.

## Dependency & sibling context

- **`depends_on: [T-002-01-01]`** — satisfied. That ticket delivered the types + `emptyBoard`
  + the Vitest runner (commit `a704daf`). We inherit a typed vocabulary and a green harness.
- **Sibling `T-002-01-03`** (same story S-002-01) is the **seeded RNG / 7-bag**. It will need
  to enumerate "all 7 ids." An ordered `TetrominoType[]` list is a natural shared constant; if
  we expose one here we must frame it as *the type alphabet as data*, not bag logic — the bag
  sequencing is T-002-01-03's boundary. Watch for accidental overlap.
- **Story S-002-01** = "tetromino-and-rng-foundations"; **Epic E-002** = pure game core engine
  (per MEMORY: decomposed into S-002/S-003/S-004). Downstream consumers of this table:
  collision, movement, rotation-with-wall-kicks, `NextPreview` rendering, ghost piece.

## SRS domain facts (the "known offsets" the AC references)

The Super Rotation System is the de-facto standard (Tetris Guideline). Key facts the data
must honor:

- Each piece occupies **exactly 4 cells** in every rotation state (tetromino = 4 ominoes).
- Pieces rotate **within a bounding box**: **I** in a 4×4 box, **O** effectively fixed, the
  other five (**T, S, Z, J, L**) in a 3×3 box.
- The four states are the spawn shape rotated 0°/90°/180°/270°. Crucially, in SRS the
  successive states **are** a pure geometric 90° rotation of the shape *within its bounding
  box* — i.e. state `k+1` = rotate-CW(state `k`) about the box center. (Wall kicks, which
  adjust position when a rotation collides, are a *separate* offset table and are **out of
  scope** for this ticket — we encode only the shapes, not kicks.)
- **O never changes cells** across states (it is rotation-invariant): all four states are the
  same four cells.
- Canonical spawn (state 0) shapes, `(x,y)` with `x` right, `y` down:
  I → row of 4; T → up-tab; S/Z → the two skews; J/L → the two corners. These specific
  coordinate sets are the "known SRS spawn offsets" the test will check against.

This CW-rotation-within-box property is the strong, data-independent invariant the test can
exploit: rather than the test merely restating the table, it can *derive* states 1–3 from
state 0 by rotation and assert equality — catching any transcription error.

## Constraints & assumptions surfaced

1. **Purity.** No React/Next imports; the module is data + at most pure accessor functions.
2. **Coordinate convention is fixed** by `types.ts`/`board.ts`: `x` right, `y` down, origin
   top-left. Offsets must use it so board-stamping needs no flip later.
3. **Keying must be exactly `TetrominoType`** and indexing exactly `RotationState`, so the
   table is total (all 7 × all 4) and type-checked complete.
4. **Wall kicks, spawn board-position, colors, and the bag are NOT this ticket.** Colors will
   be a rendering concern; kicks/spawn-column are later movement tickets; the bag is the
   sibling ticket. Guard against scope creep.
5. **Style precedents** to match: leading module doc comment, `import type`, explicit Vitest
   imports, colocated test, one property per `it`.
6. **Open question for Design:** hardcode all 28 states explicitly (auditable, matches
   published tables) vs. store only spawn + derive rotations (less data, but the derivation
   logic itself becomes load-bearing and must be correct). Either way the *test* should assert
   the rotation-consistency property independently.
