# Research — T-007-01-01 seven-bag-lookahead-peek

## Ticket in one line

Extend the pure `SevenBag` with a **non-consuming lookahead** (`peek(n)`) so callers can read
ahead in the piece stream without advancing it — the named precursor the next-preview truthfully
depends on. Advances P4, P5, and unblocks E-007's bag-lookahead prereq.

## Relevant files

- `lib/bag.ts` — the subject. Defines `SevenBag` interface (`{ next(): TetrominoType }`) and
  `createSevenBag(seed)`. ~60 lines, pure, framework-free (enforced by the `lib/**` eslint
  boundary). Internal state is a single mutable `queue: TetrominoType[]` plus a closed-over
  `rand: RandomFn`. Draws `queue.shift()`; refills via `shuffle(TETROMINO_TYPES, rand)` when empty.
- `lib/bag.test.ts` — existing coverage: reproducibility, aligned-window permutation, first-bag
  coverage, seed divergence, alphabet membership. Uses a plain seed-loop style (no fast-check).
- `lib/rng.ts` — `mulberry32(seed): RandomFn`, deterministic uint32-seeded stream. The bag's only
  entropy source. Stateful closure; each `rand()` call advances it.
- `lib/tetrominoes.ts` — `TETROMINO_TYPES` (readonly array of the seven ids).
- `lib/types.ts` — `TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L"`.
- `lib/game.ts` — the one production consumer. Holds `bag: SevenBag` in `GameState`; calls
  `bag.next()` in `createInitialState` (line 92) and on lock/respawn (line 116). Does **not** yet
  call `peek`.
- `lib/determinism.test.ts` — probes a run's bag via `s.bag.next()` (mutating) to compare streams.

## How the stream works today

`createSevenBag(seed)` closes over `rand` and `queue`. `next()`:
1. If `queue` is empty, `queue = shuffle(TETROMINO_TYPES, rand)` — this **consumes `rand`**
   (Fisher–Yates makes 6 `rand()` calls per refill).
2. Returns `queue.shift()!`.

The stream's future is therefore determined by two pieces of state: the residual `queue` and the
position of the `rand` closure. To look ahead past the current bag, you must run the shuffle for
the *next* bag — which consumes `rand`. This is the crux: a naive peek that shuffles ahead would
advance `rand` and corrupt subsequent `next()` draws.

## The core constraint

**`peek(n)` must not mutate the observable stream.** After `peek(n)`, the very next `next()` (and
all draws after it) must return exactly what they would have returned had `peek` never been called.
The acceptance test asserts `peek(n)` equals the next `n` `next()` draws for any seed, and that
peek does not mutate the stream.

Two sub-cases:
- `n` within the current residual `queue`: trivially non-mutating — just read `queue.slice(0, n)`.
- `n` beyond the residual queue: requires generating future bags, which advances `rand`. Any
  correct implementation must either (a) buffer generated pieces so `rand` is only ever advanced
  once per bag and the buffer is drained by `next()`, or (b) snapshot/restore `rand` state.

## Constraints & assumptions

- **Purity**: no wall clock, no `Math.random`; determinism is the whole contract (`docs/deploy`,
  `determinism.test.ts`). Same seed ⇒ identical sequence, and that must hold whether or not `peek`
  is interleaved.
- **`rand` is not snapshottable from outside** — `mulberry32` returns an opaque closure with no
  exposed state. So approach (b) would require changing `rng.ts`. Approach (a) (buffering) keeps
  the change local to `bag.ts`.
- **Interface stability**: `SevenBag` is consumed in `game.ts` and tests as `{ next() }`. Adding a
  method is backward-compatible; changing `next`'s behavior is not.
- **No fast-check dependency** — property tests are written as seed loops (see `bag.test.ts`,
  `determinism.test.ts`). New tests should match that idiom.
- `n = 0` should return `[]`; negative/`n` semantics are an open design question (see design).

## Existing test idioms to mirror

- `drawN(bag, n)` helper, `chunk`, `ALL_IDS = [...TETROMINO_TYPES].sort()`.
- Reproducibility asserted by building two bags from the same seed and comparing arrays.
- Divergence asserted across seeds `1` vs `2`.

## Risks

- **`rand`-advance leakage**: the single biggest correctness trap. A buffer must be the *only* path
  that consumes `rand`, and `next()` must drain the buffer rather than re-shuffle.
- **Aliasing**: returning the internal buffer array by reference would let a caller mutate bag
  state. `peek` must return a copy.
- The existing aligned-window permutation invariant must still hold after refactor.
