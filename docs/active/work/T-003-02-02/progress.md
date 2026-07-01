# T-003-02-02 — Progress

## Status: complete

All three plan steps executed and committed. Full suite green (18 files / 150 tests),
`npm run lint` clean, `npm run build` succeeds.

## Steps

### Step 1 — GameOverlay + isolation tests ✅
- `components/GameOverlay.tsx` — presentational, `visible`-driven, `null` when hidden, `role="alert"`,
  "GAME OVER" + score/lines summary.
- `components/GameOverlay.test.tsx` — hidden/visible/summary (3 tests).
- Commit `feat(T-003-02-02): add GameOverlay — observable game-over layer`.

### Step 2 — Wire GameContainer ✅
- Read `state` from `useGame`; gated the loop with `active = !state.gameOver`; wrapped
  `Board` + `GameOverlay` in a `relative` div; refreshed the module doc.
- Existing container tests stayed green (overlay `null` in play ⇒ DOM unchanged).
- Commit `feat(T-003-02-02): halt gravity + show game-over overlay in GameContainer`.

### Step 3 — Integration + clear-render tests ✅
- Added to `components/GameContainer.test.tsx`: no-overlay-in-play; render-reflects-clear
  (clearLines→overlayPiece guard); a `GameContainer — game over` describe using the deterministic
  stub-rAF pump that drives a real top-out, asserting the overlay appears, the tick halts
  (`pending` null, frozen `filledCoords`), and locked cells persisted in the settled board.
- Commit `test(T-003-02-02): cover game-over overlay, tick halt, clear render`.

## Deviations from plan

- **Line-clear test home**: as anticipated in plan Step 3, the clear assertion lives as a pure
  `clearLines`→`overlayPiece` render-path guard (the default seed clears no lines), not a UI pump.
- **Locked-cells assertion**: implemented as a separate game-over-describe test comparing the pumped
  UI top-out against the pure-core ground truth (non-empty settled board), rather than an inline
  mid-pump check — cleaner and reuses the same pump harness.
- No `lib/` changes were needed (lock/clear already flow through `view`), matching the research
  finding. `useGame.ts` stale comment left untouched to keep the diff tight (not adjacent to edits).

## Verification
- `npm test` → 150 passed.
- `npm run lint` → clean (max-warnings 0).
- `npm run build` → success (static `/`).
