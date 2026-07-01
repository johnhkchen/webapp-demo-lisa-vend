"use client";

/**
 * `useGame` — the React seam that holds the pure game core and exposes a render-ready view.
 *
 * The core (`lib/game.ts`) is framework-free and can't live in React; this hook is the thin
 * client-side holder for it. It keeps a `GameState` (from `createInitialState`) in component state
 * and derives the composed board — settled cells with the active piece overlaid — via the pure
 * `overlayPiece`. No game rules are reimplemented here: the state comes from the core and the
 * overlay reuses the core's cell accessor.
 *
 * Scope (this ticket): keyboard move/rotate is now wired — the hook captures the state setter and
 * exposes a stable `dispatch(input)` that runs the pure core reducer (`step`). There is still no
 * `requestAnimationFrame` gravity loop and no soft/hard-drop; those are later tickets that will
 * hang off this same `dispatch`.
 */

import { useCallback, useMemo, useState } from "react";

import type { Board } from "@/lib/types";
import { createInitialState, step, type GameState, type Input } from "@/lib/game";
import { overlayPiece } from "@/lib/overlay";

/**
 * A fixed default seed. Deterministic on purpose: a `"use client"` component still server-renders
 * its first HTML, so seeding from a non-stable source (`Date.now()`/`Math.random()`) would spawn a
 * different first piece on server vs. client and trip React hydration. Per-load variety is a
 * later-ticket concern (new-game / loop), which can pass its own `seed`.
 */
export const DEFAULT_SEED = 0x5eed;

/**
 * What `useGame` returns: the raw core `state`, the render-ready composed `view`, and `dispatch`
 * to feed a player/timer `Input` through the core reducer.
 */
export interface GameView {
  state: GameState;
  view: Board;
  dispatch: (input: Input) => void;
}

/**
 * Hold a fresh game for `seed` and expose its composed view plus a `dispatch`. The state is
 * created lazily (once), so the bag/spawn run a single time rather than on every render; the view
 * is memoized on `state`. `dispatch` applies the pure `step` reducer via a functional state
 * update, so it needs no `state` dependency and is referentially stable — a consumer can list it
 * in an effect's deps without re-subscribing every render.
 */
export function useGame(seed: number = DEFAULT_SEED): GameView {
  const [state, setState] = useState(() => createInitialState(seed));
  const view = useMemo(() => overlayPiece(state.board, state.active), [state]);
  const dispatch = useCallback(
    (input: Input) => setState((s) => step(s, input)),
    [],
  );
  return { state, view, dispatch };
}
