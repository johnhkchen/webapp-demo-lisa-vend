# T-002-03-04 — Progress: determinism-test-harness

## Status: complete

All plan steps executed. No production `lib/` code changed (test-only ticket, as designed).

## Completed

- **Step 1 — scaffold + helpers.** Created `lib/determinism.test.ts` with module docstring,
  `Snapshot` type, `snapshot()`, `run()`, `runTrace()`, `drawIds()`, `ticks()`, and the fixed
  `SCRIPT` (177 inputs: seven ~22-tick runs interleaved with laterals/rotations, enough to lock
  and respawn many pieces across ≥1 bag refill).
- **Step 2 — AC test.** `same seed + same script ⇒ deep-equal final board, score, and
  piece-sequence state`: two independent runs from one seed, `toEqual` on the bag-excluding
  snapshot (board + active + score/lines/level + gameOver), then `toEqual` on the next 14 drawn
  ids from each bag (piece-stream parity), plus an "eventful run" guard (settled cells exist).
- **Step 3 — step-by-step convergence.** `stays identical at every step, not just at the end`:
  compares snapshots at every index with a per-index failure message.
- **Step 4 — divergence + purity.** `diverges for a different seed` (piece streams differ, so
  equality isn't vacuous) and `a lateral input is a pure function of state`.
- **Step 5 — gate.** `npm test` → 12 files / 119 tests pass. `npm run lint` clean.

## Verification performed

- Full suite green: **119 passed (12 files)**.
- Lint: clean under `--max-warnings 0`.
- **Bite check**: temporarily perturbed one run's seed (`seed + 1`) → the AC test failed as
  expected; reverted → all 4 pass. Confirms the equality assertions are load-bearing, not
  vacuous.

## Deviations from plan

None material. The `SCRIPT` spine matches the structure sketched in structure.md; the
"eventful" guard is implemented as "at least one settled cell exists after the run" (proves
locks happened) rather than a score/line threshold, to stay robust to the exact seed's
outcome while still catching a descent/lock regression.

## Follow-ups (out of scope, noted for later)

- A serializable bag (`game.ts:28`) would let a future version deep-equal whole `GameState`s
  in one assertion instead of snapshot + stream probe — deferred to the planned RNG refactor.
