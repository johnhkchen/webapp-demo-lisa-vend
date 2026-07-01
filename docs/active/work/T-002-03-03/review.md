# Review — T-002-03-03 game-core-reducer-and-game-over

## Summary

Added `lib/game.ts`, the **composition root** of the pure game core: a single
`step(state, input): GameState` reducer that ties together every primitive built in E-002 —
spawn, left/right, rotate (SRS), gravity + lock, line-clear, and scoring — plus
`createInitialState(seed)`, and the `GameState` / `Input` types. On a lock, `step` runs the
fixed pipeline the primitive docstrings promised (`clearLines → scoreFor → accumulate → spawn
next → collide?`), and flags **game-over (top-out)** when a fresh spawn collides with the
settled stack. Once `gameOver` is set, `step` is a no-op. No React/Next import; no existing
file touched. This closes story S-002-03's reducer/game-over ticket and the E-002
`pure-lib-api` surface.

## Files changed

| File | Action | Notes |
|---|---|---|
| `lib/game.ts` | created | `GameState`, `Input`, `createInitialState`, `step` (+ private `descend`); ~135 lines incl. docstrings |
| `lib/game.test.ts` | created | 9 tests, 4 `describe` groups incl. the AC end-to-end top-out |

Commit: `e4dc140 feat(T-002-03-03): add pure step(state,input) reducer + game-over top-out with vitest`

## Acceptance criteria

> `step(state,input)` is exported with no React/Next import; a test plays a short sequence
> end-to-end and asserts game-over is set when spawning into an occupied top row.

✅ **Met.**
- `step` (and `createInitialState`) exported from `lib/game.ts`; imports are all sibling
  `lib/` modules — no React/Next (the `lib/**` eslint boundary passes with 0 warnings).
- Test `game-over on spawn into an occupied top row (AC)`: pre-fills the top rows' center
  columns, drives `tick`s that lock an `O` in the empty left columns, and asserts
  `gameOver === true` when the reducer spawns the next piece into the occupied top. Also
  asserts the pre-filled rows were **not** cleared (they were never full) and `lines === 0`.

## Test coverage

`npm run test` → **11 files, 115 tests passed** (9 new). `npm run lint` → clean.

Covered:
- `createInitialState`: empty board, spawned `active`, `score/lines=0`, `level=1`,
  `gameOver=false`; same-seed determinism of the first piece.
- Lateral inputs: `left`/`right` shift `x` by ∓1 and leave the board reference untouched;
  a wall-blocked move returns the same `active` reference (no-op contract); `rotateCW`/
  `rotateCCW` change `rotation` (0→1, 0→3).
- Descent: a `tick` with room falls one row and keeps the board reference; a lock that
  completes a row clears it, `lines += 1`, `score += scoreFor(1, level) = 40`.
- Game-over: top-out sets `gameOver`; a further input on a finished game returns the same
  state reference.

Gaps (intentional): no soft-drop-specific behavior (it aliases `tick`), no level-progression
test (not implemented), no multi-line/tetris scoring-through-the-reducer case (the scoring
tiers themselves are exhaustively covered in `scoring.test.ts`; here one single-line case
proves the wiring). No hard-drop (no primitive exists).

## Design decisions worth a reviewer's eye

- **Live 7-bag stored on `GameState` (design option A1).** `step` calls `state.bag.next()`
  when it spawns, so the reducer can detect top-out on its own — but the bag is a *mutating
  closure*, so `GameState` isn't a plain serializable value and `step` isn't strictly
  referentially transparent w.r.t. the piece stream. **This is the main thing to confirm.**
  "Pure" here = framework-free + deterministic given the seed and input sequence. If
  serializable saves/replays are wanted later, `rng.ts`/`bag.ts` need a pure state-machine
  refactor (option A3) — deliberately deferred, not required by the AC.
- **`active: Piece` is non-nullable.** Spawn is synchronous inside `step`; on top-out the
  overlapping spawned piece is retained as `active` and `gameOver` is set. Avoids null-guards
  and keeps an intermediate "no piece" state no caller ever observes off the type.
- **`softDrop` aliases `tick`.** Kept as a distinct `Input` so a later ticket can add a
  soft-drop score bonus/timing without changing the alphabet; today both are one gravity step.
- **`level` carried, not advanced.** `scoreFor(cleared, state.level)` consumes it correctly,
  but level-up cadence (e.g. +1 / 10 lines) is out of scope and left to a later ticket.

## Open concerns / follow-ups

- **Bag purity (A1)** — the one item needing downstream alignment; flagged above.
- **Level progression** unimplemented — if a UI/scoring ticket expects `level` to climb, that
  logic lands there (the formula is already level-aware).
- No `app/`/`components/` wiring — consuming `step` from a React `requestAnimationFrame` loop
  is a later epic (E-003+).

## Verification commands

```
npm run test   # 115 passed (11 files)
npm run lint   # clean, 0 warnings
```
