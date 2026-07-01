# T-003-01-02 — Progress

All four plan steps complete, committed incrementally. No deviations from the plan.

## Completed

- **Step 1 — `lib/overlay.ts` + `lib/overlay.test.ts`.** Pure `overlayPiece(board, piece)`; copies
  rows, paints `piece.type` at each in-bounds cell from `pieceCells`, bounds-guarded, overlay wins.
  4 node tests (paint, no-mutation, settled-preserved/overlap, off-grid). Green; `tsc` clean.
  Commit `feat(T-003-01-02): add pure overlayPiece …`.
- **Step 2 — `components/useGame.ts`.** `"use client"` hook: `useState(() =>
  createInitialState(seed))` + `useMemo(overlayPiece(...))`, `DEFAULT_SEED = 0x5eed`, returns
  `{ state, view }`. No setter (no loop this ticket). `tsc` clean.
  Commit `feat(T-003-01-02): add useGame hook …`.
- **Step 3 — `components/GameContainer.tsx` + `.test.tsx`.** `"use client"` island: `useGame()` →
  `<Board board={view} />`. 2 jsdom tests: full `ROWS×COLS` grid; the 4 filled `(x,y,type)` squares
  equal `pieceCells` of the core-spawned piece for `DEFAULT_SEED` (proves "from the core API").
  Green; `tsc` clean. Commit `feat(T-003-01-02): add GameContainer client island …`.
- **Step 4 — `app/page.tsx`.** Swapped stopgap `<Board board={emptyBoard(...)} />` for
  `<GameContainer />`; removed unused imports; subtitle "placeholder board" → "Live board — starting
  position". Stays a server component. Commit `feat(T-003-01-02): mount GameContainer in page …`.

## Final gate

- `npx vitest run` — **15 files / 128 tests pass** (122 prior + 6 new: 4 overlay, 2 container).
- `npm run lint` — clean (`--max-warnings 0`).
- `npm run build` — succeeds; `/` prerenders as **static** content (no hydration warning — the
  `DEFAULT_SEED` keeps server/client renders identical, validating the seed decision).
- `npx tsc --noEmit` — clean.

## Deviations

None. Files, signatures, seed policy, and test shapes all match design/structure/plan.

## Remaining (out of scope — later tickets)

- `requestAnimationFrame` gravity loop and keyboard input → `step` dispatch (the hook exposes
  `seed` + `state` as the seams; a `setState` will be added there).
- Score / next-piece / game-over UI.
