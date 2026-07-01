# Plan — T-002-03-03 game-core-reducer-and-game-over

## Testing strategy

Pure logic ⇒ **unit tests only** (Vitest, co-located `lib/game.test.ts`). No integration/DOM
tests — there is no React yet. The AC's "short sequence end-to-end" is itself a unit test that
drives the reducer through several `step` calls and asserts terminal `gameOver`.

Verification per step:
- `npm run test` — full suite must stay green (existing 106 + new cases).
- `npm run lint` — must report **0 warnings** (`--max-warnings 0`; no unused imports, no `any`).
- Type-check is implicit in the build/lint; `step` must compile with an exhaustive `switch`.

Because the work is one additive module + its test, it is committed atomically as a single
step. The sub-steps below are the internal order of construction, all verified by the one
test run before the commit.

## Step 1 — `lib/game.ts` types & factory

- Add the module docstring (house style: purpose = composition root; coordinate ref; live-bag
  purity note; scope boundary).
- Declare `GameState` and `Input` exactly as in structure.md.
- Implement `createInitialState(seed)`: seeded bag → empty `COLS×ROWS` board → spawn first
  piece from `bag.next()` at width `COLS`; `score/lines=0`, `level=1`, `gameOver=false`.
- **Verify:** `createInitialState(1)` returns an all-null board, a defined `active`, and the
  documented scalar defaults; two calls with the same seed give the same `active.type`.

## Step 2 — `descend` helper + `step` reducer

- Private `descend(state)`: `applyGravity` → on `!locked` return `{...state, active}`; on
  `locked` run `clearLines` → `scoreFor` accumulate → `spawnPiece(bag.next(), width)` →
  `collides` → `gameOver`. Return a fresh `GameState`; never mutate the input board/piece.
- `step(state, input)`: early-return on `gameOver`; `switch` mapping lateral inputs to
  `moveLeft/moveRight/rotateCW/rotateCCW`; `softDrop`/`tick` → `descend`.
- **Verify:** compiles; lateral moves change only `active`; descent without lock only bumps
  `active.position.y` and keeps the `board` reference.

## Step 3 — `lib/game.test.ts`

Author the six `describe` groups from structure.md. Key fixtures:

- `fillTopCenter(board)`: set `board[0][x]=board[1][x]="I"` for `x∈{3,4,5,6}`; leave cols
  0..2 and 7..9 null so the rows are **not full** (won't be cleared).
- `almostFullRow(board, y, holeX)`: fill row `y` except `holeX` — for the line-clear/score
  case.

Write cases:
1. `createInitialState` — defaults + same-seed determinism.
2. lateral — left/right shift x; wall-blocked = same ref; rotate changes rotation; board ref
   unchanged.
3. descent-no-lock — one `tick` increments y, board ref unchanged, not game-over.
4. lock→clear→score — plug a hole, `tick`/`softDrop` locks & clears one line, `score +=
   scoreFor(1, level)`, `lines += 1`.
5. **AC game-over** — `fillTopCenter`, low `O` active in col 0, `tick` until lock; assert
   `gameOver === true`; assert the pre-filled center rows were not cleared.
6. no-op-after-game-over — any input on a `gameOver` state returns the same reference.

- **Verify:** `npm run test` green (106 + new); `npm run lint` clean.

## Step 4 — Commit

Single atomic commit once tests + lint pass:

```
feat(T-002-03-03): add pure step(state,input) reducer + game-over top-out with vitest
```

Include both `lib/game.ts` and `lib/game.test.ts`. Do **not** touch the ticket frontmatter
(Lisa advances phases from artifacts).

## Risk log & mitigations

- **Spawn geometry off-by-one in the AC fixture.** If the dealt piece's spawn cells miss the
  filled columns, game-over won't trigger. Mitigation: fill the *entire* center block cols
  3..6 across rows 0..1 (superset of every spawn's top cells), so collision is piece-agnostic;
  and assert with a couple of `tick`s of headroom.
- **Accidentally filling a full row** in a fixture → `clearLines` removes the obstruction and
  the test silently passes for the wrong reason. Mitigation: `fillTopCenter` leaves 6 columns
  empty; add an explicit assertion that the center rows are still occupied after the locking
  tick (i.e., not cleared).
- **Bag advance surprises.** Because the bag is live (design A1), tests must not assume a
  particular piece unless they seed and derive it. The AC test is written to be
  piece-agnostic; the determinism test seeds explicitly.
- **Lint: unused imports.** Only import the primitives actually used; `ROWS` is used by
  `createInitialState`, `COLS` by both spawn and board — keep the import list tight.

## Definition of done

- `step` and `createInitialState` exported from `lib/game.ts`, no React/Next import.
- A test plays a short sequence and asserts `gameOver` on spawn into an occupied top row (AC).
- Full Vitest suite and lint pass. `review.md` written. Single `feat` commit landed.
