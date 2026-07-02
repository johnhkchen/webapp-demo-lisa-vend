# T-008-01-03 — Plan: choose-move-planner

## Steps (single atomic commit)

### Step 1 — write `lib/bot.ts`
Module docstring (purity, lock-only composition altitude, coordinate convention, scope boundary),
then `bestPlacement` (argmax, keep-first tie-break, `null` on empty), `inputsFor` (rotate-CW ×k →
shift ×dx → hardDrop), then `chooseMove` (enumerate → best → inputs, `[]` when no candidate). Import
only from `lib/`.

### Step 2 — write `lib/bot.test.ts`
Test-local helpers `stateWith` / `play` / `expectedBest`, then the five describe blocks below.

### Step 3 — verify
`npm test` (whole suite green, incl. new file), `npm run lint` (`--max-warnings 0`), `npm run build`
(type-check). Fix anything red.

### Step 4 — commit
`feat(bot): compose seam + heuristic into chooseMove planner` — `lib/bot.ts`, `lib/bot.test.ts`, and
the T-008-01-03 work artifacts.

## Testing strategy — detail

Central assertion (Design Decision 5): after folding `chooseMove(state)` through `step`,
`finalState.board` equals `clearLines(expectedBest(board, type).board).board`, where `expectedBest`
is an independent argmax over `enumeratePlacements` scored by `evaluate`. This proves the returned
sequence both (a) is legal under `step` and (b) enacts the top-scored placement — one check covers
both AC clauses.

### Block 1 — acceptance: enactment & legality
- Board: `jaggedBoard()` (bottom row full save a 2-wide notch, a short tower) — top rows clear, so
  every maneuver is unobstructed.
- For `type` in `["T","L","S","I","O","J","Z"]`:
  - `inputs = chooseMove(stateWith(board, type))`.
  - `expect(inputs.at(-1)).toBe("hardDrop")`.
  - `final = play(stateWith(board, type), inputs)`.
  - `expect(final.board).toEqual(clearLines(expectedBest(board, type).board).board)`.
- Also assert `inputs` contains only bot-legal tokens (`rotateCW`/`left`/`right`/`hardDrop`).

### Block 2 — acceptance: fills a near-complete row
- Board: bottom row filled for all `x` except one gap at a chosen column, gap fillable by a vertical
  `I` (or `O`/`T` variant). No holes elsewhere.
- `final = play(stateWith(board, "I"), chooseMove(...))`.
- `expect(final.lines).toBeGreaterThan(startState.lines)` (i.e. `>= 1`) — the chosen move completed
  and cleared the row. Confirms the positive completed-lines weight actually drives the choice
  through the direct (un-cleared) pass into `evaluate`.

### Block 3 — acceptance: avoids holes / excess height
- Board: a shallow surface where at least one placement is hole-free and flat, while others would
  bury a hole or build height (e.g. a one-cell well the piece can either cap — making a hole — or
  fill cleanly).
- `chosen = expectedBest(board, type)`; assert `evaluate(chosen.board)` equals the max over all
  candidates (sanity of the oracle), and that folding `chooseMove` reproduces `chosen` (board match
  as in Block 1). Assert the chosen board introduces **no new holes** vs. the input
  (`boardFeatures(chosen.board).holes === boardFeatures(board).holes`) — the greedy pick avoids
  hole creation when a clean option exists.

### Block 4 — determinism & purity
- `s = stateWith(jaggedBoard(), "T")`.
- `expect(chooseMove(s)).toEqual(chooseMove(s))` (stable output).
- Snapshot `s.board` (deep copy) and `s.active`; call `chooseMove(s)`; assert board deep-equals the
  snapshot and `s.active` is unchanged (no mutation).

### Block 5 — empty candidates
- Board: every cell filled to `y = 0` across all columns (top-out board) so `enumeratePlacements`
  returns `[]`.
- `expect(chooseMove(stateWith(fullBoard, "T"))).toEqual([])`.

## Verification criteria (maps to AC)

- [ ] `chooseMove` returns an `Input[]` that, folded through `step`, lands the active piece at the
  highest-`evaluate` candidate (Blocks 1, 3 board-equality).
- [ ] Deterministic, sane choices for fixed inputs: fills a near-complete row (Block 2), avoids
  holes/excess height (Block 3), deterministic (Block 4).
- [ ] Returned sequence is legal under `step` (Blocks 1–3 fold without silent no-op; board matches).
- [ ] `bot.test.ts` green; full suite green; lint clean; build passes.

## Risks / mitigations
- **Maneuver blocked near top-out** → out of scope; tests use clear-topped boards, matching the
  seam's spawn-column reachability boundary (documented).
- **Line-clear in Block 1 board-equality** → handled: expected side is `clearLines(candidate.board)`
  so a clearing choice still matches.
- **Tie-break drift** → strict-`>` keep-first; asserted stable in Block 4.

## Rollback
New files only; `git rm lib/bot.ts lib/bot.test.ts` fully reverts. No other module depends on
`bot.ts` yet (the attract driver, T-008-02, is a later story).
