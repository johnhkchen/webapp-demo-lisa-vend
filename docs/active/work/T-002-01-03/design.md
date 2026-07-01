# Design — T-002-01-03: seeded-rng-and-seven-bag

Options and decisions for the seeded PRNG + 7-bag, grounded in the Research map. Each decision
records what was chosen, why, and what was rejected.

## Decision 1 — PRNG algorithm: **mulberry32**

A tiny, deterministic 32-bit generator seeded from a single integer.

```
function mulberry32(seed) {
  let a = seed >>> 0;                    // normalize to uint32
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;   // float in [0, 1)
  };
}
```

**Why mulberry32:**
- **Single-integer seed.** Matches the AC's "built from the same seed" exactly — the seed *is*
  the entire state. Two calls with the same number produce identical streams, trivially.
- **~6 lines, zero deps.** Consistent with the hand-rolled `lib/` layer (Research: adding
  `seedrandom` would be disproportionate). Nothing to audit but arithmetic.
- **ES2017-safe.** Uses only `Math.imul`, `|0`, `>>>` — all pre-ES2017. No `bigint`.
- **Good enough distribution.** Passes gjrand/small-crush-tier smoke tests; vastly more than a
  Tetris bag shuffle needs. Statistical perfection is irrelevant here — reproducibility is.
- **Self-contained per instance.** State is one local `a`; two generators never share state
  (satisfies the "two independent generators" clause without care).

**Rejected:**
- **`Math.random()`** — not seedable, nondeterministic. Fails the AC outright.
- **`seedrandom` npm package** — a dependency for something that is 6 lines; off-pattern for a
  layer that hand-rolls its board and shape tables.
- **LCG (e.g. `glibc` constants)** — even simpler, but visible low-bit periodicity; the low bit
  alternates, which can bias a modulo-based shuffle index. mulberry32 avoids this for the same
  line count.
- **xorshift128 / sfc32** — excellent quality, but want a 4-word seed to be well-distributed;
  seeding them *well* from one integer needs a splitmix pre-mix step — more code for quality we
  don't need.

## Decision 2 — State model: **closure-encapsulated `next()`**

The generator is a factory returning an object with a `next()` method; state (the PRNG closure
and the current bag remainder) lives in the closure, mutated on each draw.

**Why closure over explicit immutable state:**
- **Ergonomics for the consumer.** The game loop calls `bag.next()` when a piece locks — a
  stream, naturally imperative. An immutable `[piece, nextBag]` API forces every caller to
  thread state manually, which is noise for the one place that draws pieces.
- **Determinism is preserved regardless.** Purity of *output* (same seed → same sequence) does
  not require immutability of *state*; a closure seeded by the argument is fully deterministic
  and has no external side effects. This is "pure" in the sense CLAUDE.md cares about
  (framework-free, testable, no I/O), even though `next()` advances internal state.
- **Matches how `board.ts` reasons** — small, focused, no framework — while accepting that a
  generator is legitimately stateful where `emptyBoard` is not.

**Rejected (for now):**
- **Explicit immutable state** (`draw(state) → { value, state }`, `state` = seed-position +
  bag remainder). More "functional" and trivially serializable for save/replay, but: (a) no
  current consumer needs serialization (Research: seed sourcing + persistence are out of scope),
  and (b) it burdens the single draw site. Documented as the escape hatch if replay/save-state
  is added later — the internal shuffle stays pure, so a wrapper can be swapped in without
  touching the algorithm. **YAGNI applies; revisit when a save-state ticket lands.**
- **`class SevenBag`** — equivalent power; the codebase has no classes and favors factory
  functions returning plain objects. Stay on pattern.

## Decision 3 — Fisher–Yates shuffle (unbiased), refill-on-empty bag

```
function shuffle(items, rand) {              // returns a new array; does not mutate input
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));  // uniform in [0, i]
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

The bag holds a queue; when empty, refill with `shuffle(TETROMINO_TYPES, rand)` and draw from
the front.

**Why:** Fisher–Yates with a fresh uniform index per position yields uniformly-distributed
permutations. Refilling only when empty makes every *aligned* 7-window a full permutation — the
exact AC property. `rand() ∈ [0,1)` ⇒ `Math.floor(rand()*(i+1)) ∈ [0,i]`, never out of range.

**Rejected:** `[...TETROMINO_TYPES].sort(() => rand() - 0.5)` — biased (comparator isn't a
consistent order) and engine-dependent. A textbook trap; avoided.

## Decision 4 — File split: **two modules, `rng.ts` + `bag.ts`**

`lib/rng.ts` owns the PRNG primitive; `lib/bag.ts` owns the 7-bag and depends on `rng.ts`.

**Why:** One concern per file is the established `lib/` pattern (constants / types / board /
tetrominoes are each one concern). The ticket names two deliverables ("rng **and** seven-bag").
The PRNG is independently reusable (future: garbage-line RNG, cosmetic jitter) and independently
testable (its determinism is a distinct property from the bag's permutation property). Splitting
also keeps each test file focused on one property set.

**Rejected:** a single `rng.ts` with the bag inline — fewer files, but couples a reusable
primitive to one consumer and muddies which tests cover which guarantee.

## Decision 5 — Bag API surface: **`next()` only** (minimal)

`createSevenBag(seed)` returns `{ next(): TetrominoType }`.

**Why:** The AC needs only sequential draws. `NextPreview` peeking is a rendering concern in a
later epic (Research, out-of-scope). Adding `peek()`/`take(n)` now is speculative surface with
no consumer to validate its shape. Keep the interface honest to current need; extend when the
preview ticket defines what it actually wants.

**Rejected:** shipping `peek()`/`take(n)` preemptively — YAGNI; risks designing the wrong peek
API before its consumer exists.

## Public API (result of the above)

```ts
// lib/rng.ts
export type RandomFn = () => number;           // yields float in [0, 1)
export function mulberry32(seed: number): RandomFn;

// lib/bag.ts
export interface SevenBag { next(): TetrominoType; }
export function createSevenBag(seed: number): SevenBag;
```

## Test strategy (properties, not pinned outputs)

- **rng.test.ts** — determinism (same seed → identical N-length stream), range (`0 ≤ x < 1`),
  seed-sensitivity (different seeds → different streams), and independence of two instances.
- **bag.test.ts** — the AC directly: two bags from one seed give byte-identical 100-draw
  sequences; each aligned 7-window is a permutation of `TETROMINO_TYPES`; plus overall coverage
  (all 7 appear) and different-seed divergence. Follows the property-oracle style of
  `tetrominoes.test.ts` — assert invariants, don't hardcode the shuffle's magic order.
