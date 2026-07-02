# T-008-01-03 — Research: choose-move-planner

## Ticket in one line

Compose the two existing pure-bot seams — `enumeratePlacements` (candidate generation) and
`evaluate` (board scoring) — into `lib/bot.ts` `chooseMove(state)`, which returns an `Input[]` that,
folded through `step`, lands the active piece at the highest-scoring placement.

## The two seams this ticket composes

### Seam 1 — candidate placements (`lib/bot-placements.ts`, T-008-01-01, done)

`enumeratePlacements(board, type): PlacementCandidate[]`. For a settled `board` and a piece `type`
it returns every legal `(rotation, column)` hard-drop. Each `PlacementCandidate` carries:

- `rotation: RotationState` — the state the piece was dropped in (0..3).
- `column: number` — the **spawn anchor column** at `y = 0` (box-local, can be negative-derived but
  always in the in-bounds range).
- `piece: Piece` — the landed piece (post-`hardDrop`): identity, rotation, resting position.
- `cells: Point[]` — the four absolute occupied cells of the landing.
- `board: Board` — a fresh board with the landing merged via `lockPiece`, **NOT line-cleared**.

Key boundaries (from its docstring, verified):
- **Reachability = spawn-column hard-drop only.** A candidate is the piece spawned at `{x: column,
  y: 0}` in `rotation`, dropped straight down. Columns whose top-of-field spawn already `collides`
  are skipped (unreachable). No tuck/spin/slide-under-overhang.
- **Settle = lock only, NOT clear.** `board` is `lockPiece` output; full rows stay present.
- Dedup by landed cells: O collapses 4→1 rotation; I collapses rot2≡rot0, rot3≡rot1. So for I the
  emitted `rotation` is only ever `0` (horizontal) or `1` (vertical); O only ever `0`.
- Iteration order is rotation-major (`r = 0..3`), then column ascending. First-seen wins on dedup.
- Pure, copy-on-write, takes `(board, type)` — never a `GameState` or bag.

### Seam 2 — board heuristic (`lib/bot-heuristic.ts`, T-008-01-02, done)

`evaluate(board): number`. Scores a single **lock-only, pre-collapse** board with the classic
4-feature model (`aggregateHeight`, `completedLines`, `holes`, `bumpiness`) weighted by the GA-tuned
`WEIGHTS`. Higher = more desirable. `boardFeatures(board)` exposes the raw features. Deterministic,
pure, read-only, empty board → `0`.

**Critical shared contract (flagged in T-008-01-02 review, concern 1):** `evaluate` counts
completed lines by looking for full rows *still present* on the board. `enumeratePlacements` returns
lock-only boards where completed rows are still present. So the planner must feed candidate `.board`
fields **straight into `evaluate` without pre-clearing** — otherwise the completed-lines reward
vanishes. The two seams were deliberately drawn at the same altitude precisely so this composition
is a direct pass-through. This ticket is the first consumer to actually wire them.

## The engine surface the returned inputs run through

### `step` and `Input` (`lib/game.ts`)

`step(state: GameState, input: Input): GameState` is the pure reducer. Relevant input alphabet for
the bot: `"rotateCW" | "rotateCCW" | "left" | "right" | "hardDrop"` (also `softDrop`/`tick`/`hold`/
`pause`, not needed here).

- `left`/`right` → `moveLeft`/`moveRight` on `state.active` (collision-gated; no-op returns same
  piece reference — so a blocked shift silently does nothing).
- `rotateCW`/`rotateCCW` → SRS rotate on `state.active` (collision-gated, kick tests; first test is
  always `(0,0)`, so an in-place rotation in open space never shifts `x`).
- `hardDrop` → `descend({...state, active: hardDrop(board, active)})`: drops the active piece to
  rest, **locks** it (merges into `board`), `clearLines`, scores, **spawns the next piece from the
  bag** as the new `active`, sets `gameOver` if that spawn collides.

