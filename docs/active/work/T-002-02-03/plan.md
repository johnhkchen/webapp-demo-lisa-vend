# Plan — T-002-02-03: SRS rotation with wall kicks

Ordered, independently-verifiable steps. Single atomic commit at the end (the module + its tests
are one cohesive unit; the repo's history shows logic+test landing together).

## Step 1 — Author `lib/rotation.ts`

1.1 Module doc comment (house style + y-down negation note + scope boundary).
1.2 Imports: `Board, Piece, Point, RotationState, TetrominoType` (type) + `collides`.
1.3 `RotationDir` type; local `p` helper.
1.4 `KICKS_JLSTZ` — transcribe the 8 published y-up entries **with y negated**, each line
    commented with its y-up source. Derivation used (negate y):

    0>1: (0,0)(-1,0)(-1,-1)(0,2)(-1,2)     1>0: (0,0)(1,0)(1,1)(0,-2)(1,-2)
    1>2: (0,0)(1,0)(1,1)(0,-2)(1,-2)       2>1: (0,0)(-1,0)(-1,-1)(0,2)(-1,2)
    2>3: (0,0)(1,0)(1,-1)(0,2)(1,2)        3>2: (0,0)(-1,0)(-1,1)(0,-2)(-1,-2)
    3>0: (0,0)(-1,0)(-1,1)(0,-2)(-1,-2)    0>3: (0,0)(1,0)(1,-1)(0,2)(1,2)

1.5 `KICKS_I` — transcribe the 8 I entries with y negated:

    0>1: (0,0)(-2,0)(1,0)(-2,1)(1,-2)      1>0: (0,0)(2,0)(-1,0)(2,-1)(-1,2)
    1>2: (0,0)(-1,0)(2,0)(-1,-2)(2,1)      2>1: (0,0)(1,0)(-2,0)(1,2)(-2,-1)
    2>3: (0,0)(2,0)(-1,0)(2,-1)(-1,2)      3>2: (0,0)(-2,0)(1,0)(-2,1)(1,-2)
    3>0: (0,0)(1,0)(-2,0)(1,2)(-2,-1)      0>3: (0,0)(-1,0)(2,0)(-1,-2)(2,1)

1.6 `KICKS_O` — 8 keys, each `[p(0,0)]`.
1.7 `kickTableFor`, `transitionKey`, `rotate`, `rotateCW`, `rotateCCW` per structure.md.

**Verify:** `npm run lint` clean; module typechecks.

## Step 2 — Author `lib/rotation.test.ts`

Cover the 10 groups from structure.md. Key concrete fixtures (10-wide × 20-tall unless noted):

- **Table shape** — assert keys/lengths/`(0,0)` first test for all three tables.
- **Open-space cycle** — `rotateCW` four times returns to rotation 0; positions unchanged.
- **CW/CCW inverse** — deep-equal round trip.
- **JLSTZ wall kick** — e.g. an L/J/T flush to the left wall in a state where the naive rotation
  clips x<0; assert kicked to the guideline `position` (compute expected = spawn pos + winning
  test offset, and cross-check it's collision-free while test 1 collides).
- **Floor kick** — a T resting on the floor rotating so a cell would go below; assert y kicks up.
- **I-piece** — horizontal I flush left rotating to vertical uses the -2/-1 kick; assert exact
  position. Add an I near the floor.
- **T-spin double** — settle the canonical overhang so only test 5 fits; assert final position and
  rotation, and that earlier tests are individually blocked.
- **Fully blocked** — carve a 1-wide well / surround the piece so all 5 tests collide; assert
  `rotate(...) === piece`.
- **O** — open-space rotate advances rotation, cells identical (asSet equal); buried O no-ops.
- **Non-mutation** — JSON snapshot board+piece across a success and a no-op.

**Testing strategy:** all unit tests, pure functions, no integration/UI needed (logic layer). The
"correct kicked position" AC is verified by asserting exact `position`+`rotation`, not just "moved";
the "rejected" AC by reference-equality no-op. For each wall/floor/T-spin case, also assert that
test 1 `(0,0)` alone *would* collide (via `collides` directly) so the test proves a *kick*
happened, not just an incidentally-legal naive rotation.

**Verify:** `npm run test` → all green.

## Step 3 — Full verification

- `npm run test` (whole suite, no regressions in bag/board/collision/movement/rng/tetrominoes).
- `npm run lint` (`--max-warnings 0`).
- `npm run build` (Next production build must pass — catches type errors end-to-end).

## Step 4 — Commit

Single commit: `feat(T-002-02-03): SRS CW/CCW rotation with wall kicks + vitest`.
Update `progress.md` (done/remaining/deviations), then write `review.md`.

## Verification criteria (definition of done)

- [ ] `rotation.ts` + `rotation.test.ts` exist, pure, framework-free.
- [ ] Canonical JLSTZ wall kick, floor kick, I-piece kick, and T-spin corner kick each resolve to
      the correct kicked position (exact-position asserts).
- [ ] Fully-blocked rotation returns the input reference (no-op).
- [ ] CW/CCW inverse; open-space cycle; O handled.
- [ ] No mutation of board/piece/tables.
- [ ] `npm run test`, `npm run lint`, `npm run build` all pass.

## Rollback / risk

Purely additive (two new files). If a kick value is mis-transcribed, an exact-position test fails
loudly rather than silently mis-kicking. No migration or data changes; revert = delete two files.
