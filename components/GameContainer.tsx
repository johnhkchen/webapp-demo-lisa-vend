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
 *
 * Next-queue (T-007-04-02): the hook's `queue` (a non-consuming bag peek, sized by `PREVIEW_COUNT`)
 * is handed to a side `NextPreview` on the right so the upcoming pieces are visible; it re-derives on
 * each spawn like the rest of the view, so the column advances on its own (hold left, next right).
 *
 * Pause (T-007-05-02): the `P` key dispatches `"pause"` (a core toggle of `state.paused`). We gate
 * the gravity loop on `!gameOver && !paused` so descent truly *halts* while paused (the loop stops
 * scheduling frames — not merely no-ops), and render a `mode="paused"` `GameOverlay` over the frozen
 * board so the pause is observable. Resume is clean: re-enabling the loop resets its accumulator, so
 * descent continues from the frozen position with no catch-up burst of banked ticks. Pause is
 * edge-triggered like hard-drop (`event.repeat` guarded) so a held `P` can't flicker the overlay.
 *
 * Row-clear flash (T-007-06-02): the hook's `clearedRows` is a transient one-frame field, so we run
 * it through `useClearFlash`, which latches the cleared rows and holds them for `FLASH_DURATION_MS`
 * regardless of what the player presses next — giving the CSS `.flash` its full lifetime. The
 * resulting `flashRows`/generation are handed to `Board`, which paints the neon row bars as an
 * overlay over the (already-collapsed) board so a clear reads as juice, not a silent redraw.
 */

import { useEffect } from "react";

import Board from "@/components/Board";
import GameOverlay from "@/components/GameOverlay";
import HoldBox from "@/components/HoldBox";
import NextPreview from "@/components/NextPreview";
import { useGame, GRAVITY_INTERVAL_MS, FLASH_DURATION_MS } from "@/components/useGame";
import { useAnimationFrameLoop } from "@/components/useAnimationFrameLoop";
import { useClearFlash } from "@/components/useClearFlash";
import type { Input } from "@/lib/game";

/**
 * Keyboard → core `Input`. Keys absent here are ignored (browser shortcuts stay live).
 * `ArrowUp`/`x` rotate clockwise, `z` counter-clockwise — the conventional web-Tetris defaults.
 * `ArrowDown` is soft-drop (accelerated descent) and `" "` (Space) is hard-drop (instant drop +
 * lock). `c`/`C` is hold (swap the active piece into the hold slot). Soft-drop and hold are fine to
 * auto-repeat while held (hold's repeat is a core no-op); hard-drop and pause are guarded against
 * auto-repeat in the handler (see `onKeyDown`). `p`/`P` toggles pause.
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
  p: "pause",
  P: "pause",
};

export default function GameContainer() {
  const { state, view, ghost, queue, clearedRows, dispatch } = useGame();

  // Latch the transient one-frame `clearedRows` so the row-clear flash plays its full duration
  // regardless of subsequent input; `flash.rows`/`flash.generation` drive Board's overlay.
  const flash = useClearFlash(clearedRows, FLASH_DURATION_MS);

  // Automatic gravity: one core "tick" (descend → lock → clear → spawn) per interval, no input.
  // Gated on !gameOver && !paused so both topping out and pausing truly stop the loop (the `active`
  // seam) rather than spinning rAF on a no-op `step`. Un-pausing re-enables the loop, which resets
  // its accumulator, so descent resumes from the frozen state with no banked-tick catch-up.
  useAnimationFrameLoop(
    () => dispatch("tick"),
    GRAVITY_INTERVAL_MS,
    !state.gameOver && !state.paused,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const input = KEY_TO_INPUT[event.key];
      if (!input) return; // not ours — leave browser shortcuts and unmapped keys alone
      // Hard-drop and pause are edge-triggered: a held key fires OS auto-repeat. For hard-drop each
      // repeat would drop+lock+spawn another piece (machine-gunning the stack); for pause each repeat
      // would flip the overlay on/off. Consume the key (preventDefault) but drop the repeats.
      // Soft-drop/move/hold keys keep their auto-repeat (hold's repeat is a core no-op).
      if ((input === "hardDrop" || input === "pause") && event.repeat) {
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
        <Board
          board={view}
          ghost={ghost}
          ghostType={state.active.type}
          flashRows={flash.rows}
          flashKey={flash.generation}
        />
        <GameOverlay
          visible={state.gameOver}
          score={state.score}
          lines={state.lines}
        />
        <GameOverlay
          visible={state.paused}
          mode="paused"
          score={state.score}
          lines={state.lines}
        />
      </div>
      <NextPreview queue={queue} />
    </div>
  );
}
