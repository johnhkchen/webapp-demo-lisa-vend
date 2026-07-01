# T-003-02-02 — Design: lock / clear / game-over render

## Problem restatement

Three transitions must be observable on screen: (1) locked cells persist, (2) a completed row
visibly clears, (3) topping out **halts the gravity tick** in an **observable game-over state**.

Research finding that reshapes the work: (1) and (2) are **already delivered** by the existing
render seam. The settled board lives in `state.board`; `view = overlayPiece(board, active)` is
recomputed on every `setState`; the core merges locked pieces and removes full rows inside
`step`. So the only genuinely new behavior is the **game-over** half: stop the tick and show it.

The design therefore focuses on the game-over rendering + tick halt, and validates that lock/clear
render is real (a test that a locked piece appears in the settled DOM and a full row disappears).

## Decisions

### D1 — Halt the tick via the loop's existing `active` gate (not a new mechanism)

`useAnimationFrameLoop(onTick, intervalMs, active=true)` already documents `active` as "a seam for
pause/game-over" and its tests prove `active=false` ⇒ no ticks scheduled.

**Chosen:** pass `active={!state.gameOver}` from GameContainer:
`useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS, !state.gameOver)`.

- Rejected — *rely on `step` being a no-op after game-over* (do nothing, let it keep ticking):
  the core already no-ops so it's harmless, but the AC literally says "halts the gravity tick." An
  actually-stopped rAF loop is the honest, observable, battery-friendly implementation and it's what
  the `active` seam was built for. Leaving the loop spinning would also be a latent CPU drain.
- Rejected — *unmount the loop / conditionally call the hook*: violates the Rules of Hooks
  (conditional hook call) and is more code than flipping a boolean.

### D2 — Render game-over as a dedicated presentational overlay component (`GameOverlay`)

**Chosen:** a new `components/GameOverlay.tsx`, a pure presentational component driven by a single
`visible` boolean (mirrors the `Board`/`Cell` "props-driven, no logic" idiom, and matches the
`GameOverlay` name already listed in CLAUDE.md's target `components/` layout). GameContainer renders
it as a sibling of `Board` inside a positioned wrapper, so it lays over the frozen board.

- Rejected — *inline the overlay JSX in GameContainer*: GameContainer is meant to be a thin wiring
  island; a standalone component is independently testable (render with `visible` true/false) and
  matches the established one-responsibility-per-file component style.
- Rejected — *put game-over text inside `Board`*: `Board` is strictly "paint the matrix, no game
  logic / no state." Overlaying a game-over banner is not board rendering; it belongs outside.

### D3 — Overlay shows only when `visible`, and stays out of the DOM otherwise

**Chosen:** `GameOverlay` returns `null` when `!visible`. When visible it renders an absolutely
positioned layer covering the board with a dimmed backdrop and a "GAME OVER" heading (plus final
score/lines read from props, since we have them and it makes the end state legible).

- Returning `null` keeps the normal-play DOM identical to today (existing GameContainer tests that
  count `ROWS*COLS` cells and assert exact filled coords stay green — no stray nodes).
- Rejected — *always render, toggle with `hidden`/opacity*: leaves an empty overlay node in the DOM
  during play and complicates the existing exact-DOM assertions for no benefit at this scope.

### D4 — Accessibility: announce the end state

**Chosen:** the overlay root carries `role="alert"` (or `aria-live`) and a stable `data-testid`/
accessible name so it's both screen-reader-announced when it appears and cleanly targetable in tests
(`getByRole("alert")` / `queryByText(/game over/i)`). Consistent with `Board`'s `aria-label` habit.

### D5 — Styling: legible and on-theme, but no E-004 juice

**Chosen:** style with plain Tailwind utilities already in use elsewhere (translucent dark backdrop
`bg-black/70`, `backdrop-blur-sm`, centered bold neon-gradient text echoing `page.tsx`'s title
treatment). **Do not** wire the `.flash` row-clear animation or heavy glow — animated line-clear
juice and the neon wow are explicitly E-004 / P2, out of E-003 scope. The bar here is *observable*,
not *animated*. Using the pre-shipped `.glass` utility is tempting but E-004 owns that consumer
relationship; a couple of standard utilities keeps this ticket cleanly inside E-003.

### D6 — Line-clear rendering is validated, not built

Because clearing is already reflected in `view`, the design adds a **test** proving a full row
disappears after the core clears it, rather than new render code. This guards the AC and documents
that the behavior is intentional, not incidental. Given the default seed never completes a line
(pieces stack straight down, `lines=0` at top-out), the clear test drives the core directly with a
crafted state / lateral inputs, or asserts at the `useGame`/`overlayPiece` seam where a full row can
be constructed deterministically. (Detailed in plan.md.)

## Data flow (after change)

```
useGame() ─▶ { state, view, dispatch }
   state.gameOver ─┬─▶ useAnimationFrameLoop(tick, 800, active = !gameOver)   // D1 halt
                   └─▶ <GameOverlay visible={gameOver} score lines />          // D2/D3 observe
   view ─────────────▶ <Board board={view} />   // locked + cleared already reflected
```

Wrapper: `<div className="relative"> <Board/> <GameOverlay/> </div>` so the overlay covers the board.

## Risks

- **Existing GameContainer tests** assert exact DOM cell sets during normal play — `GameOverlay`
  returning `null` when hidden keeps those intact. Verified as an explicit acceptance check.
- **Reaching game-over in an integration test** needs pumping the rAF loop; use the established
  stub-rAF pump and the empirical 108-tick top-out (pump a safe margin, ~150 frames). Assert overlay
  appears *and* that further frames don't advance the board (tick truly halted).
- **Comment drift**: correct the stale "no gravity loop" note in `useGame.ts` where adjacent; keep
  edits minimal and scoped.
