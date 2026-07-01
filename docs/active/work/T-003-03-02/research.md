# Research — T-003-03-02 softdrop-harddrop-keys

## Ticket

Add soft-drop (accelerated descent) and hard-drop (instant drop + lock) key handlers that
compose cleanly with the rAF gravity tick. AC: holding the down key accelerates descent, and
the hard-drop key instantly drops + locks, so a stranger can play one uninterrupted game from
spawn to game-over via keyboard alone.

Depends on `T-003-03-01` (move/rotate keys) and `T-003-02-01` (rAF gravity), both `done`.

## The seam this hangs off (established by the two dependencies)

- `components/useGame.ts` — holds the `GameState` and exposes a stable
  `dispatch(input: Input)` (`setState(s => step(s, input))`, `useCallback([])`). Referentially
  stable, so effects list it in deps without re-subscribing. Any new `Input` variant flows
  through this same `dispatch` with **no signature change** — `dispatch` is generic over `Input`.
- `components/GameContainer.tsx` — the single `"use client"` island. A `window` `keydown`
  listener (in a `useEffect`, cleanup removes the exact handler, deps `[dispatch]`) maps a
  module-level `KEY_TO_INPUT` table to `Input`s. Unmapped keys return early (browser shortcuts
  untouched); mapped keys `preventDefault()` then `dispatch`. `ArrowDown` and the drop key are
  deliberately absent and commented as owned by *this* ticket.
- `components/useAnimationFrameLoop.ts` — game-agnostic fixed-interval rAF loop
  (`onTick`, `intervalMs`, `active`). Its own doc names "hard-drop repeat" as a future reuse of
  the same loop. GameContainer drives gravity with `useAnimationFrameLoop(() => dispatch("tick"),
  GRAVITY_INTERVAL_MS)`.

## The pure core (`lib/`)

### `lib/game.ts` — the reducer (composition root)

- `Input = "left" | "right" | "rotateCW" | "rotateCCW" | "softDrop" | "tick"`.
- `step(state, input)`:
  - `gameOver` ⇒ returns input state unchanged (no-op) for every input.
  - lateral inputs delegate to `moveLeft/Right`, `rotateCW/CCW` on `state.active`.
  - `"softDrop"` and `"tick"` **both** call `descend(state)` — currently identical (one gravity
    step). The `Input` doc explicitly keeps them distinct "so a later ticket can give soft-drop
    its own scoring/timing without changing the input alphabet."
- `descend(state)`: `applyGravity(board, active)`. If not locked → `{ ...state, active: fallen }`.
  If locked → `clearLines` → `scoreFor(cleared, level)` → accumulate `lines` → `spawnPiece(bag.next())`
  → set `gameOver` if the fresh spawn `collides`. This is the **one lock→clear→score→spawn
  pipeline**, and it already handles a piece that is *already resting* (applyGravity locks it
  immediately). Key reuse target for hard-drop.
- Module scope note explicitly lists **"no hard-drop"** and **"no soft-drop score bonus (soft-drop
  is currently an alias of a gravity tick)"** as deferred — i.e. the hooks for this ticket exist by
  design.
- `game.ts` imports movement (`spawnPiece, moveLeft, moveRight`), rotation, gravity, line-clear,
  scoring, collision. It does **not** currently import `softDrop`.

### `lib/movement.ts` — translation policy (collision-gated)

- `tryMove(board, piece, dx, dy)`: legal ⇒ fresh `Piece`; blocked ⇒ **same input reference**
  (the no-op contract, so callers detect "did not move" via `next === prev`).
- `softDrop(board, piece)` = `tryMove(board, piece, 0, 1)` — one row down, **no lock/merge**
  (locking is a higher layer's job).
- Scope note frames this as the "policy" layer over the collision predicate; it never locks.

### `lib/gravity.ts` — gravity + lock

- `applyGravity(board, piece)`: delegates the down-step to `softDrop`. Different ref ⇒ `{ locked:
  false, board (same ref), piece: fallen }`. Same ref (can't fall) ⇒ `{ locked: true, board:
  lockPiece(board, piece), piece: null }`. Floor and stack landings flow through one path.
- `lockPiece(board, piece)`: fresh copy-on-write board with the piece's four cells merged. Does
  NOT clear lines.
- Scope note: "no hard-drop (a later ticket, which can reuse `lockPiece`)."

### Supporting primitives

- `lib/scoring.ts` — `scoreFor(lines, level)` = base×level over `[0,40,100,300,1200]`; returns 0
  for `lines ∉ 1..4`. No per-cell drop bonus anywhere.
- `lib/collision.ts` — `pieceCells(type, pos, rotation)`, `collides(...)`.
- `lib/constants.ts` — `COLS`, `ROWS`. `lib/board.ts` — `emptyBoard`.
- `lib/types.ts` — `Board = (TetrominoType|null)[][]`, row-major `board[y][x]`, y grows down.

## Test landscape (conventions to match)

- `lib/game.test.ts` — helpers `fillRowExcept`, `fillTopCenter`, `tickUntilGameOver`. Cases assert
  board-ref preservation, lock+clear+score, and top-out. Ground-truth style: build a `GameState`
  by hand, drive `step`, assert scalars/refs.
- `lib/movement.test.ts` — direct `tryMove`/`softDrop`/`moveLeft/Right` assertions incl. the
  same-reference no-op contract.
- `components/GameContainer.test.tsx` — jsdom. `filledCoords(container)` reads back DOM cells;
  `expectedAfter(...inputs)` computes ground truth by running the pure core at `DEFAULT_SEED`.
  Cases fire `keyDown(window, {key})` and compare. **Note:** the existing "ignores unmapped keys"
  case fires `ArrowDown` and expects a no-op — this ticket makes `ArrowDown` mapped, so that case
  must change.
- `components/useGame.gravity.test.ts` — `renderHook` + `dispatch("tick")` drives descent/lock.

## Constraints & assumptions

- `lib/**` is framework-free (eslint boundary). Any hard-drop math must be a pure `lib/` function.
- `step` mutates only via the shared `bag` on spawn; boards/pieces are copy-on-write. Preserve that.
- `dispatch` is generic over `Input`; adding an `Input` variant needs no hook signature change.
- Lint runs repo-wide with `--max-warnings 0` (`eslint`), tests via `vitest run`.
- **Key-repeat asymmetry (surfaced, not yet solved):** soft-drop *wants* OS key auto-repeat while
  held (like move keys today); hard-drop must be **edge-triggered** — a held key must not
  drop→lock→spawn every repeat, which would machine-gun through pieces and end the game instantly.
  `KeyboardEvent.repeat` distinguishes the two.
- Space (`" "`) and `ArrowDown` both scroll/activate default browser behavior → both need
  `preventDefault` (the existing mapped-key path already does this).
- No score change is required by the AC; the core's "no drop score bonus" boundary is a live design
  question (defer vs. implement) for the Design phase, not an assumption here.
