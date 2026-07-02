# Progress — T-007-04-01 surface-upcoming-queue

Executed the plan in order; no deviations. All four code steps committed atomically.

## Completed

- [x] **Step 1** — `lib/game.ts`: added pure `upcomingPieces(state, n)` returning `state.bag.peek(n)`
  with a read-only/non-consuming doc comment. Commit `193159d`.
- [x] **Step 2** — `lib/game.test.ts`: added `describe("upcomingPieces …")` — spawn-match (queue ==
  next N hard-drop spawns), non-consuming (double-peek stable + next spawn == queue[0]), fresh-array
  (mutation-safe), and `n <= 0` → `[]`. Commit `9bccf31`.
- [x] **Step 3** — `components/useGame.ts`: added `export const PREVIEW_COUNT = 5`; widened
  `GameView` with `queue: TetrominoType[]`; derived `queue` via
  `useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state])`; returned it; updated hook + import
  docs. Commit `2e338f9`.
- [x] **Step 4** — `components/useGame.queue.test.ts` (new, jsdom): queue length == `PREVIEW_COUNT`;
  queue predicts spawn order across `PREVIEW_COUNT` hard-drops; tracks the pure core after each drop.
  Commit `54cafed`.
- [x] **Step 5** — full gate.

## Verification

- `npx vitest run lib/game.test.ts components/useGame.queue.test.ts` → 29 passed.
- `npm test` → **22 files, 213 tests passed** (incl. `determinism.test.ts`, `bag.test.ts`,
  `useGame.gravity.test.ts` — unchanged, confirming `peek` is non-consuming and the piece stream is
  untouched).
- `npm run lint` → clean (`--max-warnings 0`).
- `npx tsc --noEmit` → clean.

## Deviations

None. The design/structure/plan held as written.

## Notes

- No change to `lib/bag.ts` (T-007-01-01 already delivered `peek`), `lib/constants.ts` (window size
  is UI policy → lives in the seam), or `GameContainer.tsx` (the `GameView` change is additive;
  it destructures by name).
- Rendering the queue is the sibling ticket **T-007-04-02**, which imports `PREVIEW_COUNT` +
  `queue`.
