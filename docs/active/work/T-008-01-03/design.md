# T-008-01-03 — Design: choose-move-planner

## Goal

`chooseMove(state: GameState): Input[]` — pure. Enumerate every candidate placement for the active
piece, score each with `evaluate`, pick the best, and emit the rotate/shift/hardDrop input sequence
that enacts it. Folding the result through `step` must land the active piece at that placement.

## Decision 1 — argmax by `evaluate(candidate.board)`, direct pass-through (no pre-clear)

The whole ticket is: `argmax over enumeratePlacements(board, type) of evaluate(candidate.board)`.

The candidate boards are lock-only (rows not cleared); `evaluate` counts completed lines off exactly
that pre-collapse surface. So we feed `candidate.board` **straight in** — no `clearLines`. This is
the shared contract the two seams were drawn to meet (T-008-01-02 review, concern 1). Any pre-clear
here would zero out the completed-lines reward and defeat the point of the positive weight.

**Rejected:** re-scoring on a cleared board, or adding a separate line-clear bonus. Both duplicate
logic the heuristic already owns and break the altitude match. The seams compose precisely *because*
neither clears — honor that.

## Decision 2 — tie-break: keep the first maximum (stable)

Iterate candidates in `enumeratePlacements` order (rotation-major, column-ascending) and keep a
running best with **strict** `>` replacement. On equal scores the earliest candidate wins — lowest
rotation, then lowest column. This is deterministic and needs no secondary key.

**Rejected:** random tie-break (breaks determinism — a hard AC requirement and the whole "pure"
premise), or an elaborate secondary heuristic (needless; the AC only asks for *a* deterministic sane
choice, and equal-heuristic boards are genuinely equivalent to the model).

## Decision 3 — input synthesis: rotate → shift → hardDrop, computed from `state.active`

Map the chosen candidate `(rotation rT, column cT)` back to inputs relative to the **actual** active
piece `(r0, x0)` (not an assumed spawn), so `chooseMove` is correct even if called on a mid-move
piece:

1. `k = (rT - r0) & 3` × `"rotateCW"`.
2. `dx = cT - x0` → `|dx|` × (`dx > 0 ? "right" : "left"`).
3. one `"hardDrop"`.

Order matters: rotate **first** (while at the open spawn/top so SRS rotates in-place, keeping `x`
predictable), then shift the now-final-orientation anchor to `cT`, then drop. Because `hardDrop` is
deterministic from `(cT, rT)` at `y = 0`, the landing reproduces the candidate's `cells`/`board`
exactly.

Why `(rT - r0) & 3` CW steps rather than picking the shorter CW/CCW arc: the emitted candidate
rotations are already minimal per the seam's dedup (I only ever emits rotation 0 or 1; O only 0), so
the worst case is 3 CW steps for a T/J/L at `rT = 3`. Optimizing to a single CCW would add branching
for one saved input and zero behavioral difference. Keep it uniform and obvious. (Documented as a
possible future micro-optimization, not worth the complexity now.)

**Rejected — simulate every candidate's sequence inside `chooseMove` and filter to reachable ones:**
heavier, and it would re-implement reachability the seam already models via spawn-collision skipping.
The seam guarantees the *drop* is legal; on a clear-topped board the *maneuver* is too. We instead
verify enactment in tests (Decision 5) and document the inherited reachability boundary, rather than
paying simulation cost on every call.

## Decision 4 — empty-candidate handling → return `[]`

If `enumeratePlacements` returns `[]` (every top-of-field spawn collides — the stack reaches the top
everywhere reachable, i.e. top-out is imminent), there is no placement to enact. Return `[]`: an
empty input list is a well-defined "no move", and a caller (attract driver, T-008-02) can `tick` to
let the game top out naturally through `step`.

**Rejected:** returning `["hardDrop"]` as a filler. It would lock the piece at spawn and *maybe*
mask the top-out for one frame; `[]` is the honest signal and keeps `chooseMove` side-effect-free of
opinion about a lost game. Documented in the docstring.

## Decision 5 — testing strategy: verify enactment end-to-end through `step`

The AC demands both "lands at the highest-heuristic placement" and "legal under `step`". A single
strong assertion covers both: **fold the returned inputs through `step` and compare `finalState.board`
to `clearLines(chosenCandidate.board).board`.**

After a `hardDrop`, `step` locks the active piece into `board`, clears lines, and spawns the next
piece as a *separate* `active`. So `finalState.board` is precisely the chosen candidate's lock-only
board *after* line clear. Recomputing the expected argmax independently in the test
(`enumeratePlacements` + `evaluate`) and asserting board-equality proves the sequence both reaches
the intended placement and is legal (no shift silently no-op'd). See `plan.md` for the full matrix,
including the "fills a near-complete row" (asserts `finalState.lines` increases) and "avoids
holes/height" (asserts the chosen board is the hole-free / lowest option) sane-choice cases.

## Public surface

```ts
export function chooseMove(state: GameState): Input[];
```

One export. `PlacementCandidate`/`evaluate`/`Input` are already public from their modules; the
planner needs no new shared types. Internals (rotation-count and shift-count helpers) stay
module-private unless a test needs them — prefer testing through `chooseMove`.

## Purity & boundary

`bot.ts` imports only `lib/` modules and types (`bot-placements`, `bot-heuristic`, `game` for
`GameState`/`Input`). No React/Next (eslint `lib/**` boundary). Reads `state.board` + `state.active`
only; allocates a fresh `Input[]`; mutates nothing — same-input-same-output.
