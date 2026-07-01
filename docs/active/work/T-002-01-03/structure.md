# Structure — T-002-01-03: seeded-rng-and-seven-bag

The blueprint: file-level changes, module boundaries, public interfaces, and ordering. Not code
— the shape of the code. Derives directly from the Design decisions.

## Files

### Created

| File | Kind | Purpose |
|---|---|---|
| `lib/rng.ts` | source | Seeded 32-bit PRNG primitive (mulberry32) + `RandomFn` type |
| `lib/rng.test.ts` | test | Determinism, range, seed-sensitivity, instance independence |
| `lib/bag.ts` | source | 7-bag generator layered on `rng.ts`; `createSevenBag` + `SevenBag` |
| `lib/bag.test.ts` | test | AC: same-seed identity over 100 draws; aligned-window permutation |
| `docs/active/work/T-002-01-03/{research,design,structure,plan,progress,review}.md` | artifact | RDSPI trail |

### Modified / Deleted

None. No changes to `types.ts`, `tetrominoes.ts`, `board.ts`, `constants.ts`, `components/`,
`app/`, `eslint.config.mjs`, `tsconfig.json`, or `package.json`. No new dependency. Ticket /
story / epic frontmatter and sibling working-tree files are left untouched (Lisa's job).

## Module boundaries

```
lib/types.ts ──────────────► lib/tetrominoes.ts ──(TETROMINO_TYPES)──► lib/bag.ts
  (TetrominoType)                                                          │
                                                     lib/rng.ts ──(RandomFn, mulberry32)─┘
```

- `rng.ts` depends on **nothing** in `lib/` — a leaf primitive. No imports except (none).
- `bag.ts` depends on `rng.ts` (for `mulberry32`) and `tetrominoes.ts` (for `TETROMINO_TYPES`)
  and `types.ts` (for `TetrominoType`, via `import type`).
- Neither imports React/Next (lint-enforced purity holds trivially — pure arithmetic + arrays).

## `lib/rng.ts` — interface & internals

**Leading doc comment**: states purpose (seeded deterministic PRNG), purity/framework-free
status, why mulberry32, the seed contract (state fully determined by the integer seed; no
wall-clock/`Math.random` inside — reproducibility is the point), and that `bag.ts` consumes it.

**Public:**
- `export type RandomFn = () => number;` — a thunk yielding a float in `[0, 1)`. Named so
  consumers (bag now; future RNG users) can type-annotate the stream.
- `export function mulberry32(seed: number): RandomFn;` — factory. Normalizes `seed >>> 0` to
  uint32, closes over the running state `a`, returns the generator function. Pure: same seed →
  same returned stream; no external side effects.

**Internal:** none beyond the closure. Kept to a single exported factory + type, mirroring the
minimalism of `board.ts`.

## `lib/bag.ts` — interface & internals

**Leading doc comment**: states purpose (reproducible 7-bag piece order), the 7-bag rule
(one of each id per bag, reshuffle on empty ⇒ every aligned 7-window is a permutation), purity,
what it consumes (`mulberry32`, `TETROMINO_TYPES`), and what it yields (`TetrominoType` ids
only — spawn position/`Piece` construction is a later ticket).

**Public:**
- `export interface SevenBag { next(): TetrominoType; }` — the generator handle. `next()`
  returns the next id, refilling internally when the current bag empties.
- `export function createSevenBag(seed: number): SevenBag;` — factory. Builds `mulberry32(seed)`,
  holds a `queue: TetrominoType[]` (mutable, closure-private), returns `{ next }`.

**Internal (module-private, not exported):**
- `shuffle(items: readonly TetrominoType[], rand: RandomFn): TetrominoType[]` — pure Fisher–Yates
  returning a **new** array (copies input via `slice()`; never mutates `TETROMINO_TYPES`). Index
  `Math.floor(rand() * (i + 1))`.
- Refill logic inside `next()`: `if (queue.length === 0) queue = shuffle(TETROMINO_TYPES, rand);`
  then `return queue.shift()!`. (The `!` is safe: a fresh 7-element bag guarantees non-empty
  after refill; documented at the site.)

## `lib/rng.test.ts` — shape

Vitest, explicit imports (`import { describe, it, expect } from "vitest"`), import from
`./rng`. One `describe("mulberry32", …)` with `it` blocks:
1. same seed → byte-identical N-length stream (collect N via a small helper).
2. every value in `[0, 1)`.
3. different seeds → streams differ (guards against a constant/stuck generator).
4. two instances from one seed are independent yet identical (no shared global state).

Local helper: `take(rand, n)` → `number[]` of `n` draws.

## `lib/bag.test.ts` — shape

Vitest, explicit imports, import `createSevenBag` from `./bag` and `TETROMINO_TYPES` from
`./tetrominoes`. One `describe("createSevenBag", …)`:
1. **AC clause 1** — two bags, same seed, 100 draws each → `toEqual` (byte-identical array).
2. **AC clause 2** — chunk a long draw sequence (e.g. 140 = 20 bags) into aligned windows of 7;
   each window, as a set, equals the set of all 7 ids (permutation: size 7, covers every id).
3. coverage — every id from `TETROMINO_TYPES` appears within the first window (subsumed by 2,
   kept as an explicit readable check).
4. different seeds → sequences differ (probabilistic but effectively certain over 100 draws).
5. each returned id is a member of `TETROMINO_TYPES` (type/range sanity).

Local helpers: `drawN(bag, n)` → `TetrominoType[]`; `chunk(arr, size)` → `T[][]`.

## Ordering of changes (why this order)

1. `lib/rng.ts` — the leaf primitive; nothing else compiles against it yet, lands first.
2. `lib/rng.test.ts` — lock the primitive's determinism before building on it.
3. `lib/bag.ts` — depends on (1) and existing `tetrominoes.ts`.
4. `lib/bag.test.ts` — proves the AC end-to-end.
5. Full-suite `test` + `lint` + `build` gate, then `progress.md`, then `review.md`.

Each of (1)+(2) and (3)+(4) is an atomic, independently-verifiable commit (source + its test).
