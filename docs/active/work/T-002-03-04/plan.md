# T-002-03-04 — Plan: determinism-test-harness

## Testing strategy

Pure unit tests via vitest, no integration/e2e. The harness *is* the test. It exercises the
real, unmocked `createInitialState`/`step` (and, through them, the whole `lib/` engine). No
fixtures beyond a fixed input script and seeds. The test itself must be deterministic — no
`Math.random`, no clock — so its own outcome is reproducible.

Verification criteria: `npm test` passes (all suites, including the new file); `npm run lint`
clean; the AC test genuinely exercises locks + at least one line clear + a bag refill (guarded
by an in-test assertion that the run was eventful, so a future engine regression that silently
short-circuits `descend` can't leave the test vacuously green).

## Steps

### Step 1 — Scaffold the harness file + helpers
Create `lib/determinism.test.ts` with the module docstring, imports, `Snapshot` type,
`snapshot()`, `run()`, `runTrace()`, `drawIds()`, `ticks()`, and the `SCRIPT` constant.
Verify: `npx tsc --noEmit` (or lint) sees no type errors; file compiles with no tests yet or a
placeholder.

### Step 2 — AC test: deep-equal final board, score, piece-sequence state
Add the primary `it(...)`: two runs from the same seed through `SCRIPT`; `toEqual` snapshots;
`toEqual` on `drawIds(a,14)` vs `drawIds(b,14)`; plus an "eventful run" assertion (score or
lines advanced, and/or several spawns occurred). Verify: `npm test` green; deliberately tweak
the seed of only one run locally to confirm the test *fails* (then revert) — proves it bites.

### Step 3 — Step-by-step convergence test
Add the `runTrace` test comparing snapshots at every index. Verify: green; confirms no
mid-sequence divergence.

### Step 4 — Divergence guard + lateral-purity test
Add the different-seed divergence test and the lateral-purity test. Verify: green; confirms
the equality assertions are non-vacuous and that laterals carry no hidden entropy.

### Step 5 — Full gate + commit
Run `npm test` and `npm run lint`. Fix any lint (unused imports, `any`). Commit the test file
plus the RDSPI work artifacts.

## Commit plan

The engine work is already committed on prior tickets; this ticket adds a single test file.
One atomic commit is appropriate:

```
test(T-002-03-04): prove step() determinism — same seed+inputs ⇒ identical outcome
```

Include the new `lib/determinism.test.ts` and the `docs/active/work/T-002-03-04/*` artifacts.
(Artifacts may be committed separately by Lisa's flow; if committing here, keep code + docs in
one commit for a clean ticket trace.)

## Rollback / risk

- If the chosen SCRIPT happens to top-out before any line clears, the "eventful" guard fails
  loudly rather than passing weakly → adjust SCRIPT (fewer ticks between laterals, or spread
  pieces across columns) until a clear occurs before top-out. Low risk given a 10-wide board
  and O/I pieces filling the floor.
- No production code touched, so no regression surface beyond the test file itself.

## Definition of done

- [ ] `lib/determinism.test.ts` exists with the four tests above.
- [ ] `npm test` passes; the AC test asserts deep-equal board + score + bag-stream parity.
- [ ] The AC test provably fails if one run's seed is perturbed (sanity-checked locally).
- [ ] `npm run lint` clean.
- [ ] `review.md` written.
