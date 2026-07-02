# T-008-01-01 — Progress: candidate-placement-seam

## Status: implementation complete

### Step 1 — `lib/bot-placements.ts` ✅
Created the pure seam: `PlacementCandidate` interface + `enumeratePlacements(board, type)`.
Composes `collides` + `hardDrop` + `lockPiece` + `pieceCells`/`cellsFor` only — no new geometry.
Nested rotation×anchor loops; anchor range derived per rotation from offset min/max; `collides`
-at-spawn guard for reachability; dedup by canonical landed-cell key; `lockPiece` (no clear).

Deviation from Structure draft: the loop variable is a plain `number` (`r`) cast to
`RotationState` inside the body — `r++` yields `number`, which is not assignable to `0|1|2|3`, so
a directly-typed loop var would not type-check. Behaviourally identical.

### Step 2 — `lib/bot-placements.test.ts` ✅
9 tests across 5 describe blocks covering all planned cases: AC cells/board match hardDrop per
rotation/column; no input mutation; lock-only settled board (4 filled cells, no clear); dedup
counts (O→9, I→17); reachability (no top-colliding spawn; buried column excluded); fresh-Point
aliasing; output dims.

Refinement vs. Plan: the dedup expectations were computed exactly — O is 2 wide so it yields
`COLS-1 = 9` (not `COLS`); I yields `10` vertical + `7` horizontal `= 17` (rot2≡rot0, rot3≡rot1
collapse). Plan's "COLS" for O was corrected here.

### Step 3 — Verification ✅
- `npx vitest run lib/bot-placements.test.ts` → 9 passed.
- `npx vitest run` (full suite) → 25 files, 257 tests passed. No regressions.
- `npm run lint` → clean (`--max-warnings 0`).
- `npm run build` → succeeds (types check).

### Step 4 — Commit
Single atomic commit for source + test (see below). This file finalized alongside.

## No open deviations
Design/Structure honored: spawn-column hard-drop reachability only; lock-not-clear; bag-free
`(board, type)` signature; pure/copy-on-write.
