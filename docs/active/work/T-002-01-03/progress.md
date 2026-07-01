# Progress — T-002-01-03: seeded-rng-and-seven-bag

Running log of the Implement phase. No deviations from `plan.md`.

## Completed

- **Step 1 — `lib/rng.ts`** ✓ Seeded mulberry32 PRNG. Exports `RandomFn` type and
  `mulberry32(seed): RandomFn` (float in `[0,1)`, `seed >>> 0` normalization, closure state).
- **Step 2 — `lib/rng.test.ts`** ✓ Determinism, `[0,1)` range, seed divergence, state-advances,
  seed normalization (0/negative/fractional), two-instance independence. 6 `it` blocks.
  - **Commit 1** `6c777b3` — `feat(T-002-01-03): add seeded mulberry32 PRNG with vitest`.
- **Step 3 — `lib/bag.ts`** ✓ 7-bag generator. Private `shuffle` (Fisher–Yates, copies input),
  `SevenBag` interface, `createSevenBag(seed)` with refill-on-empty queue. Consumes `mulberry32`
  + `TETROMINO_TYPES`.
- **Step 4 — `lib/bag.test.ts`** ✓ AC clause 1 (two bags, same seed, 100 draws, `toEqual`);
  AC clause 2 (20 aligned 7-windows each a permutation of all 7 ids); first-bag coverage;
  seed divergence; membership in the alphabet. 5 `it` blocks.
  - **Commit 2** `d142d0e` — `feat(T-002-01-03): add reproducible seeded 7-bag generator with vitest`.
- **Step 5 — Verification gate** ✓
  - `npm run test` → **23 passed** (4 files); prior 12 + rng (6) + bag (5).
  - `npm run lint` → exit 0, no output (`lib/` purity holds).
  - `npm run build` → success; `/` + `/_not-found` prerendered static.
- **Step 6 — Artifacts** ✓ this file; `review.md` next.

## Deviations

None. Surface stayed minimal (`mulberry32` + `createSevenBag`); no `peek()` / immutable-state,
per Design decisions 2 & 5.

## Remaining

Only `review.md`, then stop (Lisa handles phase/status transitions).
