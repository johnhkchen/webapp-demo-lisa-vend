# Research — T-002-03-03 game-core-reducer-and-game-over

## Ticket in one line

Expose a single pure `step(state, input)` reducer that ties spawn / move / rotate /
gravity / lock / clear / score together, and flags **game-over** when a fresh spawn
collides with the settled stack (top-out). No React/Next import. A test must play a short
end-to-end sequence and assert game-over is set when spawning into an occupied top row.

This is the **capstone** of story S-002-03 and epic E-002 (`pure-lib-api`). Every other
`lib/` module is a standalone primitive; this ticket is the first one that *composes* them
into a running state machine. Nothing above it (the React game loop, T-002-03-04) exists yet.

## The pieces already built (all in `lib/`, all pure, framework-free)

| Module | Public surface | Contract that matters here |
|---|---|---|
| `types.ts` | `Point`, `TetrominoType`, `RotationState`, `Cell`, `Board`, `Piece` | Board is row-major `board[y][x]`; `Piece = {type, rotation, position}`, occupied cells are *derived*, not stored. |
| `constants.ts` | `COLS=10`, `ROWS=20` | Standard field dimensions. |
| `board.ts` | `emptyBoard(width, height)` | Fresh, independent rows; `board[y][x]`, all `null`. |
| `tetrominoes.ts` | `TETROMINO_TYPES`, `BOUNDING_BOX`, `cellsFor(type,rot)` | Spawn (rot 0) cells: I→row y=1; O/T/S/Z/J/L→rows y=0..1. All spawns occupy some of columns 3..6 on a 10-wide board. |
| `rng.ts` | `mulberry32(seed)` | Seeded, closure-based PRNG. |
| `bag.ts` | `createSevenBag(seed): SevenBag` with `next(): TetrominoType` | **Stateful/closure-based** — `next()` mutates an internal queue; not a value. Same seed ⇒ same id stream. |
| `collision.ts` | `pieceCells(type,pos,rot)`, `collides(board,type,pos,rot)` | `collides` returns `true` for out-of-bounds (incl. `y<0`) or overlap of a non-null cell. Reads dims from the board arg. |
| `movement.ts` | `spawnPiece(type,width)`, `tryMove`, `moveLeft`, `moveRight`, `softDrop` | Spawn = rot 0, `y=0`, centered by bounding box. Moves are collision-gated; **no-op returns the input `piece` reference** (identity signals "did not move"). |
| `rotation.ts` | `rotate`, `rotateCW`, `rotateCCW` | SRS wall-kicks; same no-op-by-identity contract. |
| `gravity.ts` | `lockPiece(board,piece)`, `applyGravity(board,piece): GravityResult` | `applyGravity` delegates the down-step to `softDrop`; **if the piece fell** → `{locked:false, board(unchanged ref), piece}`; **if it can fall no further** → `{locked:true, board:(fresh merged copy), piece:null}`. Does NOT clear lines. |
| `line-clear.ts` | `clearLines(board): {cleared, board}` | Removes full rows, collapses survivors down, prepends fresh empty rows. Copy-on-write. |
| `scoring.ts` | `LINE_CLEAR_BASE`, `scoreFor(lines, level=1)` | `base × level`; `0` for a no-clear or out-of-range count. Stateless — does not accumulate. |

## The composition the reducer must perform

Reading the docstrings, the intended pipeline is spelled out across modules:

- `gravity.ts`: "A later game-loop ticket, on seeing `locked:true`, feeds the merged board
  through `clearLines`…"
- `line-clear.ts`: "…the cleared count then feeds scoring, a separate story."
- `scoring.ts`: "the `step(state,input)` reducer (T-002-03-03) is what calls `clearLines`
  then feeds the count here and adds the result to the game score."

So the **lock branch** is a fixed sequence: `applyGravity` → (on lock) `clearLines(merged)`
→ `scoreFor(cleared, level)` → accumulate score/lines → spawn next id from the bag →
`spawnPiece` → `collides?` → set game-over. The **lateral branch** (left/right/rotate) just
runs the matching movement/rotation function on the active piece; the board is untouched.

## Key constraints & conventions observed in the existing code

1. **Purity / no-mutation.** Every `lib/` op is copy-on-write and never mutates its board or
   piece. The reducer must return a new `GameState` and not mutate the input's board/piece.
2. **No-op-by-identity.** Movement/rotation return the *same reference* when blocked. Useful:
   the reducer can cheaply tell whether a lateral input changed anything (not strictly needed
   for correctness, but idiomatic).
3. **`applyGravity` already encapsulates lock detection** via `softDrop`'s identity contract —
   the reducer should *not* re-implement "can it fall?"; it delegates.
4. **Dimensions come from the board**, not `COLS`/`ROWS` — `collides`/`spawnPiece(width)` take
   them explicitly. The reducer should pass `board[0].length` as width for spawns.
5. **Docstring house style.** Every module opens with a multi-paragraph docstring explaining
   purpose, the layer above/below, coordinate convention, and scope boundaries. New module
   must match.
6. **Testing.** Vitest (`npm run test` → `vitest run`). Each module has a co-located
   `*.test.ts` with `describe`/`it`. Current suite: ~10 files, 106 tests, all green.
   `npm run lint` must stay at 0 warnings (`--max-warnings 0`).

## The one genuine tension: the bag is stateful

`createSevenBag` returns an object whose `next()` **mutates** closure state; it is not a
serializable value and it is not referentially transparent. But the reducer must draw the
next piece *inside* `step` (the ticket requires `step` to "tie spawn together" and to detect
game-over on a fresh spawn). Therefore the bag (or some equivalent id source) must be
reachable from `step` — the natural home is a field on `GameState`. Consequence: a
`GameState` will carry a **live generator**, and `step` will advance it on lock. This is the
main design decision (see design.md): "pure reducer" here means framework-free and
deterministic-given-its-inputs, not strict value-purity of the embedded RNG stream.

## Game-over semantics to pin down (for Design)

- **Trigger:** a freshly spawned piece `collides` with the board at its spawn placement
  (classic top-out / block-out).
- **Where spawn happens:** only in the lock branch, right after `clearLines`.
- **After game-over:** subsequent `step` calls should be a no-op (return state unchanged).
- The AC test wants: occupy the top row (spawn region), drive a lock, and observe
  `gameOver === true`. Note filling an *entire* row would trigger a line-clear and remove the
  obstruction — the test must occupy only the **center spawn columns (3..6)** of the top rows,
  leaving the row non-full so it survives `clearLines`.

## What is explicitly out of scope

Hard-drop, lock-delay/timing, soft-drop scoring bonus, combo/back-to-back/T-spin scoring,
level progression (level-up every N lines), hold piece, next-queue preview, and any React
wiring. These belong to later tickets (T-002-03-04 and the E-003+ UI epics).
