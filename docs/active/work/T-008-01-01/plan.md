# T-008-01-01 — Plan: candidate-placement-seam

## Testing strategy

Pure logic → **unit tests only** (vitest), colocated at `lib/bot-placements.test.ts`. No
integration/React tests: the module imports nothing framework-bound and has no runtime surface
beyond the function. Verification is `npm run lint` + `npx vitest run` (full suite must stay
green) + `npm run build` (type-check).

The AC test is invariant-by-reuse (assert equality against `hardDrop`/`pieceCells`/`lockPiece`
compositions), never hard-coded coordinates — matching `ghost.test.ts`. This keeps the test
robust to shape-table details and pins the exact "matches a hardDrop" contract the AC names.

## Steps

### Step 1 — Write `lib/bot-placements.ts`
- Module docstring in the house voice (pure/framework-free; composes existing primitives; states
  boundaries: spawn-column hard-drop reachability only, lock-not-clear, bag-free).
- `PlacementCandidate` interface with documented fields.
- `cellKey(cells)` helper: `cells.map(c => \`${c.x},${c.y}\`).sort().join("|")`.
- `enumeratePlacements`: nested rotation×anchor loops, anchor range from offset min/max,
  `collides`-at-spawn guard, `hardDrop` → `pieceCells` → dedup via `seen` set → `lockPiece`.
- Guard `width = board[0]?.length ?? 0` and empty-board early behavior (loops simply don't run).
- **Verify:** `npm run lint` clean on the new file.

### Step 2 — Write `lib/bot-placements.test.ts`
Cases from Structure §"planned cases":
1. AC: every candidate's `cells`/`board` reconstruct from `(rotation, column)` via
   `hardDrop`+`pieceCells`+`lockPiece`.
2. Purity: input board unmutated (snapshot `toEqual`); comment noting bag-freedom is structural.
3. Settled board holds the 4 landing cells as `piece.type`; no accidental line clear.
4. Dedup counts: `"O"` → `COLS`; `"I"` → expected distinct-orientation column count on empty.
5. Reachability: filled top columns produce no spawn-colliding candidate.
6. Fresh Points don't alias across calls.
7. Well-formed dims + non-empty on empty board.
- **Verify:** `npx vitest run lib/bot-placements.test.ts` green.

### Step 3 — Full verification
- `npx vitest run` (entire suite green — no regressions).
- `npm run build` (TypeScript passes; the new exports type-check against `lib/` consumers).
- **Verify:** all three commands succeed.

### Step 4 — Commit
Single atomic commit (source + test are one cohesive unit):
`feat(bot): enumerate legal placements as pure evaluator seam`
Update `progress.md` with completion + any deviations.

## Risks / watch-items

- **Anchor range off-by-one.** `-minOffX .. width-1-maxOffX` is the exact in-bounds set; a unit
  test on `"I"`/`"O"` column counts pins it (a wrong bound shows up as too few/many candidates).
- **Dedup over- or under-collapsing.** Keying on landed absolute cells is geometry-exact; the
  `"O"`=`COLS` and `"I"` column-count assertions catch drift in either direction.
- **Accidental `clearLines`.** Case 3 asserts the piece's cells survive on the settled board, so
  a stray clear (which would remove a completed row) fails the test.
- **`collides` needs board dims.** On a degenerate empty (`[]`) board `width=0`, loops don't run
  and an empty array returns — acceptable (not exercised by the AC; noted, not tested).

## Definition of done

- `enumeratePlacements` exported from `lib/bot-placements.ts`, pure and framework-free.
- AC test present and green: results match `hardDrop` per rotation/column; no input mutation.
- Full `vitest` suite green; `npm run build` and `npm run lint` clean.
- Committed; `progress.md` and `review.md` written.
