# T-003-02-02 — Structure: file-level blueprint

## Summary of changes

| File | Change | Why |
|------|--------|-----|
| `components/GameOverlay.tsx` | **new** | Presentational game-over layer, `visible`-driven |
| `components/GameOverlay.test.tsx` | **new** | Isolation tests for the overlay |
| `components/GameContainer.tsx` | **modify** | Read `state`, gate the loop, wrap board + overlay |
| `components/GameContainer.test.tsx` | **modify** | Game-over integration: overlay appears, tick halts, lock/clear reflected |

No `lib/` changes — all transitions already exist in the pure core. No `app/` changes — `page.tsx`
renders `GameContainer` and the header copy is fine.

## `components/GameOverlay.tsx` (new)

Pure presentational component. Public interface:

```ts
interface GameOverlayProps {
  /** Show the game-over layer. When false the component renders nothing. */
  visible: boolean;
  /** Final score to display. */
  score: number;
  /** Total lines cleared, for the end summary. */
  lines: number;
}
export default function GameOverlay(props: GameOverlayProps): JSX.Element | null;
```

Behavior:
- `if (!visible) return null;` — zero DOM footprint during normal play (keeps existing exact-DOM
  container assertions valid).
- When visible: an absolutely positioned layer (`absolute inset-0`) over its positioned parent, a
  dimmed translucent backdrop (`bg-black/70 backdrop-blur-sm`), centered content:
  - `role="alert"` on the root (announce + test target).
  - Heading "GAME OVER" — neon gradient text echoing the `page.tsx` title idiom.
  - A small summary line: score and lines (e.g. `Score {score} · Lines {lines}`).
- Module doc comment: what it is (the observable game-over layer for E-003), the `null`-when-hidden
  decision, and the E-004 boundary (no animated juice here).
- No game logic, no state, no core imports — mirrors `Cell`/`Board` presentational discipline.

## `components/GameContainer.tsx` (modify)

- Destructure `state` as well: `const { state, view, dispatch } = useGame();`
- Gate the gravity loop on game-over (D1):
  `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS, !state.gameOver);`
- Wrap the render so the overlay covers the board:
  ```tsx
  return (
    <div className="relative">
      <Board board={view} />
      <GameOverlay visible={state.gameOver} score={state.score} lines={state.lines} />
    </div>
  );
  ```
- Import `GameOverlay`.
- Update the module doc comment: game-over now halts the loop and shows an overlay (remove any
  implication that game-over is unhandled); keydown scope note stays.

Ordering note: the loop-gate line and the overlay render can land together (same behavior:
game-over). The wrapper `<div>` must be `relative` so `GameOverlay`'s `absolute inset-0` is bounded
to the board area, not the viewport.

## `components/GameContainer.test.tsx` (modify — add cases)

Reuse the existing helpers (`cells`, `filledCoords`, `expectedAfter`). Add:

1. **No overlay during normal play** — on initial render, `queryByRole("alert")` is null and
   `queryByText(/game over/i)` is null; cell count still `ROWS*COLS`. (Guards D3 / existing DOM.)
2. **Game-over overlay appears + tick halts** — install the deterministic rAF pump (stub
   `requestAnimationFrame`/`cancelAnimationFrame`, capture pending cb, `frame(now)` helper), mirroring
   `useAnimationFrameLoop.test.ts`. Render `GameContainer`, pump frames at `GRAVITY_INTERVAL_MS`
   cadence until `/game over/i` appears (bounded well above the empirical 108 ticks, e.g. 400 frames).
   Assert: overlay present. Then record `filledCoords`, pump several more frames, assert
   `filledCoords` is **unchanged** (loop halted — no further descent) and the overlay is still shown.
   Wrap frame delivery in `act(...)`.
3. *(Optional, if clean)* **locked cells persist** — a lighter assertion that after enough frames the
   settled board carries locked (non-active) cells; largely covered by the hook gravity tests, so keep
   only if it doesn't duplicate.

The line-clear "row visibly disappears" assertion is better placed where a full row is deterministic
(the default seed clears none). Plan.md decides the exact home: an `overlayPiece`/`useGame`-level test
that builds a one-cell-short row, clears it via a lock, and asserts the row is gone from the composed
view — proving the render reflects `clearLines`.

## Test-target contract

`GameOverlay` root exposes `role="alert"` and the literal text "GAME OVER" so both isolation and
integration tests select it without depending on styling. `Cell`'s `data-cell` contract is unchanged.

## Non-changes (explicit)

- `lib/game.ts`, `lib/overlay.ts`, `lib/line-clear.ts`, gravity, scoring — untouched.
- `useAnimationFrameLoop.ts` — untouched (the `active` param already exists).
- `useGame.ts` — untouched functionally; a one-line stale-comment fix only if adjacent work makes it
  natural, otherwise left alone to keep the diff tight.
