# Progress — T-003-02-01 raf-gravity-tick

## Status: complete

All AC met, full suite green (143 tests), `npm run lint` clean, `npm run build` passes.

## Commits

1. `feat(T-003-02-01): add useAnimationFrameLoop — fixed-interval rAF tick via time accumulator`
   - `components/useAnimationFrameLoop.ts` + `.test.ts` (5 tests).
2. `feat(T-003-02-01): drive gravity — mount rAF tick loop in GameContainer`
   - `components/useGame.ts` (add `GRAVITY_INTERVAL_MS`), `components/GameContainer.tsx` (wire loop),
     `components/useGame.gravity.test.ts` (3 tests).

## Plan vs. reality — the one meaningful deviation

**Planned:** add a new `tick()` method to `useGame` and expose the state setter (the prior ticket
had deferred it).

**Reality:** while this ticket was in flight, the sibling keyboard ticket **T-003-03-01** landed
first on the shared branch and already added the setter *and* a generic **`dispatch(input: Input)`**
to `useGame`, plus the keydown wiring in `GameContainer`. Its `GameContainer` docblock even names
T-003-02-01 as the ticket that "hangs the rAF gravity loop off the same `dispatch`."

**Decision:** reuse `dispatch("tick")` instead of adding a duplicate `tick()`. Rationale:
- DRY — `"tick"` is already a first-class `Input` in the core; a second advance method would be a
  redundant alias of `dispatch("tick")`.
- Smaller footprint on the concurrently-edited `useGame.ts`/`GameContainer.tsx` (the missing
  dependency edge the RDSPI workflow warns about — the commit lock serialized us, but a minimal
  additive change is the safer merge either way).
- The design's core reasoning still holds verbatim: functional-updater dispatch (already how
  T-003-03-01 wrote `dispatch`) means no stale closure, and `dispatch` is a stable `useCallback`, so
  the rAF loop never re-subscribes.

Net change to `useGame.ts` shrank to a single additive export (`GRAVITY_INTERVAL_MS`); the loop is
wired in `GameContainer` as `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS)`.

## Second deviation — lint fix (react-hooks/refs)

Design/structure showed the latest-callback ref synced with a bare `onTickRef.current = onTick`
during render. ESLint's `react-hooks/refs` rejects mutating a ref during render. Moved the sync into
a `useLayoutEffect` (runs after commit, before the next frame fires) — same guarantee (newest
callback wins, loop re-subscribes only on `intervalMs`/`active` change), lint-clean. This is the
standard "latest ref" pattern.

## Test fixes during implementation

- Empty board cells are `null` (`lib/types.ts` `Cell = TetrominoType | null`), not the DOM's
  `"empty"` string — corrected the settled-cell filter in the lock/spawn test.
- The lock/spawn assertion first compared the spawned piece against the *original spawn* position of
  the first piece (y≈0) instead of its *settled* cells; fixed to compare against the actual settled
  cells' min-y (removed the now-unused `firstPiece` local).

## Not done (out of scope, by design)

- No soft/hard-drop keys (T-003-03-02), no level-scaled gravity speed (later epic), no pause UI
  (the `active` flag on `useAnimationFrameLoop` is the seam, left at its default).
- Strict-Mode × live-bag dev-only tension left as-is and documented — see `review.md`.
