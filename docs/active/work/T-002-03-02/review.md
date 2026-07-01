# Review — T-002-03-02 line-based-scoring

## Summary

Added a pure, framework-free line-clear scoring primitive to the `lib/` game core.
`scoreFor(lines, level = 1)` maps a cleared-row count to the standard
single/double/triple/tetris award — **40 / 100 / 300 / 1200** — scaled by a level factor,
and returns **0** for a no-clear lock. Backed by the `LINE_CLEAR_BASE` constant and a
7-case Vitest suite. No existing files touched; no wiring into any reducer (that is
T-002-03-03's job, which `depends_on` this ticket).

## Files changed

| File | Action | Notes |
|---|---|---|
| `lib/scoring.ts` | created | `LINE_CLEAR_BASE` + `scoreFor`; ~45 lines incl. docstrings |
| `lib/scoring.test.ts` | created | 7 tests, 4 `describe` groups |

Commit: `7870d24 feat(T-002-03-02): add line-based scoreFor (40/100/300/1200 × level) with vitest`

## Acceptance criteria

> scoreFor(lines) returns the standard 40/100/300/1200 values (times level factor) and a
> test asserts each tier and zero for a no-clear lock.

✅ **Met.**
- `scoreFor(1..4)` → `40/100/300/1200` at the default level 1; `scoreFor(n, level)` scales
  linearly (`base × level`). Each tier asserted (`scoreFor — base tiers`,
  `scoreFor — level factor`).
- `scoreFor(0)` → `0` — the no-clear lock, asserted explicitly.

## Test coverage

`npm run test` → **10 files, 106 tests passed** (7 new). `npm run lint` clean.

Covered:
- Each base tier 1/2/3/4 and the zero case (AC).
- Level factor: default = 1, linear scaling across several `(lines, level)` pairs,
  `level 0 → 0`.
- Defensive totality: `lines ∈ {5, -1, 2.5, NaN}` → `0` and finite (no `NaN` leakage).
- `LINE_CLEAR_BASE` shape locked to `[0, 40, 100, 300, 1200]`.

Gaps (intentional, out of scope): no reducer-level accumulation test (T-002-03-03), no
cross-run determinism test (T-002-03-04). These belong to their own tickets and depend on
this one.

## Design decisions worth a reviewer's eye

- **Level convention: 1-based `level`, default 1, `base × level`.** Reconciles the AC's
  one-arg `scoreFor(lines)` (returns the base table) with "times level factor". Maps to
  NES's `base × (level + 1)` as `level = NES_level + 1`; documented in the docstring so
  T-002-03-03 can pick a level origin unambiguously. **This is the main thing to confirm**
  — if the reducer/level ticket prefers a 0-based `level`, that ticket adjusts at the call
  site (or we revisit here); the base table itself is not in question.
- **Out-of-range `lines` → 0 rather than throw.** `clearLines` only ever emits 0..4, but
  a scoring primitive that returns `0` for a bad/no count composes more safely in an
  accumulator than one that throws or leaks `NaN`. Guard is `!Number.isInteger(lines) ||
  lines < 1 || lines >= LINE_CLEAR_BASE.length`.
- **`level` not clamped.** A negative/zero `level` scales proportionally. Legal-range
  enforcement (levels start at 1) is a game-rules concern for the reducer, not this pure
  helper.

## Open concerns / follow-ups

- None blocking. The single item needing downstream alignment is the **level origin**
  convention above — flagged for whoever implements T-002-03-03.
- Scope deliberately excludes soft/hard-drop bonuses, combo/back-to-back, and T-spin
  scoring; none are "line-based scoring" and none are ticketed here.

## Verification commands

```
npm run test   # 106 passed (10 files)
npm run lint   # clean, 0 warnings
```
