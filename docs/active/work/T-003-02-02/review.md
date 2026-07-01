# T-003-02-02 — Review: lock / clear / game-over render

## What the ticket asked

> Locked cells persist in the grid, a completed row visibly clears, and stacking to the top halts
> the gravity tick in an observable game-over state.

## Key finding that shaped the work

Two of the three transitions were **already delivered** by the existing render seam. The pure core
(`lib/game.ts` `step`/`descend`) merges locked pieces into `state.board` and runs `clearLines` on
every lock, and the hook derives `view = overlayPiece(state.board, active)` on every `setState`. So
locked cells persisting and cleared rows disappearing already flow to `Board` with no new render
code. The net-new work was the **game-over half**: actually halting the tick and making the end
state observable.

## Files changed

| File | Change |
|------|--------|
| `components/GameOverlay.tsx` | **new** — presentational game-over layer; `null` when hidden, else an absolutely-positioned dimmed banner (`role="alert"`, "GAME OVER", score/lines). No state, no core imports. |
| `components/GameOverlay.test.tsx` | **new** — 3 isolation tests (hidden ⇒ no DOM; visible ⇒ alert + text; summary shows score/lines). |
| `components/GameContainer.tsx` | **modified** — reads `state`; gates the gravity loop with `active = !state.gameOver`; wraps `Board` + `GameOverlay` in a `relative` div; doc comment refreshed. |
| `components/GameContainer.test.tsx` | **modified** — added no-overlay-in-play, render-reflects-clear guard, and a `game over` describe (stub-rAF pump to a real top-out: overlay appears, tick halts, locked cells persisted). |

No `lib/` changes. No `app/` changes. `useAnimationFrameLoop.ts` untouched (its `active` gate already
existed and is documented as the pause/game-over seam).

## How each AC is met

- **Locked cells persist** — core merges on lock; `view` reflects it. Guarded by the
  `useGame.gravity` hook tests (unchanged) and the new "stacks locked cells into the settled board"
  integration test.
- **Completed row visibly clears** — core `clearLines` runs on lock; `view` reflects it. Guarded by
  the new render-path test (`clearLines`→`overlayPiece` ⇒ the full bottom row is empty in the matrix
  `Board` receives). This is the deterministic home for the AC because the default seed clears no
  lines (pieces fall straight down).
- **Halts the gravity tick, observable game-over** — loop gated on `!state.gameOver` (a *real* stop,
  not a no-op spin); `GameOverlay` shown over the frozen board. Guarded by the new integration test,
  which drives a genuine top-out and asserts the overlay appears, no further frame is scheduled
  (`pending` null), and `filledCoords` is frozen across extra pumped frames.

## Test coverage

- Suite: **18 files / 150 tests green** (was 20 tests in 4 files for the changed area; +7 new tests).
- `npm run lint` clean (`--max-warnings 0`); `npm run build` succeeds (static `/`).
- Integration uses the established deterministic stub-rAF pump, isolated in its own nested `describe`
  so the keyboard tests are unaffected. Top-out bound (400 frames) sits well above the empirical
  108-tick top-out for `DEFAULT_SEED`.

## Open concerns / limitations

- **Visual scope is deliberately plain.** No line-clear `.flash` animation, glow, or neon juice —
  that is E-004 (P2), explicitly out of E-003. The overlay is *observable*, not *animated*. If a
  reviewer expected animated juice, that expectation belongs to a different epic.
- **No restart / new-game affordance.** The overlay is terminal; there's no button to replay. Restart
  / new-game is a later concern (the hook already notes per-load seeding is a future ticket). The AC
  asks only that the game *ends observably*, which is met.
- **Stale comment left in `useGame.ts`** ("there is still no requestAnimationFrame gravity loop") —
  outdated since T-003-02-01. Left untouched to keep this diff scoped to the ticket; worth a cleanup
  pass but not in-scope here.
- **Overlay covers the board only.** `GameOverlay` is `absolute inset-0` inside the board's `relative`
  wrapper, so it dims the board region (intended). It does not cover the page header, which is fine.

## Reviewer checklist

- [x] `npm test` green (150).
- [x] `npm run lint` clean.
- [x] `npm run build` succeeds.
- [x] No rules reimplemented in components (game-over read from `state.gameOver`).
- [x] Normal-play DOM unchanged (overlay renders `null` when hidden).
