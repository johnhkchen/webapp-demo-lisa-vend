# Structure — T-002-03-03 game-core-reducer-and-game-over

## Files

| File | Action | Purpose |
|---|---|---|
| `lib/game.ts` | **create** | `GameState`, `Input`, `createInitialState`, `step`. The composition root of the pure core. |
| `lib/game.test.ts` | **create** | Vitest suite: reducer behavior + the AC game-over end-to-end play. |

No existing files are modified or deleted. `lib/game.ts` imports only from sibling `lib/`
modules and `./types` — it introduces no new dependency and no React/Next import (keeps the
`lib/**` eslint boundary satisfied). This is purely additive, so it cannot conflict with any
in-flight ticket on the branch (the DAG lists all of S-002-02/03 as `depends_on`).

## `lib/game.ts` — public interface

```ts
import type { Board, Piece } from "./types";
import { COLS, ROWS } from "./constants";
import { emptyBoard } from "./board";
import { createSevenBag, type SevenBag } from "./bag";
import { spawnPiece, moveLeft, moveRight } from "./movement";
import { rotateCW, rotateCCW } from "./rotation";
import { applyGravity } from "./gravity";
import { clearLines } from "./line-clear";
import { scoreFor } from "./scoring";
import { collides } from "./collision";

export interface GameState {
  board: Board;        // settled cells only (active piece not merged in)
  active: Piece;       // always present; play-over is signalled by `gameOver`
  bag: SevenBag;       // live seeded id source (see design A1)
  score: number;
  lines: number;       // total rows cleared this game
  level: number;       // carried into scoreFor; not advanced this ticket
  gameOver: boolean;
}

export type Input =
  | "left" | "right"
  | "rotateCW" | "rotateCCW"
  | "softDrop" | "tick";

export function createInitialState(seed: number): GameState;
export function step(state: GameState, input: Input): GameState;
```

### Internal organization

- **Module docstring** (house style): purpose, that it is the composition root above the
  primitives, the coordinate convention reference, the live-bag purity note, and the scope
  boundary (no hard-drop / lock-delay / level-up / React).
- `createInitialState(seed)`:
  - `const bag = createSevenBag(seed);`
  - `const board = emptyBoard(COLS, ROWS);`
  - `const active = spawnPiece(bag.next(), COLS);`
  - return `{ board, active, bag, score: 0, lines: 0, level: 1, gameOver: false }`.
  - (First spawn on an empty board never collides, so no game-over check needed here; note it.)
- `step(state, input)`:
  - Guard: `if (state.gameOver) return state;`
  - `switch (input)` — lateral cases return `{ ...state, active: <moveFn>(state.board, state.active) }`.
  - `"softDrop"` and `"tick"` both `return descend(state);`.
  - A `switch` with no `default` plus the string-union type gives exhaustiveness; add an
    explicit `return state` fallthrough only if the linter needs it.
- `descend(state)` — **private helper** (not exported):
  - `const g = applyGravity(state.board, state.active);`
  - `if (!g.locked) return { ...state, active: g.piece };`
  - `const { cleared, board } = clearLines(g.board);`
  - `const score = state.score + scoreFor(cleared, state.level);`
  - `const lines = state.lines + cleared;`
  - `const width = board[0].length;`
  - `const active = spawnPiece(state.bag.next(), width);`
  - `const gameOver = collides(board, active.type, active.position, active.rotation);`
  - `return { ...state, board, active, score, lines, gameOver };`

Only `GameState`, `Input`, `createInitialState`, `step` are exported. `descend` stays module-private.

## `lib/game.test.ts` — test structure

Co-located Vitest, `describe`/`it`, importing from `./game` plus `./board`, `./constants`,
`./types`, `./bag`, `./collision` as needed to build fixtures.

Helper: a small `fillTopCenter(board)` that sets `board[0][x]` and `board[1][x]` for `x` in
`3..6` to a non-null id (e.g. `"I"`), leaving columns 0..2 and 7..9 empty so those rows are
**not full** (survive `clearLines`).

Planned `describe` groups:

1. **`createInitialState`** — empty board (all null), an `active` piece present, `score/lines
   = 0`, `level = 1`, `gameOver = false`; determinism: same seed ⇒ same first `active.type`.
2. **lateral inputs** — `left`/`right` shift `active.position.x` by ∓1 on an empty board;
   blocked moves at a wall leave `active` unchanged (identity contract); `rotateCW`/`rotateCCW`
   change `active.rotation`; board is untouched (same reference).
3. **descent without lock** — one `tick` on a high piece increments `active.position.y`,
   leaves `board` reference unchanged, `gameOver` false.
4. **lock → clear → score** — construct a state with a single row all-but-one filled and an
   active piece that plugs the hole; a `tick`/`softDrop` that locks it clears the row,
   `score` increases by `scoreFor(1, level)`, `lines` increases by 1.
5. **AC: game-over on spawn into occupied top row** — the required end-to-end play:
   - `s = createInitialState(seed)`, then overwrite `board` with `fillTopCenter(emptyBoard)`
     and place `active` low in an empty column (e.g. `O` at `x:0`) so a couple of `tick`s
     lock it without touching the filled center.
   - Drive `tick` inputs until the piece locks; the reducer spawns the next piece into the
     occupied center-top → assert `state.gameOver === true`.
   - Assert the pre-filled rows were *not* cleared (they were never full), and that once
     `gameOver` is true a further `step(state, "left")` returns the same state (no-op).
6. **no-op after game-over** — any input on a `gameOver` state returns the input state ref.

Target: ~10–14 `it` cases. Keeps the AC case explicit and adds enough neighbors to lock the
reducer's contract without duplicating the primitives' own suites.

## Ordering of changes

1. Write `lib/game.ts` (types first, then `createInitialState`, then `step`/`descend`).
2. Write `lib/game.test.ts`.
3. `npm run test` (expect existing 106 + new to pass) and `npm run lint` (0 warnings).
4. Single commit `feat(T-002-03-03): …`.

## Non-goals (restated at the structural level)

No changes to any primitive module, no new exports elsewhere, no `app/` or `components/`
wiring, no `package.json` change. The reducer is the top of the pure stack; consuming it from
React is a later epic.