So after a `hardDrop`, `state.board` = the locked-and-**cleared** board, and `state.active` is the
*next* piece (separate from the board). This is the exact hook for verifying enactment: after
folding the bot's inputs, `finalState.board` should equal `clearLines(chosenCandidate.board).board`.

`GameState` fields the planner reads: `board` (settled cells) and `active` (`type`, `rotation`,
`position`). It does **not** need `bag`/`hold`/`score` — the bot is single-piece greedy.

### Spawn geometry (`lib/movement.ts`)

`spawnPiece(type, width)` → `rotation: 0`, `position.x = floor((width - BOUNDING_BOX[type]) / 2)`,
`y: 0`. On the 10-wide board (`COLS`): I→3, O→4, T/S/Z/J/L→3 (`BOUNDING_BOX` in `tetrominoes.ts`:
I=4, O=2, rest=3). A fresh active piece therefore has `rotation = 0` and a known anchor `x`.

`hardDrop(board, piece)` is deterministic from a given `(position, rotation)` — so if the planner
maneuvers the active piece to a candidate's `(column, rotation)` anchor at the top, a `hardDrop`
reproduces exactly that candidate's landing `cells`/`board`.

`moveLeft`/`moveRight`/`rotate` are all copy-on-write, no-op-returns-same-reference. Rotation via
SRS at `y = 0` on a clear-topped board is in-place (no `x` kick), because the `(0,0)` kick test
succeeds first.

## Mapping a candidate back to an input sequence

Given active piece `(type, r0, x0)` and a chosen candidate `(rotation rT, column cT)`:

1. **Rotate**: `(rT - r0) mod 4` `rotateCW` inputs. In open top space each is in-place → `x`
   unchanged, leaving anchor at `x0`, rotation `rT`.
2. **Shift**: `dx = cT - x0`; emit `|dx|` × (`"right"` if `dx > 0` else `"left"`).
3. **Drop**: one `"hardDrop"`.

For a freshly spawned active piece (`r0 = 0`, `x0 = spawn column`) on a board whose top rows are
empty, every rotate and shift is unobstructed, so the piece reaches `(cT, rT)` at `y = 0` and the
`hardDrop` lands exactly on the candidate.

## Constraints & assumptions

- **Purity / boundary.** `lib/**` is framework-free (eslint-enforced). `bot.ts` imports only other
  `lib/` modules and types — no React/Next. No bag/score mutation (reads `board` + `active` only).
- **Reachability boundary is inherited.** The planner reaches candidates via rotate-then-shift from
  the spawn column. This exactly matches the seam's "spawn-column hard-drop" model on a clear top;
  if the stack blocks lateral travel at `y = 0` (near top-out), a shift could no-op and a candidate
  become unreachable. Same boundary the seam already draws — tuck/slide is a later ticket.
- **Determinism.** `enumeratePlacements` order is fixed; `evaluate` is deterministic; argmax with a
  stable (keep-first) tie-break makes `chooseMove` fully deterministic.
- **No lookahead.** Single active piece only; bag peek / hold are out of scope (planner story done;
  lookahead lives in later E-008 planner work if any).

## Existing conventions to mirror

- Test files co-located `lib/*.test.ts`, vitest (`describe/it/expect`), board builders like
  `jaggedBoard()` / `flatClearingBoard()` using `emptyBoard(COLS, ROWS)`.
- Heavy module-level docstring stating purity, altitude, coordinate convention, and scope boundary
  (see `bot-placements.ts` / `bot-heuristic.ts`).
- Reuse-not-reimplement: land through `movement.hardDrop`, never re-derive shape/collision math.

## Files in play

- **Create:** `lib/bot.ts`, `lib/bot.test.ts`.
- **Read/import:** `lib/bot-placements.ts`, `lib/bot-heuristic.ts`, `lib/game.ts` (`step`, `Input`,
  `GameState`), `lib/types.ts`, `lib/constants.ts`, `lib/movement.ts`, `lib/board.ts` (tests).
- **Modify/delete:** none.
