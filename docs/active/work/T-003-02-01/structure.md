# Structure — T-003-02-01 raf-gravity-tick

## File-level change set

| File | Change | Purpose |
|------|--------|---------|
| `components/useAnimationFrameLoop.ts` | **new** | Generic rAF loop: fire a callback once per `intervalMs` via frame-timestamp deltas. Timing seam, game-agnostic. |
| `components/useAnimationFrameLoop.test.ts` | **new** | Unit-test the loop with a mocked `requestAnimationFrame`. |
| `components/useGame.ts` | **modify** | Own mutable `state` (add `setState`), expose stable `tick()`, export `GRAVITY_INTERVAL_MS`. Update docblock. |
| `components/useGame.test.ts` | **new** | `renderHook` test: `tick()` delegates to `step(_, "tick")`; piece descends, then locks+spawns. |
| `components/GameContainer.tsx` | **modify** | Wire `useAnimationFrameLoop(tick, GRAVITY_INTERVAL_MS)`. Update docblock. |

No `lib/` changes. No `app/` changes. `Board.tsx`/`Cell.tsx`/`game.ts`/`gravity.ts` untouched.

## Public interfaces

### `components/useAnimationFrameLoop.ts`

```ts
export function useAnimationFrameLoop(
  onTick: () => void,
  intervalMs: number,
  active?: boolean,   // default true
): void;
```

- **Contract:** while mounted and `active`, invokes `onTick` approximately once per `intervalMs` of
  elapsed wall-clock time, using the rAF callback's `DOMHighResTimeStamp`. Drains multiple intervals
  in one frame if the frame was long (`while`, not `if`). No-op when `active` is false. Cancels the
  pending frame on unmount / dep change.
- **Latest-callback guarantee:** the newest `onTick` is always the one invoked (held in a ref); the
  underlying rAF subscription re-subscribes only when `intervalMs`/`active` change — never merely
  because `onTick` got a new identity.
- Returns nothing (a side-effecting hook).

### `components/useGame.ts` (additive)

```ts
export const DEFAULT_SEED: number;              // unchanged (0x5eed)
export const GRAVITY_INTERVAL_MS: number;       // NEW — 800

export interface GameView {
  state: GameState;
  view: Board;
  tick: () => void;                             // NEW — advance one gravity step
}

export function useGame(seed?: number): GameView;
```

- `tick` is **stable** across renders (`useCallback([])`) and dispatches a **functional** update
  `setState(s => step(s, "tick"))`, so it always steps the latest committed state and never needs the
  rAF loop to re-subscribe.
- Existing return fields (`state`, `view`) keep their meaning; the change is purely additive, so
  `GameContainer.test.tsx` and any current consumer stay green.

### `components/GameContainer.tsx`

- Unchanged signature (`export default function GameContainer()`), unchanged output (`<Board … />`).
- Adds exactly one line of behaviour: `useAnimationFrameLoop(tick, GRAVITY_INTERVAL_MS)`.

## Module boundaries & dependency direction

```
app/page.tsx (server)
  └─ GameContainer  ("use client", island)
       ├─ useGame ────────────► lib/game (step, createInitialState), lib/overlay, lib/types
       │     └─ GRAVITY_INTERVAL_MS
       └─ useAnimationFrameLoop  (pure timing; imports only React — no lib/, no game knowledge)
```

- `useAnimationFrameLoop` knows **nothing** about Tetris — it takes a `() => void`. This is what makes
  it unit-testable in isolation and reusable (future: pause, hard-drop repeat, animation driver).
- `useGame` remains the sole holder of core state; it reimplements **no** rules — `tick` delegates
  100% to `step`. The eslint `lib/**` boundary is respected (all React lives in `components/`).
- Data flow per tick: `rAF frame → onTick (=tick) → setState(step) → re-render → useMemo recomputes
  view → Board repaints`.

## Internal organization notes

- `useAnimationFrameLoop`: single `useEffect` keyed on `[intervalMs, active]`; locals `raf`, `last`
  (`number | null`), `acc` scoped inside the effect so each subscription starts clean; cleanup
  `cancelAnimationFrame(raf)`. `onTick` accessed via `onTickRef.current`, refreshed on every render
  by a bare assignment (`onTickRef.current = onTick`).
- `useGame`: `useState(() => createInitialState(seed))` gains its setter; `useCallback` import added;
  `step` import added. Docblock's "no setter / no loop yet" paragraph rewritten to describe the loop
  seam that now exists.
- `GameContainer`: `useAnimationFrameLoop` + `GRAVITY_INTERVAL_MS` imports added; docblock line "Input
  and the gravity loop arrive in a later ticket" updated to "gravity loop is wired here; input
  arrives in a later ticket."

## Ordering of changes

1. `useAnimationFrameLoop.ts` (+ test) — leaf, no dependents; land and prove first.
2. `useGame.ts` (+ test) — additive state/`tick`/constant.
3. `GameContainer.tsx` — compose 1 + 2 (one line).

Each step is independently buildable and testable; see `plan.md`.

## Test file placement

- `components/*.test.ts(x)` alongside source, matching `GameContainer.test.tsx`/`Board.test.tsx`.
- Both new tests carry the `// @vitest-environment jsdom` docblock (React hooks need a DOM). `@/*`
  alias resolves via `vitest.config.ts`.
