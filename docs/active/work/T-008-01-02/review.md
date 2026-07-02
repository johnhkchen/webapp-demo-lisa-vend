# T-008-01-02 — Review: placement-heuristic

## What changed

| File | Change | Notes |
|------|--------|-------|
| `lib/bot-heuristic.ts` | **created** (~110 lines w/ docstrings) | `evaluate`, `boardFeatures`, `WEIGHTS`, `BoardFeatures`. |
| `lib/bot-heuristic.test.ts` | **created** (~120 lines) | 11 unit tests, 3 describe blocks. |
| `docs/active/work/T-008-01-02/*` | **created** | research / design / structure / plan / progress / review. |

No existing source modified or deleted; no new dependencies. Single commit `5bf0538`.

## What it does

`evaluate(board)` scores one settled board with the classic 4-feature Tetris heuristic:

`score = W_height·aggregateHeight + W_lines·completedLines + W_holes·holes + W_bump·bumpiness`

Higher = more desirable. `boardFeatures(board)` extracts the four features in a single O(W·H) pass
(per-column top→bottom walk for height + holes; adjacent-height diffs for bumpiness; a row scan for
completed lines). `WEIGHTS` is the GA-tuned reference set (height `-0.510066`, lines `+0.760666`,
holes `-0.35663`, bumpiness `-0.184483`).

Key altitude decision (full rationale in `design.md`, Decision 1): the evaluator scores the board
**as handed in — lock-only, pre-collapse**, matching the boundary the candidate seam
(`bot-placements.ts`, T-008-01-01) deliberately drew. A placement that fills a row leaves that row
present with no `null`, so "completed lines" is counted directly off the board; we do **not** call
`clearLines`. This keeps the height/holes/bumpiness features on the surface the reference weights
were tuned against and lets the positive lines weight do the rewarding.

## Acceptance criterion

> `lib/bot-heuristic.ts evaluate(board)` returns a numeric score from the four weighted features;
> unit tests assert a board with holes/high stacks scores strictly worse than a flat, hole-free,
> line-completing board, deterministically (`bot-heuristic.test.ts` green).

✅ Met. `evaluate` returns the four-feature weighted sum. The `— acceptance` describe block asserts
`evaluate(holeyTowerBoard()) < evaluate(flatClearingBoard())` (strict) and determinism (same board →
identical score; ordering stable on a freshly rebuilt pair). Suite green: **268 tests, 26 files**.

## Test coverage

- **Acceptance** — holey/high stack strictly worse than flat/hole-free/clearing; deterministic and
  stable ordering.
- **Per feature** (`boardFeatures`) — empty board → all-zero + score 0; `aggregateHeight` = column
  height from the floor; `holes` counts a buried gap while height still spans it; `bumpiness` =
  Σ|adjacent diffs|; `completedLines` counts full rows on the lock-only board.
- **Weighting & purity** — adding a hole lowers the score; completing a line raises it vs. the
  same stack one cell short; input board unmutated (snapshot deep-equal); `WEIGHTS` has the four
  keys with correct signs (lines positive, others negative).

Verification: `npm test` (268/26 green), `npm run lint` clean (`--max-warnings 0`), `npm run build`
succeeds (type-check passes).

### Gaps / not covered (intentional)
- **Exact score values** are not pinned to literals — tests assert orderings/signs and per-feature
  integers instead, so a future weight re-tune won't churn tests while the AC invariant (holey <
  flat) still holds.
- **Zero-width / zero-height boards**: guarded via `board[0]?.length ?? 0` (returns all-zero
  features), but not unit-tested — not a real game state, mirrors the seam's stance.
- **Post-collapse scoring**: deliberately out of scope (Design Decision 1).

## Open concerns / notes for the reviewer

1. **Lock-only altitude is a shared contract.** This evaluator assumes the board it scores has NOT
   been line-cleared, so completed rows are still present to be counted. That matches exactly what
   `enumeratePlacements` returns today. The planner (T-008-01-03) must feed candidate `board`
   fields straight in — if any caller ever pre-clears, the completed-lines reward vanishes. Flagged
   in both docstrings; worth confirming when the planner is wired.
2. **Weights are tuned, not proven here.** The GA reference set advances P5 ("plays well") but this
   ticket only tests sign-correctness, not play strength. Tuning/validation of actual bot quality
   belongs to the planner/attract-driver stories, where a full game can be observed.
3. **`boardFeatures` + `WEIGHTS` are additive surface** beyond the AC's `evaluate`. Kept public for
   planner tie-breaking/logging and to avoid magic numbers; low risk (pure, tested).

No known bugs or TODOs left in code.
