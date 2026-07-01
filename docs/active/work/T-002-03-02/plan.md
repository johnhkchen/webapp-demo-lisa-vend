# Plan — T-002-03-02 line-based-scoring

## Testing strategy

Pure scalar function ⇒ unit tests only (Vitest, colocated `lib/scoring.test.ts`). No board
fixtures, no integration test at this layer — end-to-end scoring through the reducer is
T-002-03-03's concern, and cross-run determinism of `score` is T-002-03-04's. Verification
criterion for this ticket: `npm run test` green (all suites, including the new one) and
`npm run lint` clean (the `lib/**` no-framework boundary must stay satisfied — `scoring.ts`
imports nothing from React/Next).

## Steps

### Step 1 — Implement `lib/scoring.ts`

- Add module docstring: purpose, purity/`lib/**` boundary, upstream (`clearLines` count) and
  downstream (T-002-03-03 reducer, not wired here), and the base-table note.
- Export `LINE_CLEAR_BASE = [0, 40, 100, 300, 1200] as const`.
- Export `scoreFor(lines, level = 1)` with the totality guard
  (`!Number.isInteger(lines) || lines < 1 || lines >= LINE_CLEAR_BASE.length` → `0`),
  else `LINE_CLEAR_BASE[lines] * level`.
- Verify: `npx tsc --noEmit` (or rely on the test run's type-check) shows no type errors.

### Step 2 — Write `lib/scoring.test.ts`

- Cover the four `describe` groups from Structure:
  1. base tiers — `0→0`, `1→40`, `2→100`, `3→300`, `4→1200` (table-driven; the AC's each
     tier + zero-for-no-clear).
  2. level factor — default = 1; linear scaling (`(1,2)→80`, `(4,3)→3600`, `(3,10)→3000`);
     `level 0 → 0`.
  3. out-of-range lines — `5`, `-1`, `2.5` → `0`, and assert results are finite (never
     `NaN`).
  4. `LINE_CLEAR_BASE` equals `[0,40,100,300,1200]`.
- Run `npm run test`; confirm the new suite passes and no existing suite regresses.

### Step 3 — Lint + full verification

- `npm run lint` → 0 warnings (`--max-warnings 0`).
- `npm run test` → all green.
- Commit both files together.

## Commit

Single atomic commit (one logical unit):

```
feat(T-002-03-02): add line-based scoreFor (40/100/300/1200 × level) with vitest
```

Matches the repo's `feat(T-...): <summary> with vitest` convention (see recent log:
`feat(T-002-03-01): add clearLines ... with vitest`).

## Risks / mitigations

- **Level-factor convention ambiguity** (AC says "times level factor" without pinning the
  origin). Mitigated by the Design decision: 1-based `level`, default 1, base table at the
  default; docstring records the NES `+1` mapping so T-002-03-03 wires it unambiguously.
- **Silent `NaN` from a bad `lines`.** Mitigated by the integer/range guard returning `0`,
  with an explicit out-of-range test asserting finiteness.
- **Scope creep into the reducer.** Mitigated by keeping `scoring.ts` free of any board/
  state import and doing no wiring — the reducer ticket owns accumulation.

## Definition of done

- `lib/scoring.ts` and `lib/scoring.test.ts` created.
- AC satisfied: `scoreFor` returns 40/100/300/1200 (× level factor) and 0 for a no-clear
  lock, each asserted by a test.
- `npm run test` and `npm run lint` both pass.
- `review.md` written; no changes to sibling tickets/files.
