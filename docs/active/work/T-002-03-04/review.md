# T-002-03-04 — Review: determinism-test-harness

## Summary

Adds an end-to-end determinism proof for the game-core reducer: *same seed + same input
sequence ⇒ identical outcome.* This is the keystone property of epic E-002 (reproducible RNG,
pure lib API) and the last ticket of story S-002-03. Test-only — no production `lib/` code was
touched, honoring the scope boundary in `game.ts` that defers a serializable bag to a later
refactor.

## Changes

**Created**
- `lib/determinism.test.ts` — the harness (4 tests + helpers), ~135 lines.

**Modified** — none (production engine already complete for this scope).

**Work artifacts**
- `docs/active/work/T-002-03-04/{research,design,structure,plan,progress,review}.md`.

## How it proves determinism

The engine's only entropy source is the seed threaded through the 7-bag; every other primitive
is a pure copy-on-write function. The harness runs two *independent* games from one seed
through a fixed 177-input script and asserts they converge. Two complications shaped the
design (both documented in the test's docstring):

1. `GameState.bag` is a live closure → whole-state `toEqual` would fail on the function
   reference. Solved with `snapshot()`, a bag-excluding projection (board, active,
   score/lines/level, gameOver) compared by deep-equality.
2. `step` mutates the bag → each state is run through the script exactly once, and the bag's
   stream position (the AC's "piece-sequence state") is probed *after* the run via `drawIds`,
   comparing the next 14 ids from each game.

## Test coverage

| Test | Asserts |
|------|---------|
| `same seed + same script ⇒ deep-equal final board, score, and piece-sequence state` | **The AC.** `toEqual` snapshot (board + score + scalars + active) and `toEqual` on 14 drawn ids; plus an eventfulness guard. |
| `stays identical at every step, not just at the end` | Snapshots match at every index — pinpoints first divergence. |
| `diverges for a different seed` | Different seeds ⇒ different streams — equality is non-vacuous. |
| `a lateral input is a pure function of state` | Laterals carry no hidden entropy. |

- Full suite: **119 tests / 12 files pass**. Lint clean (`--max-warnings 0`).
- **Bite-tested**: perturbing one run's seed makes the AC test fail; reverting restores green.
  The assertion is load-bearing.

## Open concerns / limitations

- **Fixed script, not fuzzed.** A single scripted sequence proves determinism for one path,
  not the whole input space. Adequate for the keystone property and keeps the test itself
  deterministic (no `Math.random`). A property-based sweep over random scripts+seeds is a
  reasonable future enhancement but out of scope here.
- **Snapshot is hand-maintained.** If `GameState` gains a field, `Snapshot`/`snapshot()` must
  be updated deliberately (comment flags this). A serializable bag would collapse this into a
  single whole-state `toEqual` — deferred with the planned RNG/bag refactor (`game.ts:28`).
- **Eventfulness guard is coarse** — it asserts settled cells exist after the run (locks
  happened), not a specific score/line-clear count, to stay robust to the seed's exact
  outcome. Sufficient to catch a descent/lock short-circuit regression.

## Handoff

Nothing blocking. The property is now guarded in CI via `npm test`. No human action required
beyond normal review of `lib/determinism.test.ts`.
