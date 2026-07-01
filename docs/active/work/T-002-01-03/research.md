# Research — T-002-01-03: seeded-rng-and-seven-bag

Descriptive map of the codebase as it bears on providing a **seeded PRNG** and a **7-bag piece
generator** so piece sequences are reproducible from a given seed. What exists, where, how it
connects, and the boundaries this ticket must respect. No solutions proposed here.

## The ask (from the ticket)

> Provide a seeded PRNG and a 7-bag generator so piece sequences are reproducible from a given
> seed. _Advances: P1, E-002:reproducible-rng_

One acceptance criterion, with two clauses:

> Two generators built from the same seed yield byte-identical piece sequences over 100 draws,
> and each 7-piece window contains all 7 tetromino ids exactly once (test).

So the deliverable is (a) a seeded random-number primitive, (b) a 7-bag generator layered on
it, and (c) a Vitest suite proving **determinism** (same seed → identical 100-draw sequence)
and the **bag property** (every 7-piece window is a permutation of the 7 ids).

`depends_on: [T-002-01-02]` — the tetromino shape/alphabet ticket, now committed (`5a9fc0e`).

## What already exists in `lib/`

Six files, all pure and framework-free (CLAUDE.md track boundary, lint-enforced — see below):

- **`lib/types.ts`** — the data substrate. Zero runtime output. Relevant here:
  - `type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L"` — the fixed 7-id alphabet.
    The bag draws from exactly these ids; a "7-piece window contains all 7" is defined against
    this set.
  - `interface Piece { type; rotation; position }` — the active piece. Not produced by this
    ticket (the bag yields a `TetrominoType`, and spawn/position is a later concern), but it is
    where the bag's output eventually feeds.
  - `Point`, `RotationState`, `Cell`, `Board` — unrelated to sequencing.

- **`lib/tetrominoes.ts`** (committed `5a9fc0e`) — the direct upstream. Exports:
  - `TETROMINO_TYPES: readonly TetrominoType[]` = `["I","O","T","S","Z","J","L"]`. **This is the
    exact set the 7-bag shuffles.** Its own doc comment already anticipates us: "the 7-bag in
    T-002-01-03 all iterate it… `TETROMINO_TYPES` here is just the type alphabet expressed as an
    ordered list." The bag consumes this list; it owns the sequencing.
  - `BOUNDING_BOX`, `TETROMINO_CELLS`, `cellsFor` — shape data, not needed for sequencing.

- **`lib/board.ts`** — `emptyBoard(width, height): Board`. Style precedent (see below), not
  functionally related.

- **`lib/constants.ts`** — `COLS = 10`, `ROWS = 20`. No RNG constants exist yet.

- **`lib/board.test.ts`, `lib/tetrominoes.test.ts`** — the test precedents.

## Module-style conventions (what new `lib/` files must match)

From `board.ts` and `tetrominoes.ts`:

- A leading block doc comment stating the module's purpose, its **purity/framework-free**
  status, and how it connects to sibling modules and later tickets.
- `import type { … } from "./types"` for types; relative imports within `lib/`.
- Small, focused, pure functions or static data. `board.ts` is a single pure function;
  `tetrominoes.ts` is static tables plus a pure accessor. Terse local helpers (e.g. `p(x,y)`)
  are used to keep data readable.
- `Readonly<…>` / `readonly` views on exported data to guard against caller mutation.

## Test conventions (what the new suite must match)

From `tetrominoes.test.ts` and `board.test.ts`:

- Vitest with **explicit** imports: `import { describe, it, expect } from "vitest"` — no
  globals config. Colocated `*.test.ts` next to the module. Relative import of the unit.
- One `describe` per module; several small `it` blocks each asserting one property.
- Independent oracles are favored over trusting the implementation: `tetrominoes.test.ts`
  re-derives rotations with its own `rotateCW` rather than reading the table back. The RNG suite
  should likewise assert *properties* (determinism, permutation, coverage) rather than pinning
  magic output numbers to the implementation.
