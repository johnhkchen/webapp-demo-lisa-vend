"use client";

/**
 * The single client island: it wires the `useGame` hook to the props-driven `Board` and routes
 * the keyboard into the pure game core.
 *
 * `page.tsx` stays a server component and renders this; everything stateful lives behind this one
 * `"use client"` boundary. It holds no game rules — it hands the hook's composed view (settled
 * board + active piece overlaid) to `Board`, and translates keydown events into core `Input`s via
 * `dispatch`. A window-level listener means the player never has to click to focus.
 *
 * Gravity: a `requestAnimationFrame` loop (`useAnimationFrameLoop`) dispatches one `"tick"` per
 * `GRAVITY_INTERVAL_MS`, so the piece descends, locks, and respawns on its own with no input
 * (T-003-02-01). Keyboard scope is move (left/right) and rotate (CW/CCW); soft/hard-drop keys
 * (T-003-03-02) arrive later and hang off the same `dispatch` — `ArrowDown` and the drop key are
 * intentionally absent from the map here.
 *
 * Game-over (T-003-02-02): the core sets `state.gameOver` when a fresh spawn tops out. We gate the
 * gravity loop on `!gameOver` so the tick actually *halts* (not merely no-ops), and render a
 * `GameOverlay` over the frozen board so the end state is observable. Locked cells and cleared lines
 * need no code here — they already flow through the composed `view`.
 */

import { useEffect } from "react";

import Board from "@/components/Board";
import GameOverlay from "@/components/GameOverlay";
import { useGame, GRAVITY_INTERVAL_MS } from "@/components/useGame";
import { useAnimationFrameLoop } from "@/components/useAnimationFrameLoop";
import type { Input } from "@/lib/game";

/**
 * Keyboard → core `Input`. Keys absent here are ignored (browser shortcuts stay live, and the
 * drop keys are deferred to T-003-03-02). `ArrowUp`/`x` rotate clockwise, `z` counter-clockwise —
 * the conventional web-Tetris defaults.
 */
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
  const { state, view, dispatch } = useGame();

  // Automatic gravity: one core "tick" (descend → lock → clear → spawn) per interval, no input.
  // Gated on !gameOver so topping out truly stops the loop (the `active` seam) rather than spinning
  // rAF on a no-op `step`.
  useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS, !state.gameOver);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const input = KEY_TO_INPUT[event.key];
      if (!input) return; // not ours — leave browser shortcuts and unmapped keys alone
      event.preventDefault(); // consumed keys (arrows) would otherwise scroll the page
      dispatch(input);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  return (
    <div className="relative">
      <Board board={view} />
      <GameOverlay
        visible={state.gameOver}
        score={state.score}
        lines={state.lines}
      />
    </div>
  );
}
