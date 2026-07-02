# T-008-01-02 — Design: placement-heuristic

Three decisions, each grounded in the Research findings. TL;DR: evaluate the board **as given
(lock-only)** counting full rows as the "completed lines" feature; export `evaluate`, a
`boardFeatures` breakdown, and a `WEIGHTS` constant; use the GA-tuned reference weight set.

---

## Decision 1 — Evaluate the board *as given* (lock-only), count full rows in place

**Options.**

- **(A) Score the board exactly as handed in** (lock-only, pre-collapse). Count of completed lines
  = number of full rows present. Height/holes/bumpiness computed on the same pre-collapse board.
- **(B) Internally `clearLines` first**, compute height/holes/bumpiness on the *collapsed* board,
  take `cleared` as the completed-lines feature.
- **(C) Require the caller to pass both the count and a pre-cleared board** (split responsibility).

**Choice: (A).**

**Why, from Research.** The seam (T-008-01-01) deliberately hands us a **lock-only** board and its
review explicitly leaves line-clear credit to "the evaluator's call." The classic 4-feature
heuristic this AC describes is defined over exactly this state: you drop a piece, and you score the
resulting board where the completed rows are *still present* — "completed lines" literally means
"how many rows this placement filled." Counting full rows in the given board (`row` has no `null`)
*is* that feature; it needs no `clearLines` call. Computing height/holes/bumpiness pre-collapse is
also the textbook definition (the reference GA weights were tuned against pre-collapse features):
a placement that completes a line shows as tall-but-clearing, and the positive lines weight is what
rewards it — collapsing first would double-count the benefit and mismatch the tuned weights.

**Why not (B).** Collapsing first changes the height/holes surface the weights were tuned for and
couples the evaluator to `line-clear.ts` for no benefit — the count is already available by direct
inspection. It also breaks the tidy "one board in, one number out" altitude.

**Why not (C).** Pushes bookkeeping onto every caller and contradicts the AC signature
`evaluate(board)`. The seam gives one board; we take one board.

**Consequence.** `evaluate(board)` and `boardFeatures(board)` treat their argument as a settled,
uncollapsed board. This is documented in the module docstring as the matching altitude to the seam.

---

## Decision 2 — Export `evaluate` + `boardFeatures` + `WEIGHTS`

**Options.** (A) `evaluate` only. (B) `evaluate` + a `boardFeatures(board)` record + a `WEIGHTS`
constant object.

**Choice: (B).**

**Why.** The Research "existing patterns" note that `lib/` favors small, inspectable results
(`LineClearResult`, `PlacementCandidate`). Splitting the pure feature extraction
(`boardFeatures → { aggregateHeight, holes, bumpiness, completedLines }`) from the weighting
(`evaluate = Σ wᵢ·featureᵢ`) gives three wins:

1. **Testability** — the AC test can assert *why* the bad board loses (holes/height dominate),
   not just that a scalar is smaller. Per-feature unit tests pin each definition independently.
2. **Planner ergonomics (T-008-01-03)** — a planner may want to log/tie-break on raw features, or
   swap weights, without recomputing.
3. **No magic numbers** — `WEIGHTS` as an exported `const` record documents the model and lets
   tests reference `WEIGHTS.holes` etc. instead of copying constants.

`evaluate` stays the headline export named by the AC; the extras are additive, low-risk surface.
`boardFeatures` returns a plain interface (`BoardFeatures`), mirroring the result-record idiom.

**Why not (A).** Minimal surface, but forces the AC test to reason about an opaque scalar and hides
the model. The extra two exports are pure and cheap; the clarity is worth it.

---

## Decision 3 — Use the GA-tuned reference weight set

**Options.** (A) The well-known GA-tuned set: height `-0.510066`, lines `+0.760666`,
holes `-0.35663`, bumpiness `-0.184483`. (B) Hand-picked simple integers (e.g. height `-1`,
lines `+5`, holes `-4`, bumpiness `-1`).

**Choice: (A).**

**Why.** Only the *signs* matter for the AC (a holey/tall board must score strictly below a flat,
hole-free, line-completing board — true for any sign-correct set). But this feature also **advances
P5 ("the bot plays well")**: the reference set is the de-facto standard for this exact 4-feature
model and produces a genuinely strong player, so choosing it costs nothing now and saves a
re-tuning ticket later. Encoding them as a named `WEIGHTS` constant keeps them one edit away if the
planner ticket wants to tune.

**Why not (B).** Simpler to read, but leaves known bot quality on the table for a demo whose value
function rewards a good-looking auto-player. The reference constants are self-documenting via the
`WEIGHTS` record and a docstring citation.

---

## Feature definitions (locked)

Given `board` (row-major, `board[y][x]`, `y` down), width `W = board[0]?.length ?? 0`, height
`H = board.length`:

- **`columnHeight(x)`** = `H - y_top`, where `y_top` = smallest `y` with `board[y][x] != null`;
  `0` if the column is all `null`.
- **`aggregateHeight`** = `Σ_x columnHeight(x)`.
- **`holes`** = for each column, once its top filled cell is seen, every `null` at a greater `y`
  counts as one hole. `Σ` over all columns.
- **`bumpiness`** = `Σ_{x=0}^{W-2} |columnHeight(x) - columnHeight(x+1)|`.
- **`completedLines`** = count of rows `y` where `board[y]` contains no `null`.

Single pass: for each column walk top→bottom, record first-filled `y` (→ height), then count
`null`s below it (→ holes). Completed lines counted by a row scan. O(W·H).

## Score

`evaluate(board) = WEIGHTS.aggregateHeight * f.aggregateHeight
                 + WEIGHTS.completedLines * f.completedLines
                 + WEIGHTS.holes          * f.holes
                 + WEIGHTS.bumpiness      * f.bumpiness`

Higher = better. Empty board → all features 0 → score `0`. Zero-width board → all features 0
(guarded), score `0`, no throw.

## Non-goals (deferred, per Research boundaries)

- No placement enumeration, no argmax/selection (planner, T-008-01-03).
- No `GameState`/bag awareness — `evaluate(board)` only.
- No `clearLines` call, no post-collapse scoring (Decision 1).
- No look-ahead / multi-piece search (out of the pure-bot scope).
