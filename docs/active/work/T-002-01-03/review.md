# Review — T-002-01-03: seeded-rng-and-seven-bag

Handoff document. What changed, how it was verified, what a reviewer needs to know without
reading every diff. Committed as `6c777b3` (rng) and `d142d0e` (bag).

## Outcome

Piece sequences are now reproducible from a seed. A new pure, framework-free `lib/rng.ts`
provides a seeded **mulberry32** PRNG (`mulberry32(seed): RandomFn`), and `lib/bag.ts` layers a
**7-bag generator** on it (`createSevenBag(seed): SevenBag`) that deals one of each tetromino id
per bag, reshuffling on empty. Two generators from the same seed emit byte-identical streams;
every aligned 7-draw window is a permutation of all seven ids. This advances
`E-002:reproducible-rng` / P1. **Acceptance criterion met.**

## Acceptance criterion — clause by clause

> Two generators built from the same seed yield byte-identical piece sequences over 100 draws,
> and each 7-piece window contains all 7 tetromino ids exactly once (test).

| Clause | Where | Status |
|---|---|---|
| two generators, same seed → byte-identical over 100 draws | `bag.test.ts` "is reproducible… over 100 draws" (`toEqual` on two 100-draw arrays) | ✓ |
| each 7-piece window contains all 7 ids exactly once | `bag.test.ts` "every aligned 7-piece window is a permutation" (20 windows: set size 7 **and** sorted-equals the full alphabet) | ✓ |

Beyond the letter of the AC, the suites also check: PRNG determinism and `[0,1)` range,
seed-divergence (rng and bag), seed normalization for 0/negative/fractional seeds, two-instance
independence, first-bag coverage, and that every yielded id is a member of `TETROMINO_TYPES`.

## What changed

### Added
- **`lib/rng.ts`** — seeded mulberry32. `export type RandomFn = () => number`;
  `export function mulberry32(seed: number): RandomFn`. `seed >>> 0` normalizes any number to a
  uint32; closure holds the running state; body uses only `Math.imul`/`|0`/`>>>` (ES2017-safe).
  Leaf module — no `lib/` imports.
- **`lib/rng.test.ts`** — Vitest, explicit imports, `take(rand,n)` helper, 6 `it` blocks.
- **`lib/bag.ts`** — `interface SevenBag { next(): TetrominoType }`;
  `createSevenBag(seed): SevenBag`; module-private `shuffle` (unbiased Fisher–Yates, copies its
  input so `TETROMINO_TYPES` is never mutated). Imports `mulberry32` (`./rng`), `TETROMINO_TYPES`
  (`./tetrominoes`), `TetrominoType` (`import type ./types`).
- **`lib/bag.test.ts`** — Vitest, explicit imports, `drawN` + `chunk` helpers, 5 `it` blocks.
- **`docs/active/work/T-002-01-03/{research,design,structure,plan,progress,review}.md`**.

### Not changed (deliberately)
- `lib/types.ts` — `TetrominoType` sufficed; no new type needed.
- `lib/tetrominoes.ts` — consumed read-only via `TETROMINO_TYPES`, unmodified.
- `lib/constants.ts`, `lib/board.ts`, `components/`, `app/`, `eslint.config.mjs`,
  `tsconfig.json`, `package.json` — untouched. **No new dependency** (mulberry32 is hand-rolled,
  on-pattern with the rest of `lib/`).
- Ticket / story / epic frontmatter and all sibling working-tree files — left for Lisa.

## Verification

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm run test` | **23 passed** (4 files); new `mulberry32` (6) + `createSevenBag` (5) green, prior 12 still green (~167ms) |
| Zero-warning lint + `lib/` purity | `npm run lint` | exit 0, no output (no React/Next import in `lib/`) |
| Production build (strict whole-tree tsc, test files present) | `npm run build` | success; `/` + `/_not-found` prerendered static |
| Commit scope | `git show --stat 6c777b3 d142d0e` | only the 4 code files; no frontmatter, no sibling files |

## Key design decisions (rationale in `design.md`)

- **mulberry32** over `Math.random` (not seedable), an npm dep (disproportionate), or an LCG
  (low-bit periodicity biases modulo shuffles). Single-integer seed maps cleanly to the AC.
- **Closure-encapsulated `next()`** over explicit immutable state — ergonomic for the single
  draw site in the game loop; determinism comes from the seed, not from immutability. The
  internal shuffle stays pure, so an immutable/serializable wrapper can be added later without
  touching the algorithm.
- **Two modules** (`rng.ts` + `bag.ts`) — one concern per file (codebase pattern); the PRNG is
  independently reusable and independently testable.
- **Minimal surface** — `next()` only; no speculative `peek()`/`take(n)` before the
  `NextPreview` consumer exists to define it.

## Open concerns / limitations

- **`next()`-only API.** `NextPreview` will eventually need to look ahead at the queue. That is a
  deliberate deferral (Design decision 5) — extend the interface when the preview ticket lands
  and can specify the peek shape. Not a defect; a scoped boundary.
- **Closure state isn't serializable.** If a later save-state / replay ticket needs to persist
  mid-bag position, swap in the immutable-state variant sketched in `design.md`. No consumer
  needs it today.
- **Seed sourcing is out of scope.** This ticket makes the generator *accept* a seed; choosing
  the initial seed at app start (time-based, URL param, fixed) is an integration decision for a
  later ticket.
- **Shuffle quality is untested at the statistical level.** The tests prove the permutation
  invariant and determinism, not uniform distribution of orderings. Fisher–Yates with a uniform
  index is provably unbiased, so a distribution test would be belt-and-suspenders; omitted as low
  value. Flag if a reviewer wants it.

Nothing blocks handoff. `next()` feeds directly into piece spawning in a later story.
