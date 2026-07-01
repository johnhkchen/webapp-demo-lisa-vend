# T-002-03-04 — Research: determinism-test-harness

## Ticket in one line

Prove the epic's keystone property: *same seed + same input sequence ⇒ identical game
outcome across two independent runs.* This is a **test-only** ticket — no production
`lib/` code changes are expected, only a new test that exercises the existing engine.

_Advances: P1, E-002:reproducible-rng, E-002:pure-lib-api._

## The reducer under test

`lib/game.ts` is the composition root:

- `createInitialState(seed): GameState` — builds an empty `COLS×ROWS` board, a seeded
  7-bag (`createSevenBag(seed)`), and spawns the first piece from that bag. `score/lines`
  zeroed, `level: 1`, `gameOver: false`.
- `step(state, input): GameState` — the pure reducer. Inputs:
  `"left" | "right" | "rotateCW" | "rotateCCW" | "softDrop" | "tick"`.
  - Lateral inputs transform only `state.active` via the collision-gated movement/rotation
    helpers; board untouched (same reference).
  - `softDrop`/`tick` run `descend`: one `applyGravity` step; on lock it feeds
    `clearLines → scoreFor → bag.next() → spawnPiece → collides` (game-over check).
  - Once `gameOver` is true, `step` returns the input state unchanged (no-op).

`GameState` fields (`lib/game.ts:53`): `board`, `active`, `bag`, `score`, `lines`,
`level`, `gameOver`.

## The determinism chain (why the property should hold)

1. `lib/rng.ts` — `mulberry32(seed)`: state is entirely fixed by `seed >>> 0`. Same seed ⇒
   byte-identical float stream. No wall clock, no `Math.random`. Already tested in
   `rng.test.ts` (deterministic stream, divergence on different seeds, independent
   instances non-interfering).
2. `lib/bag.ts` — `createSevenBag(seed)` closes over one `mulberry32(seed)` and Fisher–Yates
   shuffles `TETROMINO_TYPES` per bag refill. Same seed ⇒ identical id sequence. Already
   tested in `bag.test.ts` (reproducible over 100 draws, aligned 7-windows are permutations,
   divergence on different seeds).
3. `lib/movement.ts`, `lib/rotation.ts`, `lib/collision.ts`, `lib/gravity.ts`,
   `lib/line-clear.ts`, `lib/scoring.ts` — all pure, copy-on-write, framework-free, no
   randomness. Deterministic functions of their inputs.

So the *only* entropy source in the whole engine is the seed threaded through the bag.
Determinism at the `step` level is therefore an emergent property that this harness asserts
end-to-end, above the already-unit-tested primitives.

## The one wrinkle: the bag is a live closure

`GameState.bag: SevenBag` is `{ next(): TetrominoType }` — a closure over mutable queue +
RNG state (design note A1 in `game.ts:24`). Consequences for a determinism test:

- **`step` has a side effect**: `descend` calls `state.bag.next()`, mutating the shared bag.
  So `step` is deterministic *given seed + input sequence*, but NOT value-pure — the same
  `GameState` object stepped twice with `"tick"` can advance the bag twice. The harness must
  therefore build **two independent initial states** from the same seed and run each through
  the sequence once — never re-run one state.
- **Deep-equality can't include `bag`**: two bags from the same seed are behaviourally
  identical but are distinct closures with distinct `next` function references. `toEqual`
  compares functions by reference, so comparing whole `GameState` objects would spuriously
  fail on the `bag` field. The harness must compare a **projection** that excludes `bag`
  (board, active, score, lines, level, gameOver).
- **"piece-sequence state" (the AC's third clause)** is exactly the bag's future position.
  To assert two bags are at the same point in the same stream, draw the next K ids from each
  *after* the sequence and compare. (This mutates the bags, so do it last.)

## Test conventions in this repo

- Runner: **vitest** (`npm test` → `vitest run`), `vitest@^4`.
- Tests live beside source: `lib/*.test.ts`. Import `{ describe, it, expect } from "vitest"`.
- Existing determinism idiom (`rng.test.ts`, `bag.test.ts`): build two instances from the
  same seed, collect N outputs, `expect(a).toEqual(b)`; and a divergence test with two
  different seeds asserting `.not.toEqual`.
- `game.test.ts` helpers worth mirroring: `emptyBoard`, `fillRowExcept`, and a
  `tickUntilGameOver`-style driver loop. Board dims come from `COLS`/`ROWS`
  (`lib/constants.ts`).
- `scoreFor(1, 1) === 40` is an established fixture value (game.test.ts:101).

## Constraints & assumptions

- No production code changes: the engine is complete for this scope; the ticket asks only to
  *prove* determinism, not to add serialization/replay (game.ts:28 explicitly defers a
  serializable bag to a later refactor).
- Input alphabet is closed and small — a good seed for a long scripted sequence mixing
  laterals, rotations, and many ticks so multiple locks + spawns + at least one line clear
  occur, genuinely advancing the bag.
- Must not depend on reaching game-over, but should be robust if it does (once `gameOver`,
  steps are no-ops and both runs freeze identically — still deterministic).
- The harness should compare a rich snapshot (not just the final state) to catch divergence
  as early as possible, and should exercise a long-enough sequence to cross at least one
  7-bag refill boundary (≥ ~8 spawns) so the shuffle path is on the determinism-tested path.
