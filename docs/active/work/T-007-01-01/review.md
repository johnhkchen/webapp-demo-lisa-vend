# Review — T-007-01-01 seven-bag-lookahead-peek

## Summary

Added non-consuming lookahead to the pure 7-bag: `SevenBag.peek(n)` returns the next `n` piece ids
without advancing the stream. Implemented by refactoring `createSevenBag` from a pop-on-demand
`queue` to a **buffer-backed generator** where `next()` and `peek()` read one shared buffer and
`rand` is advanced in exactly one place (buffer growth). This makes the non-mutation property
structural rather than defensively maintained.

## Files changed

| File | Change | Notes |
|------|--------|-------|
| `lib/bag.ts` | modified | `SevenBag` gains `peek(n)`; internal `queue`→`buffer` + private `ensure(n)`; docs updated. No new imports; stays pure/framework-free. |
| `lib/bag.test.ts` | modified | New `describe("SevenBag.peek")` (6 property/edge cases). Existing tests unchanged. |

One production file, one test file. No changes to `rng.ts`, `game.ts`, `types.ts`, `tetrominoes.ts`.

Commit: `97972dd feat(bag): add non-consuming peek(n) lookahead`.

## Acceptance criteria

> lib/bag.ts exposes peek(n) with a passing property test asserting peek(n) equals the next n
> next() draws for any seed, and that peek does not mutate the stream (bag.test.ts green).

- ✅ `peek(n)` exposed on `SevenBag`.
- ✅ Property test: `peek(n)` equals the next `n` `next()` draws — iterated over 10 seeds
  (incl. 0, negative, fractional, large) × `n ∈ 0..21`, spanning multiple refill boundaries.
- ✅ Property test: peek does not mutate the stream — post-peek draws match a never-peeked
  same-seed sibling over 50 draws, including interleaved peeks of size 1/7/15.
- ✅ `bag.test.ts` green.

## Test coverage

- **New**: peek/next agreement, non-mutation, interleaved peek-after-draw, idempotence, `n<=0 ⇒ []`
  (non-advancing), returned-array copy-safety.
- **Regression**: full suite green — 18 files, **169 tests**. Notably `determinism.test.ts`
  (identical streams across runs) and `game.test.ts` (spawns from `bag.next()`) confirm the
  refactor is behavior-preserving.
- **Lint/typecheck**: `npm run lint` clean at `--max-warnings 0`.

### Coverage gaps / judgment calls

- **Large-`n` memory**: `peek(n)` eagerly buffers ⌈n/7⌉ future bags. Bounded by the caller and
  trivial for realistic preview sizes (n ≤ ~6). Not separately tested for pathological `n`; deemed
  out of scope for a preview primitive.
- **Non-integer `n`** (e.g. `peek(2.5)`): not explicitly tested. `ensure`/`slice` would treat it via
  JS numeric semantics; `slice(0, 2.5)` yields 2 items while `ensure(2.5)` buffers ≥3 — harmless but
  undefined by contract. Callers are expected to pass non-negative integers. Could add a guard if a
  caller ever needs defined fractional behavior.

## Open concerns / handoff notes

- **No behavioral change to `next()`** — verified by the unchanged determinism/game tests. Reviewers
  can trust existing piece sequences are byte-identical.
- **`peek` is intentionally not yet wired into the UI.** The next-preview integration is downstream
  E-007 work; keeping this ticket to the pure primitive avoids a shared-file collision with
  rendering tickets (clean DAG edge). See `design.md`.
- **No critical issues.** Change is local, additive, and fully covered.
