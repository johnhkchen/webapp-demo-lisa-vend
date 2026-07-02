# Structure — T-007-01-01 seven-bag-lookahead-peek

## Files

| File | Change | What |
|------|--------|------|
| `lib/bag.ts` | modify | Add `peek(n)` to `SevenBag`; refactor `createSevenBag` to a buffer-backed generator with a private `ensure(n)`. |
| `lib/bag.test.ts` | modify | Add property tests for peek/next agreement and peek non-mutation; keep existing tests. |

No new files. No deletions. No changes to `rng.ts`, `game.ts`, `types.ts`, or `tetrominoes.ts`.

## `lib/bag.ts` shape

### Interface (public)

```ts
export interface SevenBag {
  /** Draw and consume the next id, refilling internally when the bag empties. */
  next(): TetrominoType;
  /**
   * Return the next `n` ids WITHOUT consuming them. peek(n) equals the ids the following n
   * next() calls will return. Non-mutating: draws after a peek are unchanged. n <= 0 ⇒ [].
   * Returns a fresh array (never the internal buffer).
   */
  peek(n: number): TetrominoType[];
}
```

### Internal organization of `createSevenBag`

- Keep closed-over `rand: RandomFn` and rename the residual store to `buffer: TetrominoType[]`
  (semantics: already-generated, not-yet-consumed ids, in draw order).
- Private helper `ensure(n)`: while `buffer.length < n`, append a fresh `shuffle(TETROMINO_TYPES,
  rand)`. This is the **only** site that consumes `rand`. Guarantees `buffer.length >= n` on return
  (for `n <= a few bags`; grows by 7 each iteration).
- `next()`: `ensure(1); return buffer.shift()!`.
- `peek(n)`: `if (n <= 0) return []; ensure(n); return buffer.slice(0, n)`.
- Keep the existing `shuffle` helper and doc comments; update the module doc comment to mention
  non-consuming lookahead and the single-generation-path guarantee.

### Boundaries

- `bag.ts` stays a leaf over `rng.ts` + `tetrominoes.ts` + `types.ts`. No new imports.
- Purity/framework-free boundary unchanged (no React/Next).

## `lib/bag.test.ts` additions

Reuse existing helpers (`drawN`, `chunk`, `ALL_IDS`). Add a small seed list for property-style
iteration, e.g. `const SEEDS = [0, 1, 2, 5, 42, 1337, 20260701, -7, 999999]`.

New `describe("SevenBag.peek", ...)` cases:

1. **peek(n) equals the next n draws, for many seeds and many n** — for each seed, for `n` in a
   range (e.g. 0..20), build bag, `const seen = bag.peek(n)`, then `drawN(bag, n)` and assert equal.
   Use a fresh bag per (seed, n) so the assertion is clean. Crosses the 7/14 refill boundary.
2. **peek does not mutate the stream** — two bags from the same seed; on bag A call `peek(k)` (and a
   few interleaved peeks), then compare `drawN(A, 50)` to `drawN(B, 50)`. Must be identical.
3. **peek is idempotent** — repeated `peek(n)` on the same bag (no `next` between) returns equal
   arrays.
4. **peek beyond current bag agrees across refill** — `peek(10)` then `drawN(10)` equal (spans two
   bags), asserting `rand` isn't double-advanced.
5. **edge cases** — `peek(0)` → `[]`; `peek(-3)` → `[]`; returned array is a copy (mutating it does
   not affect subsequent draws).
6. **interleaved peek/next** — draw a few, peek, draw more; assert peeked ids match the draws that
   follow the peek.

## Ordering of changes

1. Refactor `bag.ts` internals to buffer-backed `next()` (behavior-preserving) — existing tests
   must stay green.
2. Add `peek` to interface + implementation.
3. Add new tests.
4. Run full `lib/` suite (`bag`, `determinism`, `game`) to confirm no regression.
