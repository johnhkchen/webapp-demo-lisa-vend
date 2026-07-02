# T-008-01-03 — Structure: choose-move-planner

## Files

| File | Action | Purpose |
|------|--------|---------|
| `lib/bot.ts` | **create** (~90 lines w/ docstrings) | `chooseMove(state)` planner. |
| `lib/bot.test.ts` | **create** (~130 lines) | Unit tests for the AC. |
| `docs/active/work/T-008-01-03/*` | **create** | RDSPI artifacts. |

No existing source is modified or deleted. No new dependencies. Everything imported already exists.

## `lib/bot.ts`

### Module docstring
State: pure/framework-free (`lib/**` boundary); it is the third and composing seam of the pure-bot
track (S-008-01), tying `enumeratePlacements` (candidates) and `evaluate` (scoring) into a move
chooser. Note the shared lock-only altitude (candidate boards go into `evaluate` un-cleared), the
coordinate convention, and the scope boundary: single-piece greedy argmax, spawn-column reachability
inherited from the seam, no lookahead/hold/lock-timing.

### Imports
```ts
import type { Input, GameState } from "./game";
import type { RotationState } from "./types";
import { enumeratePlacements, type PlacementCandidate } from "./bot-placements";
import { evaluate } from "./bot-heuristic";
```

### Internal helpers (module-private)

```ts
// Best candidate by evaluate(candidate.board), keep-first on ties. null if none.
function bestPlacement(candidates: PlacementCandidate[]): PlacementCandidate | null
```
Loop with a running `best`/`bestScore`; strict `>` replacement so the earliest max wins. Returns
`null` for an empty input (keeps the empty-list decision in one obvious place).

```ts
// Rotate→shift→hardDrop inputs taking active (r0,x0) to the candidate (rT,cT).
function inputsFor(from: { rotation: RotationState; x: number }, to: PlacementCandidate): Input[]
```
- `k = (to.rotation - from.rotation) & 3` → push `"rotateCW"` k times.
- `dx = to.column - from.x` → push `"right"`×dx (dx>0) or `"left"`×(−dx) (dx<0).
- push `"hardDrop"`.

### Public function

```ts
export function chooseMove(state: GameState): Input[] {
  const candidates = enumeratePlacements(state.board, state.active.type);
  const best = bestPlacement(candidates);
  if (best === null) return [];
  return inputsFor(
    { rotation: state.active.rotation, x: state.active.position.x },
    best,
  );
}
```

### Ordering within the file
1. Docstring. 2. Imports. 3. `bestPlacement`. 4. `inputsFor`. 5. `chooseMove`. (Helpers before the
public fn that uses them; mirrors the other `lib/` modules.)

## `lib/bot.test.ts`

### Imports
`describe/it/expect` from vitest; `chooseMove` from `./bot`; `enumeratePlacements` from
`./bot-placements`; `evaluate` from `./bot-heuristic`; `step`, `createInitialState`, `type GameState`
from `./game`; `spawnPiece` from `./movement`; `clearLines` from `./line-clear`; `emptyBoard` from
`./board`; `COLS`, `ROWS` from `./constants`; types from `./types`.

### Test-local helpers
```ts
// Build a controllable GameState: fixed board + freshly spawned active piece of `type`,
// with a real seeded bag (createInitialState then override board/active) so step() has a bag.
function stateWith(board: Board, type: TetrominoType): GameState
// Fold a sequence of inputs through step from a starting state.
function play(state: GameState, inputs: Input[]): GameState
// Independent argmax oracle used to compute the expected placement in tests.
function expectedBest(board: Board, type: TetrominoType): PlacementCandidate
```
`stateWith` gets a valid `bag` from `createInitialState(seed)`, then spreads a fresh board + active.
Active is `spawnPiece(type, COLS)` so it mirrors a real spawn (rotation 0, canonical column).

### Describe blocks / cases (see plan.md for full assertions)
1. **acceptance — enactment & legality**: on a jagged board, for several piece types, folding
   `chooseMove` through `step` yields `finalState.board === clearLines(expectedBest.board).board`;
   last input is `"hardDrop"`.
2. **acceptance — sane: fills a near-complete row**: bottom row full but one gap; the piece that
   fits it → folding increments `finalState.lines` (a line cleared).
3. **acceptance — sane: avoids holes/excess height**: a board where one placement is hole-free and
   others bury holes / stack tall → chosen candidate's `evaluate` equals the max and the chosen
   board has zero new holes.
4. **determinism & purity**: `chooseMove(s)` deep-equals a second call; input `state` (board+active)
   unmutated.
5. **empty candidates**: board filled to the top everywhere → `chooseMove` returns `[]`.

## Interfaces & boundaries touched

- **No public type changes.** `chooseMove` consumes existing `GameState`/`Input`, returns `Input[]`.
- **Boundary honored:** `bot.ts` imports only `lib/` — no framework. Reads `board`+`active`, writes
  nothing.
- **Composition altitude:** candidate `.board` → `evaluate` directly, no `clearLines` in `bot.ts`.

## Change ordering
Create `lib/bot.ts`, then `lib/bot.test.ts`, then run test/lint/build, then commit. Single atomic
commit (new files only, no cross-file coupling).
