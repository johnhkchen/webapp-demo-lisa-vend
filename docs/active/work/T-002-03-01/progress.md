# Progress — T-002-03-01 line-clear-detection

## Status: implementation complete, verified green

## Done

- **Step 1 — `lib/line-clear.ts`.** Created. Exports `LineClearResult { cleared, board }`
  and `clearLines(board)`. Filter-then-refill algorithm exactly as designed: keep rows
  that still contain a `null` (survivors), count the rest, prepend that many freshly
  allocated empty rows. House-style module header (purity, coordinate convention, scope
  boundary). Copy-on-write; input never mutated.
- **Step 2 — `lib/line-clear.test.ts`.** Created. Groups: counts (0/1/2/4 — the AC case),
  collapse (drop-by-one + Tetris restack-to-bottom with a marker cell), non-adjacent full
  rows with a sandwiched survivor, dimensions preserved, all-full → all-empty, and purity
  (input-unchanged snapshot + no-alias check on prepended empty rows).
- **Step 3 — Verification.** `npm run test` → **9 files, 99 tests, all passing**.
  `npm run lint` → clean (0 warnings under `--max-warnings 0`).

## Deviations from plan

None. Implemented as specified in `plan.md` / `structure.md`. Did not run a standalone
`npx tsc --noEmit` — the vitest run + eslint (with `eslint-config-next` type-aware rules)
exercise the types, and both are green; a separate typecheck would be redundant.

## Remaining

- Commit (implementation + tests as one atomic `feat(T-002-03-01)` commit).
- No follow-up code in this ticket. Downstream (separate tickets): wire `clearLines` into
  the post-lock game-loop step, and derive score from `cleared` (0/1/2/3/4).
