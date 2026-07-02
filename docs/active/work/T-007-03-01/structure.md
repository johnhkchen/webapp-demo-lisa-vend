# Structure — T-007-03-01 hold-slot-core

## Files

### Modified

**`lib/game.ts`** — the reducer. All production changes live here. No new files: hold is a
reducer concern, not a new primitive (unlike ghost, which earned its own module). Five edits:

1. **`GameState` interface** — add two fields after `gameOver` (or grouped logically):
   ```ts
   /** The held piece identity (null = empty). A held piece re-enters the field fresh via
    *  spawnPiece — its previous rotation/position is intentionally not stored. */
   hold: TetrominoType | null;
   /** The once-per-drop lock flag: true when a hold is allowed for the current piece.
    *  Set false when hold is used; reset true when the next piece locks-and-spawns. */
   canHold: boolean;
   ```

2. **`Input` union** — add `"hold"`:
   ```ts
   export type Input = … | "tick" | "hold";
   ```
   Update the `Input` JSDoc to describe `"hold"` (swap active↔hold, once per drop).

3. **`createInitialState`** — seed the new fields:
   ```ts
   return { board, active, bag, score: 0, lines: 0, level: 1, gameOver: false,
            hold: null, canHold: true };
   ```

4. **`descend`** — on the lock/spawn branch only, reset the flag:
   ```ts
   return { ...state, board, active, score, lines, gameOver, canHold: true };
   ```
   The non-locking early return (`{ ...state, active: result.piece }`) is unchanged — a
   falling tick must not touch `canHold`.

5. **New private `hold(state)` helper + `step` case**:
   ```ts
   function hold(state: GameState): GameState {
     if (!state.canHold) return state;
     const width = state.board[0].length;
     const stashed = state.active.type;
     const incoming = state.hold ?? state.bag.next();
     const active = spawnPiece(incoming, width);
     const gameOver = collides(state.board, active.type, active.position, active.rotation);
     return { ...state, active, hold: stashed, canHold: false, gameOver };
   }
   ```
   In `step`'s `switch`:
   ```ts
   case "hold":
     return hold(state);
   ```

**`lib/game.test.ts`** — add a `describe("hold slot", …)` block (see plan.md for cases).

### Created / Deleted

None.

## Imports

`spawnPiece` and `collides` are **already imported** by `game.ts`. `TetrominoType` must be
added to the existing `import type { … } from "./types"` line (currently imports `Board`,
`Piece`). No other import changes; the purity boundary is untouched.

## Public interface delta

- `GameState` gains `hold: TetrominoType | null` and `canHold: boolean`. Both are required
  fields — every construction site (`createInitialState`, and the `hold`/`descend` return
  objects, which spread `...state`) supplies them. **Consumers that build a `GameState`
  literal by hand would break**, but the only such sites are in `game.test.ts` (all via
  `{ ...createInitialState(seed), … }` spreads, which inherit the defaults) — no non-test
  code constructs `GameState` directly (the renderer holds one from `createInitialState` and
  threads it through `step`). Confirmed by the reducer being the composition root.
- `Input` gains `"hold"`. The exhaustive `switch` forces the new `case` — a compile error
  until added, which is the intended guardrail.

## Ordering of changes

The edits are interdependent (a `GameState` literal missing the new fields won't type-check),
so they land as **one atomic commit**:

1. Add fields to `GameState` + `Input` member + JSDoc.
2. Seed defaults in `createInitialState`.
3. Add `canHold: true` to `descend`'s lock branch.
4. Add the `hold` helper and the `"hold"` case.
5. Add `TetrominoType` to the type import.

Then tests. Everything compiles only once all five are in place; there is no meaningful
smaller unit than "the whole reducer change," so a single commit is correct.

## Internal organization

- The `hold` helper sits next to `descend` (both are private lock-pipeline-adjacent helpers),
  above `step`. Its JSDoc documents the two subtleties: the `??` bag-draw-only-on-empty
  short-circuit, and the `collides` top-out reuse.
- `step`'s `switch` stays a flat dispatch: multi-line logic delegates (matching `hardDrop`).

## Non-goals (explicit scope fence)

- No render of the held piece, no key binding — that is T-007-03-02.
- No "hold" sound/animation, no hold-swap scoring, no infinite-hold prevention beyond the
  once-per-drop flag (the flag *is* the prevention).
- No change to `bag`, `movement`, `collision`, or any other `lib/` module.
