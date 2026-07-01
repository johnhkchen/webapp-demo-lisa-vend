# Structure — T-003-03-01 move-rotate-keys

## Files

| File | Change | Why |
|------|--------|-----|
| `components/useGame.ts` | **modify** | Capture the state setter; expose stable `dispatch(input)`. |
| `components/GameContainer.tsx` | **modify** | Attach window `keydown` → dispatch; key map. |
| `components/GameContainer.test.tsx` | **modify** | Add move/rotate + no-op wiring tests. |
| `lib/**` | **none** | Core already supports left/right/rotate; boundary untouched. |
| `components/Board.tsx`, `Cell.tsx` | **none** | Presentational; re-render on new view. |

## `components/useGame.ts`

Public interface change:

```ts
export interface GameView {
  state: GameState;
  view: Board;
  dispatch: (input: Input) => void;   // NEW
}
```

Internal change:

```ts
import { useCallback, useMemo, useState } from "react";
import { createInitialState, step, type GameState, type Input } from "@/lib/game";

export function useGame(seed: number = DEFAULT_SEED): GameView {
  const [state, setState] = useState(() => createInitialState(seed));   // capture setter
  const view = useMemo(() => overlayPiece(state.board, state.active), [state]);
  const dispatch = useCallback(
    (input: Input) => setState((s) => step(s, input)),
    [],                                   // functional updater ⇒ no state dep ⇒ stable
  );
  return { state, view, dispatch };
}
```

- `dispatch` is referentially stable (empty deps) so consumers can list it in effect deps
  without re-subscribing each render.
- Update the module doc/comment to note input dispatch now exists (drop the "no setter is
  exposed" sentence; keep the gravity-loop-is-later note).

## `components/GameContainer.tsx`

```ts
"use client";
import { useEffect } from "react";
import Board from "@/components/Board";
import { useGame } from "@/components/useGame";
import type { Input } from "@/lib/game";

/** Keyboard → core Input map. Keys absent here are ignored (drop keys are T-003-03-02). */
const KEY_TO_INPUT: Record<string, Input> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "rotateCW",
  x: "rotateCW",
  X: "rotateCW",
  z: "rotateCCW",
  Z: "rotateCCW",
};

export default function GameContainer() {
  const { view, dispatch } = useGame();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const input = KEY_TO_INPUT[e.key];
      if (!input) return;          // not ours — leave browser shortcuts alone
      e.preventDefault();          // stop arrow-key page scroll
      dispatch(input);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  return <Board board={view} />;
}
```

- Handler is defined inside the effect so cleanup removes the exact reference.
- Update the component doc comment: input (move/rotate) now wired here; gravity loop /
  soft+hard drop still later (T-003-02-01 / T-003-03-02).

## `components/GameContainer.test.tsx`

Add cases (reuse the existing `cells()` readback + a small helper to extract the active
piece's filled coordinates from the DOM):

1. **ArrowLeft moves the piece one column left** — snapshot filled coords, fire
   `keyDown(window, { key: "ArrowLeft" })`, assert every filled cell's `x` decreased by 1
   (compare against core: `step(createInitialState(DEFAULT_SEED), "left")`).
2. **ArrowRight moves right** — symmetric.
3. **ArrowUp rotates** — assert filled coords equal the core's
   `step(initial, "rotateCW")` overlay (piece identity changes shape/orientation).
4. **Illegal move is a no-op** — repeatedly fire `ArrowLeft` past the wall; assert filled
   coords stop changing and match the piece pinned at the left wall (no cells at `x < 0`,
   board otherwise unchanged).
5. **Unmapped key ignored** — fire `keyDown(window, { key: "Enter" })`; assert filled
   coords unchanged from the starting frame.
6. **Listener cleanup** — `unmount()`, then fire a key on `window`; assert no throw (and,
   if practical, that a spy dispatch is not called). Minimal — mainly guards the removeEventListener.

Ground-truth strategy mirrors the existing test: compute the expected board/piece by calling
the pure core directly, so the test asserts "the wiring routes to `step`", not a hand-computed
geometry.

## Ordering

1. `useGame.ts` (expose `dispatch`) — compiles independently.
2. `GameContainer.tsx` (consume `dispatch`, add listener).
3. Tests.
Each step is independently type-checkable; commit after tests are green.
