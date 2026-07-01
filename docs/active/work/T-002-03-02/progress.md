# Progress — T-002-03-02 line-based-scoring

## Status: complete

All plan steps executed; committed as `7870d24`.

## Completed

- **Step 1 — `lib/scoring.ts`** ✅
  - `LINE_CLEAR_BASE = [0, 40, 100, 300, 1200] as const`.
  - `scoreFor(lines, level = 1)` with the integer/range totality guard → `0` for anything
    outside `1..4`, else `LINE_CLEAR_BASE[lines] * level`.
  - Module + symbol docstrings per house style (purity boundary, upstream `clearLines`
    count, downstream reducer not wired here, NES level-mapping note).
- **Step 2 — `lib/scoring.test.ts`** ✅
  - 7 tests across 4 `describe` groups: base tiers (incl. `0 → 0`), level factor (default,
    linear scaling, `level 0 → 0`), out-of-range lines (`5 / -1 / 2.5 / NaN → 0`, finite),
    and the `LINE_CLEAR_BASE` constant.
- **Step 3 — verification** ✅
  - `npx vitest run lib/scoring.test.ts` → 7 passed.
  - `npm run test` → **10 files, 106 tests passed** (no regressions).
  - `npm run lint` → clean (0 warnings; `lib/**` no-framework boundary satisfied).

## Deviations from plan

None. Implementation matches Structure/Plan exactly. One minor addition beyond the written
test list: `Number.NaN` included in the out-of-range case to explicitly pin the "never
leaks NaN" property (the guard's `Number.isInteger` already covers it; the test documents
it).

## Follow-ups (out of scope, for later tickets)

- **T-002-03-03** (reducer) will call `scoreFor(clearLines(...).cleared, level)` and
  accumulate the running score, and owns the `level` origin + progression.
- **T-002-03-04** (determinism harness) will assert identical `score` across two runs —
  `scoreFor` is deterministic and pure, so it supports that property by construction.
