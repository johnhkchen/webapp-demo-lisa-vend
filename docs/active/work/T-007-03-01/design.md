# Design — T-007-03-01 hold-slot-core

## Decision

Extend the reducer with three additions, all inside `lib/game.ts`:

1. **`GameState.hold: TetrominoType | null`** — the held piece *identity* (`null` = empty).
2. **`GameState.canHold: boolean`** — the once-per-drop lock flag (`true` = a hold is
   allowed for the current piece).
3. **`Input` gains `"hold"`**, handled by a new private `hold(state)` helper that `step`
   delegates to.

```ts
interface GameState { …; hold: TetrominoType | null; canHold: boolean }
type Input = … | "hold";
```

`hold(state)` semantics:

```ts
function hold(state: GameState): GameState {
  if (!state.canHold) return state;                       // second hold before lock → no-op
  const width = state.board[0].length;
  const stashed = state.active.type;                      // active's identity goes to hold
  const incoming = state.hold ?? state.bag.next();        // swap-in, or draw when empty
  const active = spawnPiece(incoming, width);             // re-spawn fresh (rot 0, centered)
  const gameOver = collides(board, active.type, active.position, active.rotation);
  return { ...state, active, hold: stashed, canHold: false, gameOver };
}
```

And `descend` resets the flag on the lock/spawn branch only:

```ts
const active = spawnPiece(state.bag.next(), width);
return { ...state, board, active, score, lines, gameOver, canHold: true };
```

`createInitialState` seeds `hold: null, canHold: true`.

## Why this shape

### `hold` stores a `TetrominoType`, not a `Piece`

A held piece re-enters the field **fresh** — spawn rotation, spawn column — never at the
position/rotation it left. Storing a positioned `Piece` would carry stale coordinates that
`spawnPiece` immediately discards, inviting the bug where a restored hold appears mid-board.
Storing the identity makes the "fresh re-spawn" invariant hold *by construction*: the only
way back onto the field is through `spawnPiece(id, width)`, the same constructor every other
spawn uses. This also matches how `bag` deals ids (not pieces) and keeps `GameState`
minimal.

### `canHold: boolean` as the "lock flag"

The ticket calls for a "once-per-drop lock flag." A boolean is the minimal encoding:
`true` when a hold is available for the current piece, flipped `false` the instant hold is
used, and reset `true` when the *next* piece spawns via the lock pipeline. Naming it for the
*allowed* state (`canHold`) reads naturally at the guard (`if (!state.canHold) return state`)
and at the reset (`canHold: true`).

The reset lives in `descend`'s lock branch because that is the **single lock site** in the
engine (Research). Putting it anywhere else — or trying to reset it on every `descend` call —
would either miss locks or wrongly re-enable hold on a non-locking gravity tick. Because
`hardDrop` routes through `descend`, hard-drops reset the flag for free; no duplicate logic.

### Empty-hold vs. occupied-hold in one branch

`state.hold ?? state.bag.next()` collapses both cases: when hold is empty, draw the next id
from the bag (the active piece is "put away" and the queue supplies its replacement); when
hold is occupied, use the held id and touch the bag **not at all**. The `??` short-circuits,
so `bag.next()` is only called — and the bag only advances — on the empty path. This is the
one subtlety a reviewer must confirm: an occupied-hold swap must not consume a bag draw, or
the piece sequence desyncs from a never-held game.

### Reuse `collides` for top-out on the swapped-in piece

`descend` already sets `gameOver` when a fresh spawn collides with the stack. A hold-swap
spawns a piece into the same top region, so the identical collision check applies — a swap
into a piece that can't fit tops out, consistently with a normal spawn. Reusing `collides`
(rather than skipping the check) keeps the two spawn sites behaviorally aligned and costs one
line. On an ordinary mid-air hold the top rows are clear, so `gameOver` stays `false`.

## Alternatives considered

### A) Store a positioned `Piece` in `hold` — rejected

Requires deciding whether to preserve rotation/position (non-standard, feels buggy) or reset
them anyway (then why store them?). Strictly worse than storing the identity; adds state that
`spawnPiece` throws away.

### B) Encode the flag as `holdUsedThisDrop` (inverted) — rejected

Behaviorally identical, but the guard becomes `if (state.holdUsedThisDrop) return state` and
the initial/reset value is `false`, which reads as "no hold has happened" — fine, but the
positive framing (`canHold`) matches the guideline vocabulary ("hold available") and the
no-op guard reads more directly. A cosmetic choice; `canHold` wins on readability.

### C) Inline the hold logic in `step`'s `switch` — rejected

`step`'s other multi-line branch (`hardDrop`, `descend`) already delegates to a named helper.
A `hold(state)` helper mirrors that, keeps the `switch` a flat dispatch table, and gives the
top-out/bag-draw subtlety a documented home. Consistency with `descend`.

### D) Reset `canHold` in `step` on every lock-producing input — rejected

Would duplicate lock detection outside `descend` (the reducer can't tell from the input alone
whether a `tick` locked). The flag must reset exactly when a piece locks, which only `descend`
knows. Single source of truth.

## AC mapping

> step handles a 'hold' input: first hold stashes/swaps the active piece, a second hold
> before lock is a no-op, and the flag resets on lock.

- **First hold stashes/swaps** — `hold()` moves `active.type` into `hold` and spawns the
  incoming id as the new `active` (draw on empty, swap on occupied). ✓
- **Second hold before lock is a no-op** — `if (!state.canHold) return state` returns the
  *same reference*; `canHold` was set `false` by the first hold and only `descend` resets it.
  ✓
- **Flag resets on lock** — `descend`'s lock branch sets `canHold: true` when the next piece
  spawns. ✓

All asserted by new `game.test.ts` cases (see plan.md).

## Invariants preserved

- **Purity / framework-free**: only `lib/game.ts` changes; no new imports beyond ones already
  present (`spawnPiece`, `collides`, `TetrominoType`).
- **`gameOver` no-op**: `step` still short-circuits before dispatch, so `"hold"` is a no-op
  once the game is over.
- **Determinism**: given identical seed + input sequence (including holds), play is identical;
  only the empty-hold path advances the bag, and it does so predictably.
- **Copy-on-write**: `hold()` returns a fresh `GameState`; it never mutates the input's board
  or piece (the only side effect remains the shared `bag`, and only on the empty path).
