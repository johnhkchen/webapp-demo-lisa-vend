# T-008-01-02 — Plan: placement-heuristic

Ordered, independently verifiable steps. One atomic commit at the end (single new module + test,
no interdependent source edits to stage separately).

## Step 1 — Write `lib/bot-heuristic.ts`

- Module docstring: pure/framework-free; scores a **lock-only, pre-collapse** board (matches the
  T-008-01-01 seam boundary); completed-lines counted as full rows in place; higher score = better;
  row-major `board[y][x]`, `y` down.
- Export `BoardFeatures` interface (4 numeric fields).
- Export `WEIGHTS` (`as const`): `aggregateHeight -0.510066`, `completedLines +0.760666`,
  `holes -0.35663`, `bumpiness -0.184483`, with a comment citing the GA-tuned 4-feature set.
- Export `boardFeatures(board)`:
  - `height = board.length`, `width = board[0]?.length ?? 0` (zero-width guard → all-zero).
  - Single per-column top→bottom scan for height + holes; `heights[]` for bumpiness.
  - Bumpiness from adjacent `heights` diffs; completed lines from a row scan.
- Export `evaluate(board)`: weighted sum via `WEIGHTS` and `boardFeatures`.

**Verify:** `npx tsc --noEmit` implicitly via `npm run build` later; visually check signs/keys.

## Step 2 — Write `lib/bot-heuristic.test.ts`

Follow `bot-placements.test.ts` conventions (vitest, `describe`/`it`, local board builders,
`emptyBoard(COLS, ROWS)`).

Builders: `flatClearingBoard()` (bottom row full, else empty — good), `holeyTowerBoard()` (tall
jagged stack with buried holes, no full row — bad), plus inline per-feature boards.

Tests (from structure.md):
- **acceptance**: `evaluate(holey) < evaluate(flat)` strictly; determinism (repeat calls equal;
  rebuilt pair still holey < flat).
- **boardFeatures per feature**: empty → all 0; aggregateHeight = k; holes = 1 with correct height;
  bumpiness = |a−b|; completedLines = N.
- **evaluate weighting & purity**: adding a hole lowers score; completing a line raises it; input
  board unmutated (snapshot deep-equal); `WEIGHTS` key/sign shape.

**Verify:** `npx vitest run lib/bot-heuristic.test.ts` green.

## Step 3 — Full verification

- `npm test` (`vitest run`) — full suite green (was 257 tests / 25 files after the seam; expect
  +1 file and the new cases).
- `npm run lint` — clean at `--max-warnings 0`.
- `npm run build` — type-check + production build succeeds.

**Verification criteria (AC):**
- `lib/bot-heuristic.ts` exports `evaluate(board): number` returning the four-feature weighted sum.
- `bot-heuristic.test.ts` asserts a holey/high-stack board scores **strictly worse** than a flat,
  hole-free, line-completing board, deterministically. Suite green.

## Step 4 — Commit

Single commit: `feat(bot): score settled board via 4-feature heuristic` (or similar
`feat(bot-heuristic)` scope), including the two `lib/` files and the work artifacts.

## Step 5 — Artifacts

- `progress.md` — steps done, deviations, final test counts.
- `review.md` — handoff: what changed, coverage, open concerns.

## Risk / rollback

- **Lowest-risk shape**: additive pure module + test; no existing file touched, so nothing to
  regress. If the build/lint/test fails, fix forward in the same uncommitted change.
- **Only real correctness risk** is a feature-definition bug (e.g. height off-by-one, holes
  counting above the surface). Mitigated by the per-feature unit tests in Step 2, which pin each
  definition against a hand-constructed board with a known answer.
- **Weight signs** are the AC-critical invariant; the `WEIGHTS`-shape test and the "add a
  hole lowers score" test guard against a sign flip.

## Testing strategy summary

- **Unit** (`bot-heuristic.test.ts`): all coverage lives here — feature extraction (per feature,
  exact expected integers), the weighted-sum ordering (the AC), determinism, and purity.
- **No integration test needed** this ticket: the evaluator is a leaf pure function. Integration
  with `enumeratePlacements` is the planner's ticket (T-008-01-03).
