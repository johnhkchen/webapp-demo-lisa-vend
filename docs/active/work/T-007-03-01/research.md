# Research — T-007-03-01 hold-slot-core

## Ticket in one line

Extend `GameState` with a **hold slot** plus a **once-per-drop lock flag**, and add a
`"hold"` `Input` to `step` that swaps `active`↔`hold`, blocking a second hold until the
next lock. Advances P4 (feel) and P5 (engineering rigor).

## Where this sits in the epic

- Epic **E-007** (feel-pack-and-line-clear-juice) — the player-polish layer. Story
  **S-007-03** (hold-queue) has two tickets:
  - **T-007-03-01** (this one) — the *pure core*: hold slot + lock flag + `"hold"` input in
    the reducer.
  - **T-007-03-02** (depends on this, per the story) — the *render/input wiring*: surface the
    held piece in the view and bind a key to the `"hold"` input.
- Like the ghost story, the dependency edge means this ticket must NOT touch the React layer.
  Its whole surface is the pure reducer module `lib/game.ts` plus `lib/game.test.ts`.

## The reducer as it stands (`lib/game.ts`)

`game.ts` is the *composition root* — the single pure `step(state, input)` reducer that ties
every `lib/` primitive into a running state machine. It is framework-free (the `lib/**`
eslint boundary forbids React/Next imports) and deterministic given seed + input sequence.

### `GameState` (current shape)

```ts
interface GameState {
  board: Board;      // settled cells only; active is kept separate
  active: Piece;     // the falling piece (always present; end signalled by gameOver)
  bag: SevenBag;     // live seeded 7-bag (the one intentional mutable field)
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
}
```

The header documents an intentional design choice: `bag` is a **live** mutable object whose
`next()` advances closure state — the one side effect `step` performs when it spawns. "Pure"
here means framework-free and deterministic, not strict value-purity.

### `Input` (current alphabet)

```ts
type Input = "left" | "right" | "rotateCW" | "rotateCCW" | "softDrop" | "hardDrop" | "tick";
```

### `createInitialState(seed)`

Builds an empty `COLS×ROWS` board, a seeded bag, and the first spawned piece. Returns
`{ board, active, bag, score: 0, lines: 0, level: 1, gameOver: false }`.

### `descend(state)` — the lock pipeline (private)

```ts
const result = applyGravity(state.board, state.active);
if (!result.locked) return { ...state, active: result.piece };  // still falling

const { cleared, board } = clearLines(result.board);
const score = state.score + scoreFor(cleared, state.level);
const lines = state.lines + cleared;
const active = spawnPiece(state.bag.next(), board[0].length);
const gameOver = collides(board, active.type, active.position, active.rotation);
return { ...state, board, active, score, lines, gameOver };
```

This is the **only place a lock happens** and the only place a piece is spawned mid-game
(the first spawn is in `createInitialState`). Both spawn sites go through
`movement.spawnPiece(id, width)`.

### `step(state, input)` — the reducer

- `gameOver` short-circuits: any input returns the input state unchanged (no-op).
- `left/right/rotateCW/rotateCCW` transform only `active` via the collision-gated
  movement/rotation helpers; board untouched.
- `hardDrop` → `descend({ ...state, active: hardDrop(board, active) })` (instant drop reuses
  the lock pipeline).
- `softDrop`/`tick` → `descend(state)`.
- The `switch` is **exhaustive** over the `Input` union with no `default` — TypeScript's
  exhaustiveness checking means adding a case to `Input` forces a matching `case` here (a new
  member with no branch is a compile error). This is the guardrail for adding `"hold"`.

## Supporting primitives relevant to hold

- **`movement.spawnPiece(type, width): Piece`** — constructs a fresh piece at rotation 0,
  `y = 0`, horizontally centered by bounding box (I→3, O→4, rest→3 on a 10-wide board). Pure
  *placement*: does not read the board or decide top-out. This is exactly what a hold-swap
  needs to re-materialize a held id as a falling piece (a held piece is re-spawned fresh, not
  restored at its previous position/rotation — standard Tetris hold behavior).
- **`collision.collides(board, type, pos, rot): boolean`** — true iff any resolved cell is
  out of bounds or overlaps a settled cell. Used by `descend` to set `gameOver` on spawn; a
  hold-swap that spawns a new piece can reuse it identically.
- **`bag.SevenBag`** — `next()` consumes an id; `peek(n)` is non-consuming lookahead
  (added in T-007-01-01). A hold-swap that pulls from the bag (empty-hold case) calls
  `next()`; a swap with an occupied hold does **not** touch the bag.
- **`types.ts`** — `TetrominoType`, `Piece { type, rotation, position }`. A hold slot stores
  an **identity** (`TetrominoType`), not a positioned `Piece`, because a restored hold
  re-spawns fresh.

## Standard "hold" semantics (the behavior to model)

Modern guideline Tetris hold:
1. First hold in a drop: the active piece's identity moves into the hold slot; a new piece
   comes from the queue (bag) and becomes active.
2. Subsequent holds: swap active↔hold — the held identity re-spawns as active, the active's
   identity goes to hold. No queue draw.
3. **Once per drop**: after using hold, it is locked until the current piece *locks*; a second
   hold before lock is a no-op. The flag resets on lock (when a new piece spawns via the lock
   pipeline).
4. A held piece re-enters **fresh** (spawn rotation/position), not where it left off.

## Test conventions (`lib/game.test.ts`)

- Vitest `describe`/`it`. Helpers already present: `fillTopCenter()`, `fillRowExcept()`,
  `tickUntilGameOver()`. Tests build `GameState` via `{ ...createInitialState(seed), ... }`
  overrides to place a specific board/active.
- `pieceCells` is imported for cell-level assertions. Seeds are chosen so a known first piece
  spawns (e.g. `createInitialState(1)`).
- Existing tests assert reference-identity no-op contracts (`toBe`) and value equality
  (`toEqual`) — the hold no-op case should assert `step(s, "hold") === s` on a locked flag.

## Assumptions & constraints

- **Purity boundary**: no React/Next imports; `lib/game.ts` + its test only.
- The bag is shared-mutable — hold-swap tests that compare two games must use **separate**
  `createInitialState` calls (the existing hard-drop test documents this exact hazard).
- `descend` is the single lock site, so the flag reset lives there — nowhere else.
- Deterministic: the empty-hold path draws from the bag, so a held game and a never-held game
  from the same seed diverge in draw order; tests must account for that.
- No scope creep: no render, no key binding, no "hold count" scoring — just state + reducer.