- `npm run test` → `vitest run`. Currently **12 passing across 2 files** (baseline).

## Toolchain & constraints

- **TypeScript strict** (`tsconfig.json`: `"strict": true`), `target: ES2017`, `noEmit` for the
  app (Next build runs whole-tree tsc). ES2017 is comfortably enough for the bit-twiddling a
  32-bit PRNG needs; `Math.imul` is ES2015. No `bigint` needed.
- **Zero-warning lint**: `npm run lint` = `eslint --max-warnings 0`.
- **`lib/**` purity is lint-enforced** (`eslint.config.mjs`): a `no-restricted-imports` rule
  forbids `react`, `react-dom`, `next` (and subpaths) anywhere under `lib/`. The RNG/bag must be
  pure logic — no React, no `Date.now()`/`Math.random()` seeding *inside* the module (that would
  destroy reproducibility; seeds come from the caller).
- **No new dependencies** are warranted: a 32-bit PRNG (mulberry32/xorshift/sfc32) is ~5 lines.
  `package.json` currently has only next/react + vitest/eslint/tailwind. Adding a `seedrandom`
  dep would be disproportionate and off-pattern (the whole `lib/` layer is hand-rolled).

## Domain constraints the design must honor

- **Determinism is the whole point.** Identical seed ⇒ identical stream ⇒ identical bag order.
  This forbids any nondeterministic input (wall-clock, `Math.random`, iteration over unordered
  structures) inside the generator. State must advance purely from the seed.
- **Reproducibility across two independent instances** (the AC's "two generators"): constructing
  two generators from the same seed and drawing 100 from each must yield byte-identical arrays.
  So generator state must be fully determined by the seed and self-contained (no shared/global
  mutable state between instances).
- **7-bag semantics** (standard modern Tetris "Random Generator"): pieces are dealt from a bag
  containing exactly one of each of the 7 ids; when the bag empties it is refilled and reshuffled.
  Consequence: every *aligned* window of 7 draws (`[0,7)`, `[7,14)`, …) is a permutation of all
  7 ids — no piece appears twice before all others appear once. The AC's "each 7-piece window
  contains all 7 ids exactly once" is exactly this aligned-window property.
- **Shuffle must be unbiased.** A Fisher–Yates shuffle driven by the PRNG gives uniform
  permutations; a naive `sort(() => rand()-0.5)` is biased and must be avoided.

## Boundaries / out of scope (explicitly not this ticket)

- Piece **spawn position**, initial `rotation`, and turning a drawn `TetrominoType` into a
  `Piece` — later movement/spawn tickets. The bag yields ids only.
- **Peeking** the upcoming queue for `NextPreview` — a rendering-side concern (E-001/E-003);
  the AC needs only sequential draws. Whether to expose a peek is a design question, but
  building the preview UI is not this ticket.
- Wiring the generator into React game state / the loop — later integration.
- Choosing/So­urcing the *initial seed value* at app start (time-based, URL param, fixed) — a
  product/integration decision; this ticket makes the generator *accept* a seed.

## Open questions to resolve in Design

1. **PRNG algorithm**: mulberry32 vs xorshift128 vs sfc32 vs LCG — quality vs simplicity vs
   seed ergonomics (single 32-bit number seed is ideal, since the AC seeds with "a seed").
2. **State model**: closure-encapsulated mutable state (a `next()` method) vs explicit immutable
   state threaded functionally (`[value, nextState]`). The `lib/` layer leans pure/immutable,
   but a stream generator is inherently stateful. Tradeoff: simplicity/ergonomics vs
   serializability for later save/replay.
3. **File split**: one module (`rng.ts` with bag inside) vs two (`rng.ts` + `bag.ts`). The
   codebase pattern is one concern per file; the ticket names two concerns.
4. **Bag API surface**: `next()` only, vs `next()` + `peek()`/`take(n)`. Keep minimal vs
   anticipate the preview.
