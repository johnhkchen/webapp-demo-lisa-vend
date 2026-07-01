# Progress — T-002-03-03 game-core-reducer-and-game-over

## Status: complete

All planned steps executed; suite and lint green; committed atomically.

## Steps

- [x] **Step 1 — types & factory.** Added `lib/game.ts` module docstring, `GameState`,
      `Input`, and `createInitialState(seed)` (empty board + seeded bag + first spawn).
- [x] **Step 2 — reducer.** Private `descend` helper (gravity → clear → score → spawn →
      game-over) and `step` with the `gameOver` no-op guard and the input `switch`.
- [x] **Step 3 — tests.** `lib/game.test.ts`: 9 cases across 4 `describe` groups incl. the AC
      end-to-end top-out play and the after-game-over no-op.
- [x] **Step 4 — commit.** `e4dc140 feat(T-002-03-03): add pure step(state,input) reducer +
      game-over top-out with vitest`.

## Verification

- `npm run test` → **11 files, 115 passed** (9 new; was 106).
- `npm run lint` → clean, 0 warnings.

## Deviations from plan

None material. Notes:

- Implemented exactly the `switch`-based reducer from design.md; TypeScript's exhaustiveness
  over the `Input` union meant no `default`/fallthrough `return` was needed (all six cases
  return), and lint accepted it.
- The lock→clear→score test uses an `O` plugging cols 0/1 of an otherwise-full bottom row
  (row filled except cols 0,1) — a concrete instance of the "plug a hole" fixture from the
  plan; asserts `lines === 1` and `score === 40` (`scoreFor(1, level 1)`).
- The AC test is piece-agnostic (fills the entire center block, cols 3..6 × rows 0..1) so it
  does not depend on which id the seeded bag deals for the fatal spawn.

## Follow-ups (out of scope, unchanged from design)

- Live bag in `GameState` (design A1) — revisit if serializable saves/replays are needed.
- Level progression not implemented; `level` is carried into `scoreFor` but never advanced.
- `softDrop` is currently an alias of a gravity `tick` (no soft-drop score bonus).
- No hard-drop / lock-delay / hold / next-queue — later tickets / UI epics.
