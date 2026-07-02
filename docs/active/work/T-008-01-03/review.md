# T-008-01-03 — Review: choose-move-planner

## What changed

| File | Change | Notes |
|------|--------|-------|
| `lib/bot.ts` | **created** (~95 lines w/ docstrings) | `chooseMove` + private `bestPlacement`, `inputsFor`. |
| `lib/bot.test.ts` | **created** (~135 lines) | 6 unit tests, 4 describe blocks. |
| `docs/active/work/T-008-01-03/*` | **created** | research / design / structure / plan / progress / review. |

No existing source modified or deleted; no new dependencies. Single commit `19a71bb`.

## What it does

`chooseMove(state)` is the composing seam of the pure-bot track (S-008-01). It:

1. `enumeratePlacements(state.board, state.active.type)` — every legal `(rotation, column)`
   hard-drop of the active piece.
2. `bestPlacement` — argmax by `evaluate(candidate.board)`, replacing on strict `>` so the earliest
   candidate wins ties (deterministic, keep-first).
3. `inputsFor` — maps the winner `(rotation, column)` back to inputs relative to the active piece's
   actual `(rotation, x)`: `(rT − r0) mod 4` × `rotateCW`, then `cT − x0` lateral shifts, then one
   `hardDrop`. Folded through `step`, this lands the piece exactly on the chosen candidate.

**Altitude decision (the crux):** candidate `.board` fields go **straight into `evaluate` with no
`clearLines`**. Both seams live at the lock-only, pre-collapse boundary — a completed row is still
present on the candidate board, and `evaluate` counts it there. This is the shared contract
T-008-01-02's review flagged (its concern 1: "the planner must feed candidate `board` fields
straight in — if any caller ever pre-clears, the completed-lines reward vanishes"). Honored, and
re-documented in `bot.ts`'s docstring. This ticket is the first consumer to exercise it, and Block 2
proves it works (a line clears).

## Acceptance criterion

> `lib/bot.ts chooseMove(state)` returns an `Input[]` whose fold through `step(...)` lands the active
> piece at the highest-heuristic placement; unit tests assert deterministic, sane choices for fixed
> board+piece inputs (fills a near-complete row, avoids creating holes/excess height) and that the
> returned sequence is legal under `step` (`bot.test.ts` green).

✅ Met.
- **Lands at highest-heuristic placement, legal under `step`:** Block 1 folds `chooseMove` through
  `step` for 7 piece types and asserts `final.board === clearLines(expectedBest.board).board`,
  where `expectedBest` is an independent argmax oracle. Board-equality after a real `step` fold
  proves both enactment and legality in one check (a silently no-op'd shift would mismatch).
- **Deterministic:** Block 4 asserts `chooseMove(s) === chooseMove(s)` and no input mutation.
- **Fills a near-complete row:** Block 2 asserts `final.lines === 1`.
- **Avoids creating holes:** Block 3 asserts the chosen board adds no holes vs. input and is the
  true max.

Suite green: **285 tests, 29 files**. Lint clean (`--max-warnings 0`). Build passes (type-check).

## Test coverage

- **Enactment & legality** (Block 1) — 7 types on a jagged board; last input is `hardDrop`; only
  bot-legal tokens; board matches the cleared expected board.
- **Sane: line clear** (Block 2) — 1-wide well filled by vertical I → `lines` increments.
- **Sane: hole avoidance** (Block 3) — oracle-max sanity + zero new holes + enactment.
- **Determinism & purity** (Block 4) — stable output; board + active unmutated.
- **No legal placement** (Block 5) — topped-out board → `enumeratePlacements` empty → `chooseMove`
  returns `[]`.

### Gaps / not covered (intentional)
- **Reachability near top-out.** The rotate→shift→hardDrop maneuver assumes clear top rows (matches
  the seam's spawn-column reachability boundary). If the stack blocks a lateral shift at `y = 0`, a
  candidate could be unreachable and the emitted shift would no-op, landing the piece off-target.
  Not tested because it is the documented boundary of the current seam; tuck/slide-under is a later
  ticket. In a real game this coincides with imminent top-out.
- **Rotation-count minimality.** Always uses CW steps (`≤ 3`); a single CCW is never substituted.
  Zero behavioral difference, so left uniform (noted in `design.md` Decision 3).
- **Exact input sequences** are not pinned to literals — tests assert the *effect* (board after
  fold), so a future maneuver-synthesis change that still lands correctly won't churn tests.

## Open concerns / notes for the reviewer

1. **Greedy, single-piece.** `chooseMove` ignores the bag lookahead and hold slot — it optimizes the
   current piece only. This is the AC's scope; multi-piece search / lookahead is later E-008 work if
   pursued. Play strength (P5) is asserted only indirectly (line-clear + hole-avoidance on fixed
   boards); real quality is observable once the attract driver (T-008-02) runs a full game.
2. **Reachability boundary is now load-bearing across three modules.** `enumeratePlacements` skips
   spawn-collision columns, and `chooseMove` reaches the rest by lateral travel from spawn. If a
   future ticket adds tuck/slide placements to the seam, `inputsFor` must grow to synthesize those
   maneuvers or the new candidates won't be enactable. Flagged for whoever extends reachability.
3. **`bestPlacement`/`inputsFor` are module-private.** Tested through `chooseMove` and an independent
   oracle rather than exported — keeps the public surface to one function. If the attract driver
   later wants the chosen *candidate* (not just inputs) for logging/telemetry, that's a small
   additive export, not a rework.

No known bugs or TODOs left in code.
