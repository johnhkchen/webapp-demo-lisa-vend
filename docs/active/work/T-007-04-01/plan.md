# Plan — T-007-04-01 surface-upcoming-queue

Ordered, independently-verifiable steps. Each ends in a green gate and an atomic commit.

## Step 1 — Pure core accessor `upcomingPieces`

**Change**: `lib/game.ts` — add exported `upcomingPieces(state: GameState, n: number):
TetrominoType[]` returning `state.bag.peek(n)`, with a doc comment stating the read-only /
non-consuming contract.

**Verify**: `npx vitest run lib/game.test.ts` still green (no behavior change yet);
`npx tsc --noEmit` clean.

**Commit**: `feat(game): add read-only upcomingPieces(state, n) lookahead accessor`

## Step 2 — Pure-core tests for the accessor

**Change**: `lib/game.test.ts` — add `describe("upcomingPieces")` with:
1. matches subsequent spawns — capture `q = upcomingPieces(s, N)`, fold N `step(_, "hardDrop")`,
   collect `active.type` each time, assert equals `q`.
2. non-consuming — two consecutive `upcomingPieces(s, N)` equal; a following `hardDrop` spawns
   `q[0]`.
3. fresh array — mutating the returned array doesn't affect the next call.
4. edge — `upcomingPieces(s, 0)` → `[]`.

**Verify**: `npx vitest run lib/game.test.ts` green.

**Commit**: `test(game): cover upcomingPieces spawn-match + non-mutation`

## Step 3 — Surface `queue` in the hook

**Change**: `components/useGame.ts`:
- add `export const PREVIEW_COUNT = 5;` (doc comment: UI/feel policy lives in the seam).
- import `upcomingPieces` from `@/lib/game`; import `TetrominoType` from `@/lib/types`.
- add `queue: TetrominoType[]` to `GameView` (doc: peek-sourced, never consumes the bag).
- `const queue = useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state]);`
- return `{ state, view, ghost, queue, dispatch }`.

**Verify**: `npx tsc --noEmit` clean; `npx vitest run components/useGame.gravity.test.ts` green
(unbroken existing hook test); `npm run lint`.

**Commit**: `feat(useGame): surface upcoming-piece queue via peek (PREVIEW_COUNT)`

## Step 4 — Hook test for the surfaced queue

**Change**: create `components/useGame.queue.test.ts` (jsdom + `renderHook`):
1. `queue` has length `PREVIEW_COUNT`.
2. queue predicts spawn order — capture queue, `PREVIEW_COUNT`× `act(dispatch("hardDrop"))`,
   assert each new `state.active.type === q[i]`.
3. tracks the pure core — independently fold `step(_, "hardDrop")` from the same seed and agree.

**Verify**: `npx vitest run components/useGame.queue.test.ts` green.

**Commit**: `test(useGame): assert surfaced queue matches subsequent spawns`

## Step 5 — Full gate

**Verify**: `npm test` (whole suite green, incl. `determinism.test.ts` unchanged) and
`npm run lint` (0 warnings). Write `review.md`.

No commit beyond docs (Lisa handles artifact commits per its process; code commits are Steps 1–4).

## Testing strategy summary

- **Unit (pure `lib/`)**: `upcomingPieces` correctness in isolation — the AC's core property
  ("queue matches subsequent spawns") proven without React.
- **Integration (hook)**: the AC surface literally names `useGame`'s view — assert `queue` there and
  that it predicts spawns, cross-checked against an independently-driven core (repo idiom: hook
  reimplements no rules).
- **Regression**: `determinism.test.ts` and existing `bag.test.ts`/`useGame.gravity.test.ts` must
  stay green — `peek` is read-only so the piece stream and all downstream behavior are unchanged.

## Risks & mitigations

- **Top-out during the spawn-match loop**: 5 hard-drops on an empty board stack at the floor and
  cannot reach spawn rows → no `gameOver` interrupts the sequence. Keeping N = `PREVIEW_COUNT` = 5
  is safe; a larger N in tests would need a guard.
- **Hydration/determinism**: `PREVIEW_COUNT` is a static constant and `queue` derives from the
  seeded bag → server and client render the identical first queue; no hydration drift.
- **Consumer breakage**: `GameView` change is purely additive; `GameContainer` destructures by name.
