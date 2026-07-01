# Progress — T-002-02-03: SRS rotation with wall kicks

## Status: complete

All plan steps executed in one continuous pass. Single atomic commit landed.

## Completed

- **Step 1 — `lib/rotation.ts`** ✅
  - `RotationDir` type, local `p` helper.
  - `KICKS_JLSTZ`, `KICKS_I`, `KICKS_O` — SRS kick tables keyed by `"from>to"`, transcribed from
    the published y-up tables with **y negated** for the engine's y-down frame; each row carries
    its y-up source in a trailing comment for audit.
  - `kickTableFor`, `transitionKey` (internal), `rotate`, `rotateCW`, `rotateCCW` (exported).
  - Mirrors `movement.ts`: fresh `Piece` on the first non-colliding kick; input reference on no-op.
- **Step 2 — `lib/rotation.test.ts`** ✅ — table-driven, all 10 groups from structure.md.
- **Step 3 — verification** ✅
  - `npm run test`: **90 passed** (8 files; the new suite adds its cases with no regressions).
  - `npm run lint`: clean (`--max-warnings 0`).
  - `npm run build`: production build + TypeScript pass.
- **Step 4 — commit** ✅ `d511cd2 feat(T-002-02-03): SRS CW/CCW rotation with wall kicks + vitest`.

## Deviations from plan

- **Dropped the "buried O no-op" test case.** During implementation I confirmed O can *never*
  no-op: its four states are identical cells and the piece's own footprint is never settled on the
  board, so the single `(0,0)` test always fits from any legal position. Testing a non-existent
  behavior would be misleading, so the O group instead asserts rotation-invariance (rotation field
  advances, cells unchanged). This is a documentation/scope correction, not a logic change.
- Everything else followed the plan as written. Kick fixtures were hand-computed to exact
  positions before coding (see review.md for the worked cases), so no iteration was needed.

## Nothing outstanding

No TODOs left in code. Open considerations (all out of scope for this ticket) are captured in
`review.md`.
