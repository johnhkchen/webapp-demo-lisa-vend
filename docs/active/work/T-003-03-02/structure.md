# Structure — T-003-03-02 softdrop-harddrop-keys

Blueprint for the change. Four source files touched (2 `lib/`, 1 component, +3 test files). No
new files, no deletions.

## `lib/movement.ts` (modified)

Add one exported pure function beside `softDrop`:

```ts
/**
 * Hard-drop placement: translate `piece` straight down until the cell below is blocked, and
 * return the piece at that resting position. Pure translation — like `softDrop` it does NOT
 * lock/merge (the reducer commits the lock). If the piece is already resting, returns the input
 * `piece` reference unchanged (the no-op contract, via `softDrop`).
 */
export function hardDrop(board: Board, piece: Piece): Piece {
  let cur = piece;
  for (let next = softDrop(board, cur); next !== cur; next = softDrop(board, cur)) cur = next;
  return cur;
}
```

- Reuses `softDrop`'s same-reference no-op as the loop terminator. Bounded by board height.
- No new imports; no board writes (movement's boundary preserved).
- Update the module's scope-boundary comment: hard-drop *placement* now lives here; the lock is
  still the reducer's job.

## `lib/game.ts` (modified)

1. Import: `spawnPiece, moveLeft, moveRight, hardDrop` from `./movement`.
2. `Input` union: add `"hardDrop"`. Update the `Input` doc to describe it (instant drop → lock via
   the same pipeline) and keep the `softDrop`≡`tick` note.
3. `step` switch: new case (place before the `softDrop`/`tick` fallthrough):
   ```ts
   case "hardDrop":
     return descend({ ...state, active: hardDrop(state.board, state.active) });
   ```
   `gameOver` short-circuit at the top already covers `"hardDrop"` (no-op when over). Switch
   remains exhaustive over `Input`.
4. Module scope note: change "no hard-drop" → hard-drop implemented; keep "no soft-drop score
   bonus / no drop-distance scoring" as the still-deferred boundary.

Interface impact: `Input` widens by one variant. `GameState`, `descend`, `createInitialState`
unchanged. `useGame.dispatch(input: Input)` transparently accepts the new variant — **no hook
signature change**.

## `components/GameContainer.tsx` (modified)

1. `KEY_TO_INPUT` gains:
   ```ts
   ArrowDown: "softDrop",
   " ": "hardDrop",   // Space
   ```
2. `onKeyDown`, after `const input = KEY_TO_INPUT[event.key]; if (!input) return;`:
   ```ts
   // Hard-drop is edge-triggered: a held key must not lock+spawn on every OS auto-repeat.
   if (input === "hardDrop" && event.repeat) { event.preventDefault(); return; }
   ```
   Then the existing `event.preventDefault(); dispatch(input);`. Soft-drop/move keys keep
   consuming auto-repeat.
3. Module doc: soft/hard-drop are now wired (this ticket); drop keys are `ArrowDown` (soft, repeat)
   and Space (hard, edge). Remove the "drop keys deferred" fence.

## `components/useGame.ts` (modified — doc only)

Update the scope paragraph: soft-drop and hard-drop are now dispatchable through the same
`dispatch`; no code change (dispatch is generic over `Input`).

## Test files

### `lib/movement.test.ts` (modified)
- `hardDrop` on an empty board lands the piece on the floor (max cell y = `ROWS-1`).
- `hardDrop` onto a settled stack rests directly on top (one row above the obstacle).
- `hardDrop` on an already-resting piece returns the **same reference** (no-op contract).
- Board is never mutated (input board deep-equals a fresh copy).

### `lib/game.test.ts` (modified)
- `step(state, "hardDrop")` from spawn locks the piece into the board (4 settled cells) and spawns
  a fresh active above the stack; `gameOver` false on an empty board.
- Hard-drop result equals driving `softDrop`-equivalent `tick`s until lock (same board/score/lines)
  — proves it's a shortcut, not a divergent path. (Compare against a `tickUntilLocked` helper.)
- Hard-drop that completes a row clears it and awards `scoreFor` (reuse `fillRowExcept`).
- Hard-drop is a no-op once `gameOver` (returns the input state ref).

### `components/GameContainer.test.tsx` (modified)
- `ArrowDown` ⇒ `expectedAfter("softDrop")` (one accelerated row).
- Space (`{ key: " " }`) ⇒ `expectedAfter("hardDrop")` (piece drops to floor + locks + spawns).
- Held Space fires once: `keyDown(window, {key:" "})` then `keyDown(window, {key:" ", repeat:true})`
  settles exactly one piece (4 settled cells, not 8) — the edge-trigger guard.
- Update "ignores unmapped keys": drop the `ArrowDown` line (now mapped); keep `Enter`. Optionally
  assert Space with `repeat:true` alone is a no-op from spawn.
- **AC integration:** repeatedly fire Space until `gameOver` (bounded loop), asserting the game
  reaches `gameOver` via keyboard alone — a stranger can play spawn→over. Read game-over via the
  rendered board filling up / a bounded Space count, mirroring `tickUntilGameOver`'s bound.

## Ordering of changes

1. `lib/movement.ts` + `movement.test.ts` — the pure primitive first (independently verifiable).
2. `lib/game.ts` + `game.test.ts` — wire `"hardDrop"` into the reducer.
3. `components/GameContainer.tsx` + `GameContainer.test.tsx` — keys + edge guard + AC integration.
4. `components/useGame.ts` doc.

Each step compiles and tests green on its own; commit per step.
