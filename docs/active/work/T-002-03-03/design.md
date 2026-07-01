# Design — T-002-03-03 game-core-reducer-and-game-over

## Decision summary

Add one new pure module `lib/game.ts` exporting:

- `GameState` — the full game snapshot (board, active piece, bag, score, lines, level,
  gameOver).
- `Input` — a string union of player/timer intents:
  `"left" | "right" | "rotateCW" | "rotateCCW" | "softDrop" | "tick"`.
- `createInitialState(seed)` — factory that builds an empty board, a seeded bag, and spawns
  the first piece.
- `step(state, input): GameState` — the reducer.

`step` handles lateral intents by delegating to the movement/rotation functions on
`state.active`; it handles descent intents (`tick`, `softDrop`) via `applyGravity`, and on a
lock runs the fixed `clearLines → scoreFor → accumulate → spawn-next → collide?→game-over`
pipeline. Once `gameOver` is set, `step` is a no-op.

## Options considered

### A. Where does the "next piece" source live?

**A1 — Bag stored on `GameState` (chosen).** `GameState.bag: SevenBag`. `step` calls
`state.bag.next()` when it needs to spawn. Pros: `step` can spawn and thus detect top-out
entirely on its own (satisfies the AC directly); minimal new code; reuses `bag.ts` as-is.
Con: the bag is a *live, mutating* closure, so `GameState` is not a plain serializable value
and `step` is not strictly referentially transparent w.r.t. the piece stream (calling `step`
twice on the same state object advances the *shared* bag). This is the accepted wart.

**A2 — Caller supplies the next piece as part of the input** (`{type:"tick", next?:...}`).
Keeps `step` value-pure. Rejected: pushes bag management up to a caller that doesn't exist
yet, and makes the *reducer* no longer "tie spawn together" — the ticket explicitly puts
spawn + game-over inside `step`. It also complicates the game-over test.

**A3 — Serialize RNG state into `GameState`** (store `seed`+cursor or the mulberry32 state,
re-derive the stream functionally). Cleanest purity story. Rejected for scope: `rng.ts` and
`bag.ts` are closure-based today; refactoring them into pure state machines is its own ticket
and not required by the AC. Documented as a future refactor.

**Verdict:** A1. "Pure" in the AC means *framework-free and deterministic given the seed*,
which A1 satisfies (same seed + same input sequence ⇒ same game). The referential-transparency
nuance is documented, not solved, here.

### B. `Input` representation

**B1 — string union (chosen):** `"left" | "right" | … | "tick"`. Matches the 1:1 mapping to
existing zero-extra-arg functions (`moveLeft`, `rotateCW`, `applyGravity`), reads cleanly at
call sites (`step(s, "left")`), and is trivially exhaustive-checked in a `switch`.

**B2 — discriminated object union** (`{type:"move", dx:-1}`). More extensible (room for
hard-drop distance, soft-drop repeat count). Rejected: no current input needs a payload;
the object shape is ceremony without benefit. Easy to migrate later if hard-drop lands.

### C. `active` nullability

**C1 — `active: Piece`, always non-null (chosen).** `createInitialState` spawns immediately;
the lock branch spawns the replacement synchronously; on top-out we keep the *overlapping*
spawned piece as `active` and set `gameOver`. Avoids null-guards scattered through the
reducer and keeps the type honest ("there is always a current piece; play may be over").

**C2 — `active: Piece | null`** with `null` meaning "awaiting spawn". Rejected: introduces an
intermediate state no caller observes (spawn is synchronous within `step`) and forces every
branch to null-check.

### D. What `softDrop` does vs `tick`

Both descend one row through `applyGravity` and therefore share the identical lock pipeline.
They are kept as **distinct inputs** (so a future ticket can add a soft-drop score bonus or
different timing without changing the input alphabet) but currently resolve to the same
`descend` helper. Documented as intentional. Hard-drop is **not** added (no `lib` primitive
for it yet; out of scope per research).

### E. Game-over trigger & post-game behavior

- Trigger: after a lock, spawn the next piece and test `collides(board, spawned…)`. If it
  collides → `gameOver = true`. This is classic block-out/top-out.
- Post-game: `step` returns the input `state` unchanged for any input once `gameOver` is
  true. Simple, and makes the reducer safe to call from an animation loop that hasn't yet
  noticed the game ended.
- The spawned, colliding piece is retained as `active` (a renderer can show the overflow);
  the board is the post-clear board.

### F. Level & lines accumulation

`lines += cleared` and `score += scoreFor(cleared, state.level)` every lock.
`level` is **carried but not advanced** (stays at its initial value, default 1). Level-up
cadence (e.g. +1 per 10 lines) is deliberately deferred — it's a game-rules/tuning concern,
plausibly T-002-03-04, and not part of this AC. Documented in the docstring and review.

## The reducer shape (pseudocode, not final code)

```
step(state, input):
  if state.gameOver: return state
  switch input:
    "left":      return { ...state, active: moveLeft(board, active) }
    "right":     return { ...state, active: moveRight(board, active) }
    "rotateCW":  return { ...state, active: rotateCW(board, active) }
    "rotateCCW": return { ...state, active: rotateCCW(board, active) }
    "softDrop":
    "tick":      return descend(state)
```

```
descend(state):
  g = applyGravity(board, active)
  if !g.locked: return { ...state, active: g.piece }   // fell; board same ref
  // locked: g.board is the fresh merged board, g.piece is null
  { cleared, board: cleared board } = clearLines(g.board)
  score += scoreFor(cleared, level); lines += cleared
  next = spawnPiece(bag.next(), width)
  gameOver = collides(cleared board, next.type, next.position, next.rotation)
  return { ...state, board: cleared board, active: next, score, lines, gameOver }
```

Everything downstream (`applyGravity`, `clearLines`, `spawnPiece`, `collides`) is already
pure/copy-on-write, so `descend` allocates a new `GameState` and never mutates the input's
board — the only mutation is the intentional `bag.next()` advance (option A1).

## Grounding in research

- The pipeline order (lock → clear → score → spawn) is not invented here; it is the exact
  hand-off the three docstrings (`gravity`, `line-clear`, `scoring`) describe. This ticket
  is the named consumer in all three.
- Filling *only columns 3..6* of the top rows for the game-over test comes directly from the
  spawn-column analysis in research (all spawns touch cols 3..6 at y 0..1) and from the fact
  that a *full* row would be cleared away by `clearLines` before it could block a spawn.
- No-mutation, board-derived dimensions, and the co-located Vitest pattern all follow the
  established `lib/` conventions catalogued in research.

## Risks / things a reviewer should confirm

1. **Live bag in state (A1).** The accepted purity compromise. If the project later wants
   serializable saves/replays, `bag`/`rng` must become pure state machines (A3) — a separate
   refactor. Flagged prominently in review.
2. **Level static.** If T-002-03-04 or a UI ticket expects `level` to climb, that logic lands
   there (or we revisit). The score formula already consumes `level` correctly.
3. **`softDrop == tick`** for now. Intentional; a soft-drop bonus is a later concern.
