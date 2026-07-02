# T-008-02-01 — Structure: attract-driver-loop

## File-level changes

| File | Action | What |
|------|--------|------|
| `components/useGame.ts` | **modify** | Add `reset(seed)` to the hook + `reset` to `GameView`; add `ATTRACT_INTERVAL_MS` constant. |
| `components/useAttractLoop.ts` | **create** | The driver hook: reads `chooseMove`, dispatches one bot input per rAF interval, resets on game-over. |
| `components/StartOverlay.tsx` | **create** | Presentational, non-blocking arcade "PRESS START" banner shown while attract. |
| `components/GameContainer.tsx` | **modify** | Add `attract` state seam; run `useAttractLoop`; gate the human gravity loop + keyboard on `!attract`; render `StartOverlay`. |
| `app/page.tsx` | **modify** | Update the stale caption to reflect auto-play. |
| `components/useAttractLoop.test.ts` | **create** | Driver tests (advance / reset / no-legal-placement) via the manual rAF pump. |
| `components/useGame.reset.test.ts` | **create** | Unit test for the new `reset` seam. |
| `docs/active/work/T-008-02-01/*` | **create** | RDSPI artifacts. |

No `lib/` changes — the driver is React glue over the already-landed pure `chooseMove`. No files
deleted.

## Public interfaces

### `components/useGame.ts` (additions only)

```ts
// New feel/timing constant, same rationale as GRAVITY_INTERVAL_MS (lives in the seam, not lib/):
// how long the attract driver rests between bot inputs. Faster than gravity so the demo reads as
// brisk auto-play; ~120ms per input = visible slide/rotate, whole pieces placed in ~1s.
export const ATTRACT_INTERVAL_MS = 120;

export interface GameView {
  // ...existing fields...
  /** Replace the whole game with a fresh createInitialState(seed) — the only restart seam. */
  reset: (seed: number) => void;
}
```

`reset` = `useCallback((seed) => setState(createInitialState(seed)), [])` — stable identity, listed
alongside `dispatch` in the returned object. No other change to `useGame`'s body.

### `components/useAttractLoop.ts` (new)

```ts
export interface AttractGame {
  state: GameState;
  dispatch: (input: Input) => void;
  reset: (seed: number) => void;
}

/**
 * Drive `game` as a self-playing attract demo while `active`. Each interval: if the game is over,
 * reset to a fresh game (next counter seed) and continue; otherwise dispatch the first input of
 * chooseMove(state) — or "tick" when there is no legal placement, to let the game top out.
 */
export function useAttractLoop(
  game: AttractGame,
  active: boolean,
  intervalMs?: number, // defaults to ATTRACT_INTERVAL_MS
): void;
```

- Imports: `useRef` (seed counter) from react; `useAnimationFrameLoop`; `chooseMove` from
  `@/lib/bot`; `DEFAULT_SEED`, `ATTRACT_INTERVAL_MS` from `./useGame`; types `GameState`/`Input`
  from `@/lib/game`.
- Internal state: `seedRef = useRef(DEFAULT_SEED)`. On reset: `seedRef.current += 1;
  game.reset(seedRef.current)`.
- Body: one `useAnimationFrameLoop(onTick, intervalMs ?? ATTRACT_INTERVAL_MS, active)`. `onTick`
  closes over `game` (fresh each render — the latest-callback ref makes this safe).

### `components/StartOverlay.tsx` (new)

```ts
interface StartOverlayProps {
  /** Show the banner. When false, renders nothing (return null) — same discipline as GameOverlay. */
  visible: boolean;
}
export default function StartOverlay({ visible }: StartOverlayProps): JSX.Element | null;
```

- Non-blocking: absolutely positioned, bottom-anchored, `pointer-events-none`, no full-board dim —
  the auto-play stays fully visible behind it. Neon "PRESS START" pill with a gentle pulse, matching
  the cyan→fuchsia→violet gradient used in `GameOverlay`/`page.tsx` so it reads as one system.
- `role="status"` for the announced attract state; purely presentational (no handlers) — the Start
  interaction is `T-008-02-02`.

### `components/GameContainer.tsx` (modify)

- Destructure `reset` from `useGame()` alongside the rest.
- `const [attract] = useState(true);` — the seam `T-008-02-02` flips (setter intentionally not
  destructured this ticket).
- `useAttractLoop({ state, dispatch, reset }, attract);`
- Human gravity loop condition changes: `!attract && !state.gameOver && !state.paused`.
- `onKeyDown`: early-return `if (attract) return;` before mapping keys (add `attract` to the effect
  deps).
- Render `<StartOverlay visible={attract} />` inside the existing `relative` board wrapper (sibling
  to the two `GameOverlay`s), so it layers over the board.

### `app/page.tsx` (modify)

- Caption text: `"Live board — starting position"` → an auto-play caption (e.g. `"Auto-play demo"`).
  Cosmetic; keeps the header honest.

## Component boundaries / layering

```
app/page.tsx (server)
  └─ GameContainer (client island)               ← owns the `attract` seam + both loops
       ├─ useGame()          → { state, view, ghost, queue, clearedRows, dispatch, reset }
       ├─ useAttractLoop({state,dispatch,reset}, attract)   ← bot drives state while attract
       ├─ useAnimationFrameLoop(tick, GRAVITY, !attract && ...)   ← human gravity (idle in attract)
       ├─ Board / HoldBox / NextPreview / GameOverlay×2   ← unchanged, all read `state`
       └─ StartOverlay visible={attract}          ← non-blocking arcade banner
```

The bot-driven `state` flows through the **exact same** `view`/`ghost`/`queue`/`flash` derivation
and the **exact same** `Board`, so "reuse existing rendering" is structural — no rendering branch
for attract vs. human.

## Ordering of changes

1. `useGame`: add `reset` + `ATTRACT_INTERVAL_MS` (self-contained; existing tests stay green).
2. `useAttractLoop.ts` + `useGame.reset.test.ts` + `useAttractLoop.test.ts` (driver + its tests
   against the seam from step 1).
3. `StartOverlay.tsx`.
4. `GameContainer` wiring + `app/page.tsx` caption (integrates 1–3; observable auto-play).
5. Lint + build + full suite.

## Invariants preserved

- `lib/` purity untouched; driver is `components/`-only glue.
- One state holder (`useGame`); the driver never forks game state.
- Exactly one loop advances `state` at a time (attract gate on the human loop).
- No `Math.random()`/`Date.now()`; reset seed is a deterministic counter.
- `GameView`'s existing fields and `dispatch` identity are unchanged (additive only), so no other
  consumer or test breaks.
