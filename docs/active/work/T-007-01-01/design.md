# Design — T-007-01-01 seven-bag-lookahead-peek

## Goal

Add `peek(n): TetrominoType[]` to `SevenBag` that returns the next `n` ids **without advancing the
stream**, such that for any seed and any interleaving, `peek(n)` equals the `n` ids the following
`next()` calls would produce. Keep `bag.ts` pure and local; do not touch `rng.ts`.

## Options considered

### Option A — Buffer-backed queue (chosen)

Refactor the internal `queue` from a pop-on-demand array into a **materialized buffer** that both
`next()` and `peek()` read from. A private `ensure(n)` grows the buffer by appending freshly
shuffled bags until it holds at least `n` ids. `rand` is advanced **only** inside `ensure`, one
shuffle per bag, and the results are retained — so looking ahead and then drawing returns the same
ids the buffer already generated.

- `next()` → `ensure(1); return buffer.shift()!`
- `peek(n)` → `ensure(n); return buffer.slice(0, n)` (a copy — no aliasing)

Because every id `rand` ever produces lands in the buffer and is consumed in order, `peek` cannot
desynchronize from `next`: they read the same array.

**Pros**: correctness falls out structurally (single generation path, no state duplication); change
is confined to `bag.ts`; `rand` advanced exactly as before per bag; O(n) peek, O(1) amortized next.
**Cons**: `peek(n)` for large `n` eagerly generates ⌈n/7⌉ bags of future pieces held in memory —
negligible for realistic previews (n ≤ ~6) and bounded by the caller.

### Option B — Snapshot/restore `rand` state

Expose `mulberry32`'s internal `a` so the bag can snapshot it, run a throwaway shuffle to peek, then
restore. **Rejected**: forces a breaking change to the `rng.ts` public surface (leaking generator
internals) for a feature that lives in `bag.ts`; error-prone (must snapshot/restore both `rand` and
`queue` around every peek); no upside over A. Violates "keep the change local."

### Option C — Re-derive from seed on each peek

Rebuild a fresh throwaway bag from the seed, fast-forward past already-drawn pieces, and read ahead.
**Rejected**: requires the bag to remember how many pieces it has drawn and re-run all prior
shuffles on every peek (O(drawn) per peek); duplicates the generation logic; fragile against any
future change to draw semantics. Strictly worse than A.

### Option D — Pre-generate a fixed lookahead window

Always keep, say, 7 pieces buffered. **Rejected as the primary design** — it's just Option A with a
hardcoded minimum. A caps generation at exactly what's asked; a fixed window is an arbitrary policy
that belongs to the caller, not the primitive. (Option A naturally supports any window the caller
wants by passing `n`.)

## Decision

**Option A — buffer-backed queue.** It makes the non-mutation property structural rather than
defended: `peek` and `next` read one buffer, and `rand` is touched in exactly one place. It is the
minimal, local change and preserves every existing invariant (same per-bag shuffle cadence ⇒
identical sequences ⇒ `determinism.test.ts` and existing `bag.test.ts` stay green).

## Semantics decisions

- `peek(0)` → `[]`.
- `peek(n)` for `n < 0` → treat as `0` (return `[]`) rather than throw. Rationale: matches the
  forgiving, total-function style of the rest of `lib/` (e.g. `mulberry32` normalizes any seed);
  a preview caller clamping to 0 is more useful than a throw. Documented in the doc comment.
- `peek(n)` returns a **fresh array** (via `slice`) — never the internal buffer — so callers cannot
  mutate bag state.
- Return length is always exactly `min-guaranteed n` (buffer is grown to satisfy `n`), so
  `peek(n).length === n` for `n ≥ 0`.

## Invariants preserved

- **Reproducibility**: two bags, same seed ⇒ identical `next()` streams (buffer generation is
  deterministic; `rand` cadence unchanged).
- **Aligned-window permutation**: each freshly appended bag is a full permutation, unchanged.
- **peek/next agreement**: `peek(n)` ≡ next `n` `next()` — the new property test.
- **peek non-mutation**: draws after a peek are identical to draws without it — the new property
  test builds two same-seed bags, peeks one, then compares full `next()` streams.

## Why not add peek to `game.ts` now

Out of scope. The ticket's acceptance criterion is purely about `lib/bag.ts` + `bag.test.ts`.
Wiring the preview UI to `peek` is a downstream E-007 story. Keeping this ticket to the primitive
keeps the DAG edges clean (no shared-file collision with rendering tickets).
