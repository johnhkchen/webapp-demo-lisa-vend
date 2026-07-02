"use client";

/**
 * The single client island: it wires the `useGame` hook to the props-driven `Board` and routes
 * the keyboard into the pure game core.
 *
 * `page.tsx` stays a server component and renders this; everything stateful lives behind this one
 * `"use client"` boundary. It holds no game rules — it hands the hook's composed view (settled
 * board + active piece overlaid) plus the ghost landing cells (the translucent drop marker,
 * T-007-02-02) to `Board`, and translates keydown events into core `Input`s via `dispatch`. A
 * window-level listener means the player never has to click to focus.
 *
 * Gravity: a `requestAnimationFrame` loop (`useAnimationFrameLoop`) dispatches one `"tick"` per
 * `GRAVITY_INTERVAL_MS`, so the piece descends, locks, and respawns on its own with no input
 * (T-003-02-01). Keyboard scope is move (left/right), rotate (CW/CCW), soft-drop (`ArrowDown`) and
 * hard-drop (Space) — all hanging off the same `dispatch` (T-003-03-02). Soft-drop rides OS key
 * auto-repeat like the move keys (hold = keep dropping, layered on top of gravity); hard-drop is
 * edge-triggered — a held Space must not lock+spawn on every repeat, so `event.repeat` is ignored
 * for it.
 *
 * Game-over (T-003-02-02): the core sets `state.gameOver` when a fresh spawn tops out. We gate the
 * gravity loop on `!gameOver` so the tick actually *halts* (not merely no-ops), and render a
 * `GameOverlay` over the frozen board so the end state is observable. Locked cells and cleared lines
 * need no code here — they already flow through the composed `view`.
 *
 * Hold (T-007-03-02): the `C` key dispatches `"hold"` through the same generic path as every other
 * key, and `state.hold`/`state.canHold` are handed to a side `HoldBox` so the swapped-out piece and
 * the once-per-drop block are visible. Hold needs no auto-repeat guard (unlike hard-drop): a second
 * `"hold"` before the next lock is already a core no-op, so a held key can't machine-gun swaps.
 */

import { useEffect } from "react";

import Board from "@/components/Board";
import GameOverlay from "@/components/GameOverlay";
import HoldBox from "@/components/HoldBox";
import { useGame, GRAVITY_INTERVAL_MS } from "@/components/useGame";
import { useAnimationFrameLoop } from "@/components/useAnimationFrameLoop";
import type { Input } from "@/lib/game";

/**
 * Keyboard → core `Input`. Keys absent here are ignored (browser shortcuts stay live).
 * `ArrowUp`/`x` rotate clockwise, `z` counter-clockwise — the conventional web-Tetris defaults.
 * `ArrowDown` is soft-drop (accelerated descent) and `" "` (Space) is hard-drop (instant drop +
 * lock). `c`/`C` is hold (swap the active piece into the hold slot). Soft-drop and hold are fine to
 * auto-repeat while held (hold's repeat is a core no-op); hard-drop is guarded against auto-repeat
 * in the handler (see `onKeyDown`).
 */
const KEY_TO_INPUT: Record<string, Input> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "rotateCW",
  x: "rotateCW",
  X: "rotateCW",
  z: "rotateCCW",
  Z: "rotateCCW",
  ArrowDown: "softDrop",
  " ": "hardDrop",
  c: "hold",
  C: "hold",
};

export default function GameContainer() {
  const { state, view, ghost, dispatch } = useGame();

  // Automatic gravity: one core "tick" (descend → lock → clear → spawn) per interval, no input.
  // Gated on !gameOver so topping out truly stops the loop (the `active` seam) rather than spinning
  // rAF on a no-op `step`.
  useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS, !state.gameOver);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const input = KEY_TO_INPUT[event.key];
      if (!input) return; // not ours — leave browser shortcuts and unmapped keys alone
      // Hard-drop is edge-triggered: a held key fires OS auto-repeat, and each repeat would
      // drop+lock+spawn another piece — machine-gunning through the stack. Consume the key
      // (preventDefault) but drop the repeats. Soft-drop/move keys keep their auto-repeat.
      if (input === "hardDrop" && event.repeat) {
        event.preventDefault();
        return;
      }
      event.preventDefault(); // consumed keys (arrows, space) would otherwise scroll the page
      dispatch(input);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  return (
    <div className="flex items-start gap-4">
      <HoldBox type={state.hold} canHold={state.canHold} />
      <div className="relative">
        <Board board={view} ghost={ghost} ghostType={state.active.type} />
        <GameOverlay
          visible={state.gameOver}
          score={state.score}
          lines={state.lines}
        />
      </div>
    </div>
  );
}
