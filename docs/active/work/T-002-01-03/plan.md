# Plan — T-002-01-03: seeded-rng-and-seven-bag

Ordered, independently-verifiable steps to execute the Structure blueprint. Two atomic commits
(each a source module + its test), then a verification gate and the review handoff.

## Testing strategy

- **Unit, property-based, no pinned magic outputs.** Assert invariants — determinism, `[0,1)`
  range, permutation-per-window, coverage — not the specific shuffle order (which is an artifact
  of mulberry32 and would make the test a change-detector). Mirrors the independent-oracle style
  of `tetrominoes.test.ts`.
- **Directly encode the AC** in `bag.test.ts`: (1) two same-seed bags, 100 draws, `toEqual`;
  (2) aligned 7-windows are each a permutation of all 7 ids.
- **Gate before review:** `npm run test` (whole suite green, not just new files),
  `npm run lint` (`--max-warnings 0`, confirms `lib/` purity), `npm run build` (strict
  whole-tree tsc with test files present). All three must pass.

## Step 1 — `lib/rng.ts` (seeded PRNG primitive)

- Add leading doc comment (purpose, purity, seed contract, mulberry32 rationale, consumed by
  `bag.ts`).
- Export `type RandomFn = () => number`.
- Export `function mulberry32(seed: number): RandomFn` — `seed >>> 0` normalization, closure
  over state, the standard mulberry32 body returning `[0,1)` floats.
- **Verify:** `npx tsc`-clean via later build; nothing imports it yet.

## Step 2 — `lib/rng.test.ts`

- Vitest explicit imports; `take(rand, n)` helper.
- `it` blocks: same-seed identity; range `[0,1)`; different-seed divergence; two-instance
  independence.
- **Verify:** `npm run test` — new `mulberry32` suite green; existing 12 still green.
- **Commit 1:** `feat(T-002-01-03): add seeded mulberry32 PRNG with vitest` (`lib/rng.ts`,
  `lib/rng.test.ts`).

## Step 3 — `lib/bag.ts` (7-bag generator)

- Leading doc comment (7-bag rule, aligned-window permutation property, purity, consumes
  `mulberry32` + `TETROMINO_TYPES`, yields ids only).
- Module-private `shuffle(items, rand)` — pure Fisher–Yates, copies input, `Math.floor(rand()*(i+1))`.
- Export `interface SevenBag { next(): TetrominoType }`.
- Export `createSevenBag(seed)` — builds `mulberry32(seed)`, closure `queue`, refill-on-empty,
  `queue.shift()!` with a comment justifying the non-null assertion.
- **Verify:** build-clean.

## Step 4 — `lib/bag.test.ts`

- Vitest explicit imports; import `createSevenBag` from `./bag`, `TETROMINO_TYPES` from
  `./tetrominoes`; `drawN(bag, n)` + `chunk(arr, size)` helpers.
- `it` blocks: AC clause 1 (two bags, same seed, 100 draws, `toEqual`); AC clause 2 (each
  aligned 7-window is a permutation of all 7 ids over ~20 bags); coverage in first window;
  different-seed divergence; every id ∈ `TETROMINO_TYPES`.
- **Verify:** `npm run test` — new `createSevenBag` suite green; whole suite green.
- **Commit 2:** `feat(T-002-01-03): add reproducible seeded 7-bag generator with vitest`
  (`lib/bag.ts`, `lib/bag.test.ts`).

## Step 5 — Verification gate

- `npm run test` → all suites green (expect 12 baseline + new rng + bag tests).
- `npm run lint` → exit 0, no warnings (confirms no React/Next import crept into `lib/`).
- `npm run build` → succeeds (strict tsc over the whole tree, test files included).
- Record exact counts/results in `review.md`.

## Step 6 — Artifacts

- Write `progress.md` (running log; updated across steps 1–5 as work lands).
- Write `review.md` (handoff: outcome, AC clause-by-clause, files, verification table, decisions,
  open concerns). Then stop — Lisa handles phase/status transitions.

## Risks & mitigations

- **Bias in shuffle** → use textbook Fisher–Yates with per-position uniform index; never
  `sort(random)`. Covered by the permutation-per-window test.
- **`queue.shift()` on empty** → refill guard runs first; asserted indirectly by the
  100-draw and window tests (any premature empty would surface as an `undefined` id).
- **Non-reproducibility via hidden nondeterminism** → no `Date`/`Math.random` in module; the
  ES2017 rule against `Date.now()` in *workflow scripts* is irrelevant here (this is app code),
  but the reproducibility contract forbids it anyway. Covered by the same-seed identity test.
- **Seed edge values** (0, negative, non-integer) → `seed >>> 0` coerces to a valid uint32 for
  any number input; determinism holds. Not separately tested beyond the range/identity checks
  (low value; can add if review flags).
- **Over-scoping** → resist adding `peek()`/immutable-state now (Design decisions 2 & 5); keep
  the surface `mulberry32` + `createSevenBag`.
