# T-008-01-02 — Progress: placement-heuristic

## Status: complete

All plan steps executed as written; no deviations.

| Step | Outcome |
|------|---------|
| 1. `lib/bot-heuristic.ts` | Created. `BoardFeatures`, `WEIGHTS`, `boardFeatures`, `evaluate`. |
| 2. `lib/bot-heuristic.test.ts` | Created. 11 tests across 3 describe blocks. |
| 3. Verify | `npm test` → **268 passed / 26 files**; `npm run lint` clean (`--max-warnings 0`); `npm run build` succeeds. |
| 4. Commit | `5bf0538` — single atomic commit (both files + artifacts). |
| 5. Artifacts | progress.md (this) + review.md. |

## What was built

- `evaluate(board): number` — weighted sum of the four features; higher = better.
- `boardFeatures(board): BoardFeatures` — `{ aggregateHeight, holes, bumpiness, completedLines }`,
  single-pass extraction.
- `WEIGHTS` — the GA-tuned reference constants (`as const` record).

## Deviations from plan

None. Followed Decision 1 (score the lock-only / pre-collapse board, count full rows in place),
Decision 2 (export `evaluate` + `boardFeatures` + `WEIGHTS`), Decision 3 (GA-tuned weights).

## Verification snapshot

- New file `bot-heuristic.test.ts`: 11 tests green (acceptance ×2, per-feature ×5, weighting &
  purity ×4).
- Full suite up from 257→268 tests, 25→26 files (the seam ticket left it at 257/25).
- Lint and production build both clean.
