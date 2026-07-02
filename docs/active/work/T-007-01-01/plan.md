# Plan — T-007-01-01 seven-bag-lookahead-peek

## Steps

### Step 1 — Behavior-preserving refactor of `createSevenBag` to buffer-backed
- Rename internal `queue` → `buffer`; add private `ensure(n)` that appends shuffled bags until
  `buffer.length >= n`; consume `rand` only there.
- Rewrite `next()` as `ensure(1); return buffer.shift()!`.
- No interface change yet.
- **Verify**: `npx vitest run lib/bag.test.ts lib/determinism.test.ts lib/game.test.ts` — all
  existing tests green (proves the refactor is behavior-preserving; `rand` cadence unchanged).
- **Commit**: `refactor(bag): buffer-backed generator (behavior-preserving)`.

### Step 2 — Add `peek(n)` to interface + implementation
- Extend `SevenBag` with `peek(n): TetrominoType[]` + doc comment (non-consuming, `n<=0 ⇒ []`,
  returns a copy).
- Implement `peek(n)`: `if (n <= 0) return []; ensure(n); return buffer.slice(0, n)`.
- Update the module doc comment to mention non-consuming lookahead.
- **Verify**: typecheck / build compiles (`npm run build` or `tsc` via vitest run).
- **Commit**: `feat(bag): add non-consuming peek(n) lookahead`.

### Step 3 — Add property tests
- Add `describe("SevenBag.peek", ...)` with the six cases from `structure.md` (agreement across
  seeds and n, non-mutation, idempotence, cross-refill, edge cases incl. copy-safety, interleaved).
- Use `SEEDS` array + `n` ranges that cross the 7/14 boundary.
- **Verify**: `npx vitest run lib/bag.test.ts` green; then full `npx vitest run` (whole `lib/`).
- **Commit**: `test(bag): property tests for peek/next agreement and non-mutation`.

## Testing strategy

- **Unit / property (seed-loop style, matching repo idiom — no fast-check):**
  - *Agreement*: for `seed ∈ SEEDS`, `n ∈ 0..20`: `bag.peek(n)` deep-equals `drawN(bag', n)` on a
    same-seed sibling (or peek-then-draw on one bag). This is the acceptance-criterion property.
  - *Non-mutation*: same-seed bags A/B; peek A (incl. interleaved peeks); `drawN(A,50) === drawN(B,50)`.
  - *Cross-refill*: `n = 10, 14, 21` to force ≥2 bag generations.
  - *Edge*: `peek(0)`, `peek(-3)` → `[]`; returned array mutation does not affect draws.
- **Regression**: full `lib/` suite, especially `determinism.test.ts` (asserts identical streams
  across runs) and `game.test.ts` (spawns from `bag.next()`).
- **Acceptance verification**: `bag.test.ts` green with a test explicitly asserting `peek(n)` equals
  the next `n` `next()` draws for arbitrary seeds and that peek does not mutate the stream.

## Verification criteria (Definition of Done)

- [ ] `lib/bag.ts` exports `peek(n)` on `SevenBag`.
- [ ] Property test: `peek(n) === next n next()` for many seeds & n (incl. across refills).
- [ ] Property test: peek does not mutate the stream.
- [ ] All pre-existing `lib/` tests still pass.
- [ ] `npm run build` and `npm run lint` clean.

## Rollback

Each step is an independent commit; Step 1 is behavior-preserving, so reverting Step 2+3 leaves a
working bag. Low blast radius — one file of production code, one test file.
