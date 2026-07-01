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
 * Scope (this ticket): a static starting frame only. There is no `requestAnimationFrame` gravity
 * loop and no input dispatch yet — those are a later ticket, which is why no setter is exposed. The
 * `seed` parameter and the returned `state` are the seams that ticket will consume.
 */

import { useMemo, useState } from "react";

import type { Board } from "@/lib/types";
import { createInitialState, type GameState } from "@/lib/game";
import { overlayPiece } from "@/lib/overlay";

/**
 * A fixed default seed. Deterministic on purpose: a `"use client"` component still server-renders
 * its first HTML, so seeding from a non-stable source (`Date.now()`/`Math.random()`) would spawn a
 * different first piece on server vs. client and trip React hydration. Per-load variety is a
 * later-ticket concern (new-game / loop), which can pass its own `seed`.
 */
export const DEFAULT_SEED = 0x5eed;

/** What `useGame` returns: the raw core `state` and the render-ready composed `view`. */
export interface GameView {
  state: GameState;
  view: Board;
}

/**
 * Hold a fresh game for `seed` and expose its composed view. The state is created lazily (once),
 * so the bag/spawn run a single time rather than on every render; the view is memoized on `state`.
 */
export function useGame(seed: number = DEFAULT_SEED): GameView {
  const [state] = useState(() => createInitialState(seed));
  const view = useMemo(() => overlayPiece(state.board, state.active), [state]);
  return { state, view };
}
