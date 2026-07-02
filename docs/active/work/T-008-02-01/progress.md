# T-008-02-01 — Progress: attract-driver-loop

## Status: implementation complete — suite green, lint clean, build passes

Followed plan.md step order. No deviations from the design; one small test-infra correction and one
test-mode seam decision are noted below.

## Steps

- [x] **Step 1 — `reset` seam + `ATTRACT_INTERVAL_MS` in `useGame`.**
  Added `ATTRACT_INTERVAL_MS = 120`, `reset(seed)` (stable `useCallback`, non-functional setState),
  and `reset` on `GameView`. New `components/useGame.reset.test.ts` (2 tests) asserts a reset equals
  `createInitialState(seed)` and stable identity. Existing `useGame.*` tests untouched and green.

- [x] **Step 2 — `useAttractLoop` driver + tests.**
  `components/useAttractLoop.ts`: `AttractGame` interface + `useAttractLoop(game, active, intervalMs?)`
  riding one `useAnimationFrameLoop`. Each frame: game-over → bump `seedRef` + `reset`; else
  `dispatch(chooseMove(state)[0] ?? "tick")`. Stateless one-input-per-frame (design Decision 1).
  `components/useAttractLoop.test.ts` (6 tests): dispatches exactly the bot's chosen first input
  (equality vs. `step(s0, chooseMove(s0)[0])`), keeps placing pieces, inactive is inert, game-over →
  `reset` (not dispatch) then resumes, seed advances across resets, no-legal-placement → `"tick"`.

- [x] **Step 3 — `StartOverlay` component + test.**
  `components/StartOverlay.tsx`: non-blocking (`pointer-events-none`, bottom pill, no dim) neon
  "PRESS START" `role="status"` banner; `return null` when hidden. `StartOverlay.test.tsx` (3 tests):
  hidden → nothing; visible → PRESS START; carries `pointer-events-none`.

- [x] **Step 4 — wire `GameContainer` + page caption.**
  Added `attract?: boolean` prop (default `true`) held in `useState` (the seam T-008-02-02 flips);
  run `useAttractLoop({state,dispatch,reset}, attract)`; gated the human gravity loop on
  `!attract && !gameOver && !paused`; early-return `if (attract) return;` in `onKeyDown` (added
  `attract` to deps); rendered `<StartOverlay visible={attract} />`. `app/page.tsx` now renders
  `<GameContainer attract />` and the caption reads "Auto-play demo — the CPU is playing".

- [x] **Step 5 — full gate.** `npm run test` → **299 passed / 32 files** (285 prior + 14 new).
  `npm run lint` → clean (`--max-warnings 0`). `npm run build` → passes (type-check + production
  build for both client and SSR environments).

## Decisions / deviations from plan

1. **rAF pump helper (test infra).** The `useAnimationFrameLoop` keeps a *continuous* accumulator
   across frames (it does not re-subscribe on re-render), so the first-draft `tickOnce(from)` helper
   (baseline + interval per call) double-counted after the first call. Replaced with a running-clock
   `baseline()` (one-time) + `nextTick()` (advances exactly one interval → one fire). No product-code
   change; purely the test's frame driver.

2. **`attract` as a default-`true` prop, existing tests opt into `attract={false}`.** The app's load
   behaviour is now attract mode, which is incompatible with the existing GameContainer tests that
   assume human keyboard play from load. Rather than break them, `attract` is an optional prop
   (default `true` = the real load behaviour used by `page.tsx`); the 26 existing human-play renders
   now pass `attract={false}` to exercise the human game explicitly (mechanical edit). A new
   "attract mode" describe block covers the default: PRESS START shown, auto-play advances with no
   keypress, keyboard swallowed. This keeps the playability/scoring suite meaningful and green while
   making attract the app default — and leaves the `attract` state as the exact seam T-008-02-02
   flips on Start.

## Not done here (correctly out of scope)

- The **Start interaction** (a key/click that halts the bot and hands off to a fresh human game with
  no input bleed-through) is `T-008-02-02`. `StartOverlay` is intentionally non-interactive; the
  `attract` state setter is intentionally left unwired.

## Commits

- `feat(useGame): add reset seam + attract interval constant`
- `feat(attract): rAF driver running chooseMove with reset-on-gameover`
- `feat(attract): non-blocking PRESS START overlay + attract-mode GameContainer wiring`
